import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface GoldenExpense {
  merchant: string;
  amount: number;
  date: string;
  description?: string;
}

interface GoldenCase {
  case_id: string;
  case_type: string;
  expected?: {
    classification?: string;
    expenses?: GoldenExpense[];
  };
}

interface ActualExpense {
  merchant: string;
  amount: number;
  date: string;
  description?: string;
}

export interface EvalResultRow {
  case_id: string;
  case_type: string;
  expected_classification: string | null;
  predicted_classification: 'expense' | 'no_expense';
  extracted_expenses: ActualExpense[];
  error: string | null;
}

export interface ScoreReport {
  generatedAt: string;
  input: {
    datasetPath: string;
    resultsPath: string;
  };
  totals: {
    datasetCases: number;
    scoredCases: number;
    missingResults: number;
    erroredCases: number;
  };
  classification: {
    evaluatedCases: number;
    correct: number;
    accuracy: number;
    truePositives: number;
    trueNegatives: number;
    falsePositives: number;
    falseNegatives: number;
    ambiguousCases: number;
  };
  extraction: {
    expectedExpenseItems: number;
    actualExpenseItems: number;
    matchedExpenseItems: number;
    precision: number;
    recall: number;
    f1: number;
    amountAccuracyOnMatches: number;
    merchantAccuracyOnMatches: number;
    dateAccuracyOnMatches: number;
  };
  byCaseType: Record<string, { total: number; classificationAccuracy: number }>;
}

export interface AggregateScoreReport {
  generatedAt: string;
  input: {
    datasetPaths: string[];
    reportDir: string;
  };
  runsScored: number;
  averageMetrics: {
    classificationAccuracy: number;
    precision: number;
    recall: number;
    f1: number;
  };
  microMetrics: {
    classificationAccuracy: number;
    precision: number;
    recall: number;
    f1: number;
  };
  runs: Array<{
    resultsPath: string;
    classificationAccuracy: number;
    precision: number;
    recall: number;
    f1: number;
    scoredCases: number;
    erroredCases: number;
  }>;
}

interface ScoredRunOutput {
  report: ScoreReport;
  jsonReportPath: string;
  mdReportPath: string;
}

interface AggregateScoredOutput {
  report: AggregateScoreReport;
  jsonReportPath: string;
  mdReportPath: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

function normalizeText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isAmountEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}

function safePct(num: number, denom: number): number {
  if (denom === 0) return 0;
  return Number(((num / denom) * 100).toFixed(2));
}

function f1FromPct(precisionPct: number, recallPct: number): number {
  if (precisionPct + recallPct === 0) return 0;
  return Number(((2 * precisionPct * recallPct) / (precisionPct + recallPct)).toFixed(2));
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJsonl<T>(filePath: string): Promise<T[]> {
  const raw = await fs.readFile(filePath, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, idx) => {
      try {
        return JSON.parse(line) as T;
      } catch (err) {
        throw new Error(
          `Invalid JSONL in ${filePath} at line ${idx + 1}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    });
}

async function listScoreReportFiles(reportDir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(reportDir);
    return files
      .filter(
        (f) =>
          f.startsWith('email_extraction_score_report_') &&
          f.endsWith('.json') &&
          !f.includes('aggregate')
      )
      .map((f) => path.join(reportDir, f))
      .sort();
  } catch {
    return [];
  }
}

async function findLatestResultsFile(dirPath: string): Promise<string | null> {
  try {
    const files = await fs.readdir(dirPath);
    const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));
    if (jsonlFiles.length === 0) return null;

    const withStats = await Promise.all(
      jsonlFiles.map(async (fileName) => {
        const fullPath = path.join(dirPath, fileName);
        const stat = await fs.stat(fullPath);
        return { fullPath, mtimeMs: stat.mtimeMs };
      })
    );
    withStats.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return withStats[0].fullPath;
  } catch {
    return null;
  }
}

function buildScoreReport(datasetPath: string, resultsPath: string, goldenRows: GoldenCase[], actualRows: EvalResultRow[]): ScoreReport {
  const actualById = new Map(actualRows.map((row) => [row.case_id, row]));

  let missingResults = 0;
  let erroredCases = 0;

  let evaluatedClassificationCases = 0;
  let correctClassification = 0;
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;
  let ambiguousCases = 0;

  let expectedExpenseItems = 0;
  let actualExpenseItems = 0;
  let matchedExpenseItems = 0;
  let amountCorrectOnMatches = 0;
  let merchantCorrectOnMatches = 0;
  let dateCorrectOnMatches = 0;

  const byCaseTypeCounters: Record<string, { total: number; correct: number }> = {};

  for (const golden of goldenRows) {
    const actual = actualById.get(golden.case_id);
    if (!actual) {
      missingResults++;
      continue;
    }

    byCaseTypeCounters[golden.case_type] = byCaseTypeCounters[golden.case_type] ?? {
      total: 0,
      correct: 0,
    };
    byCaseTypeCounters[golden.case_type].total += 1;

    if (actual.error) erroredCases++;

    const expectedClass = golden.expected?.classification ?? null;
    const predictedClass = actual.predicted_classification;
    const isAmbiguous = expectedClass === 'ambiguous';

    if (isAmbiguous) {
      ambiguousCases++;
    } else if (expectedClass === 'expense' || expectedClass === 'no_expense') {
      evaluatedClassificationCases++;
      const isCorrect = expectedClass === predictedClass;
      if (isCorrect) {
        correctClassification++;
        byCaseTypeCounters[golden.case_type].correct += 1;
      }

      if (expectedClass === 'expense' && predictedClass === 'expense') tp++;
      if (expectedClass === 'no_expense' && predictedClass === 'no_expense') tn++;
      if (expectedClass === 'no_expense' && predictedClass === 'expense') fp++;
      if (expectedClass === 'expense' && predictedClass === 'no_expense') fn++;
    }

    const expectedExpenses = golden.expected?.expenses ?? [];
    const actualExpenses = actual.extracted_expenses ?? [];
    expectedExpenseItems += expectedExpenses.length;
    actualExpenseItems += actualExpenses.length;

    const usedActual = new Set<number>();
    for (const exp of expectedExpenses) {
      let foundIdx = -1;
      for (let i = 0; i < actualExpenses.length; i++) {
        if (usedActual.has(i)) continue;
        const act = actualExpenses[i];
        if (
          normalizeText(act.date) === normalizeText(exp.date) &&
          isAmountEqual(act.amount, exp.amount) &&
          normalizeText(act.merchant) === normalizeText(exp.merchant)
        ) {
          foundIdx = i;
          break;
        }
      }
      if (foundIdx !== -1) {
        usedActual.add(foundIdx);
        matchedExpenseItems++;
        amountCorrectOnMatches++;
        merchantCorrectOnMatches++;
        dateCorrectOnMatches++;
      }
    }
  }

  const byCaseType: ScoreReport['byCaseType'] = {};
  for (const [caseType, counters] of Object.entries(byCaseTypeCounters)) {
    byCaseType[caseType] = {
      total: counters.total,
      classificationAccuracy: safePct(counters.correct, counters.total),
    };
  }

  const precision = safePct(matchedExpenseItems, actualExpenseItems);
  const recall = safePct(matchedExpenseItems, expectedExpenseItems);
  const f1 = f1FromPct(precision, recall);

  return {
    generatedAt: new Date().toISOString(),
    input: {
      datasetPath,
      resultsPath,
    },
    totals: {
      datasetCases: goldenRows.length,
      scoredCases: goldenRows.length - missingResults,
      missingResults,
      erroredCases,
    },
    classification: {
      evaluatedCases: evaluatedClassificationCases,
      correct: correctClassification,
      accuracy: safePct(correctClassification, evaluatedClassificationCases),
      truePositives: tp,
      trueNegatives: tn,
      falsePositives: fp,
      falseNegatives: fn,
      ambiguousCases,
    },
    extraction: {
      expectedExpenseItems,
      actualExpenseItems,
      matchedExpenseItems,
      precision,
      recall,
      f1,
      amountAccuracyOnMatches: safePct(amountCorrectOnMatches, matchedExpenseItems),
      merchantAccuracyOnMatches: safePct(merchantCorrectOnMatches, matchedExpenseItems),
      dateAccuracyOnMatches: safePct(dateCorrectOnMatches, matchedExpenseItems),
    },
    byCaseType,
  };
}

function makeMarkdown(report: ScoreReport): string {
  return [
    '# Email Extraction Eval Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Dataset: ${report.input.datasetPath}`,
    `Results: ${report.input.resultsPath}`,
    '',
    '## Totals',
    `- Dataset cases: ${report.totals.datasetCases}`,
    `- Scored cases: ${report.totals.scoredCases}`,
    `- Missing results: ${report.totals.missingResults}`,
    `- Errored cases: ${report.totals.erroredCases}`,
    '',
    '## Classification',
    `- Evaluated cases: ${report.classification.evaluatedCases}`,
    `- Correct: ${report.classification.correct}`,
    `- Accuracy: ${report.classification.accuracy}%`,
    `- TP: ${report.classification.truePositives}`,
    `- TN: ${report.classification.trueNegatives}`,
    `- FP: ${report.classification.falsePositives}`,
    `- FN: ${report.classification.falseNegatives}`,
    `- Ambiguous cases (excluded from accuracy): ${report.classification.ambiguousCases}`,
    '',
    '## Extraction',
    `- Expected expense items: ${report.extraction.expectedExpenseItems}`,
    `- Actual expense items: ${report.extraction.actualExpenseItems}`,
    `- Matched expense items: ${report.extraction.matchedExpenseItems}`,
    `- Precision: ${report.extraction.precision}%`,
    `- Recall: ${report.extraction.recall}%`,
    `- F1: ${report.extraction.f1}%`,
    '',
    '## By Case Type',
    ...Object.entries(report.byCaseType).map(
      ([caseType, stats]) =>
        `- ${caseType}: ${stats.classificationAccuracy}% (${stats.total} cases)`
    ),
    '',
  ].join('\n');
}

function makeAggregateMarkdown(report: AggregateScoreReport): string {
  return [
    '# Email Extraction Aggregate Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Datasets: ${report.input.datasetPaths.join(', ')}`,
    `Score report directory: ${report.input.reportDir}`,
    `Runs scored: ${report.runsScored}`,
    '',
    '## Average Metrics',
    `- Classification Accuracy: ${report.averageMetrics.classificationAccuracy}%`,
    `- Precision: ${report.averageMetrics.precision}%`,
    `- Recall: ${report.averageMetrics.recall}%`,
    `- F1: ${report.averageMetrics.f1}%`,
    '',
    '## Micro Metrics (Across All Runs)',
    `- Classification Accuracy: ${report.microMetrics.classificationAccuracy}%`,
    `- Precision: ${report.microMetrics.precision}%`,
    `- Recall: ${report.microMetrics.recall}%`,
    `- F1: ${report.microMetrics.f1}%`,
    '',
    '## Runs',
    ...report.runs.map((r) =>
      `- ${r.resultsPath}: acc=${r.classificationAccuracy}%, p=${r.precision}%, r=${r.recall}%, f1=${r.f1}%`
    ),
    '',
  ].join('\n');
}

export async function scoreSingleRun(params: {
  datasetPath: string;
  resultsPath: string;
  reportDir?: string;
}): Promise<ScoredRunOutput> {
  const reportDir = params.reportDir ?? path.join(repoRoot, 'evals/results');
  await ensureDir(reportDir);

  const goldenRows = await readJsonl<GoldenCase>(params.datasetPath);
  const actualRows = await readJsonl<EvalResultRow>(params.resultsPath);
  const report = buildScoreReport(params.datasetPath, params.resultsPath, goldenRows, actualRows);

  const timestamp = report.generatedAt.replaceAll(':', '-');
  const jsonReportPath = path.join(reportDir, `email_extraction_score_report_${timestamp}.json`);
  const mdReportPath = path.join(reportDir, `email_extraction_score_report_${timestamp}.md`);

  await fs.writeFile(jsonReportPath, JSON.stringify(report, null, 2), 'utf8');
  await fs.writeFile(mdReportPath, makeMarkdown(report), 'utf8');

  return { report, jsonReportPath, mdReportPath };
}

export async function scoreAggregateRuns(params: {
  reportDir?: string;
}): Promise<AggregateScoredOutput> {
  const reportDir = params.reportDir ?? path.join(repoRoot, 'evals/results');
  await ensureDir(reportDir);

  const scoreReportFiles = await listScoreReportFiles(reportDir);
  if (scoreReportFiles.length === 0) {
    throw new Error(`No single-run score reports found in ${reportDir}`);
  }

  const runReports: ScoreReport[] = [];

  for (const filePath of scoreReportFiles) {
    const raw = await fs.readFile(filePath, 'utf8');
    runReports.push(JSON.parse(raw) as ScoreReport);
  }

  const avg = {
    classificationAccuracy: safePct(
      runReports.reduce((sum, r) => sum + r.classification.accuracy, 0),
      runReports.length * 100
    ),
    precision: safePct(
      runReports.reduce((sum, r) => sum + r.extraction.precision, 0),
      runReports.length * 100
    ),
    recall: safePct(
      runReports.reduce((sum, r) => sum + r.extraction.recall, 0),
      runReports.length * 100
    ),
    f1: safePct(
      runReports.reduce((sum, r) => sum + r.extraction.f1, 0),
      runReports.length * 100
    ),
  };

  const microClassificationCorrect = runReports.reduce((sum, r) => sum + r.classification.correct, 0);
  const microClassificationEval = runReports.reduce((sum, r) => sum + r.classification.evaluatedCases, 0);
  const microMatched = runReports.reduce((sum, r) => sum + r.extraction.matchedExpenseItems, 0);
  const microActual = runReports.reduce((sum, r) => sum + r.extraction.actualExpenseItems, 0);
  const microExpected = runReports.reduce((sum, r) => sum + r.extraction.expectedExpenseItems, 0);

  const microPrecision = safePct(microMatched, microActual);
  const microRecall = safePct(microMatched, microExpected);

  const aggregateReport: AggregateScoreReport = {
    generatedAt: new Date().toISOString(),
    input: {
      datasetPaths: [...new Set(runReports.map((r) => r.input.datasetPath))],
      reportDir,
    },
    runsScored: runReports.length,
    averageMetrics: {
      classificationAccuracy: avg.classificationAccuracy,
      precision: avg.precision,
      recall: avg.recall,
      f1: avg.f1,
    },
    microMetrics: {
      classificationAccuracy: safePct(microClassificationCorrect, microClassificationEval),
      precision: microPrecision,
      recall: microRecall,
      f1: f1FromPct(microPrecision, microRecall),
    },
    runs: runReports.map((r) => ({
      resultsPath: r.input.resultsPath,
      classificationAccuracy: r.classification.accuracy,
      precision: r.extraction.precision,
      recall: r.extraction.recall,
      f1: r.extraction.f1,
      scoredCases: r.totals.scoredCases,
      erroredCases: r.totals.erroredCases,
    })),
  };

  const jsonReportPath = path.join(reportDir, 'email_extraction_aggregate_report_latest.json');
  const mdReportPath = path.join(reportDir, 'email_extraction_aggregate_report_latest.md');
  await fs.writeFile(jsonReportPath, JSON.stringify(aggregateReport, null, 2), 'utf8');
  await fs.writeFile(mdReportPath, makeAggregateMarkdown(aggregateReport), 'utf8');

  return { report: aggregateReport, jsonReportPath, mdReportPath };
}

async function main(): Promise<void> {
  const datasetPath = path.resolve(
    getArg('--dataset') ?? path.join(repoRoot, 'evals/datasets/golden/email_expense_golden_v1.jsonl')
  );

  const resultsDir = path.join(repoRoot, 'evals/datasets/results');
  const resultsArg = getArg('--results');
  const latestDefaultResults = await findLatestResultsFile(resultsDir);
  const resultsPath = path.resolve(
    resultsArg ?? latestDefaultResults ?? path.join(resultsDir, 'latest.jsonl')
  );

  const reportDir = path.join(repoRoot, 'evals/results');
  const single = await scoreSingleRun({
    datasetPath,
    resultsPath,
    reportDir,
  });
  console.log('Scoring complete.');
  console.log(`JSON report: ${single.jsonReportPath}`);
  console.log(`Markdown report: ${single.mdReportPath}`);
  console.log(`Classification accuracy: ${single.report.classification.accuracy}%`);
  console.log(`Precision: ${single.report.extraction.precision}%`);
  console.log(`Recall: ${single.report.extraction.recall}%`);
  console.log(`F1: ${single.report.extraction.f1}%`);

  const aggregate = await scoreAggregateRuns({
    reportDir,
  });
  console.log(`Aggregate JSON report: ${aggregate.jsonReportPath}`);
  console.log(`Aggregate Markdown report: ${aggregate.mdReportPath}`);
  console.log(`Aggregate micro F1: ${aggregate.report.microMetrics.f1}%`);
}

const isDirectRun = process.argv[1] ? path.resolve(process.argv[1]) === __filename : false;

if (isDirectRun) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
