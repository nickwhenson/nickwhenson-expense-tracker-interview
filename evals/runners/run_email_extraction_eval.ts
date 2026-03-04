import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractExpensesFromEmails,
  filterReceiptEmails,
  type Email,
  type BatchExtractedExpense,
} from '../../backend/src/services/llmService.js';
import {
  scoreSingleRun,
  scoreAggregateRuns,
  type EvalResultRow,
} from '../scoring/score_email_extraction_eval.js';

interface GoldenCase {
  case_id: string;
  case_type: string;
  email: {
    from: string;
    subject: string;
    date: string;
    body: string;
  };
  expected?: {
    classification?: string;
  };
}

interface EvalResult extends EvalResultRow {
  case_id: string;
  case_type: string;
  expected_classification: string | null;
  predicted_classification: 'expense' | 'no_expense';
  receipt_email_ids: string[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

async function loadEnvFile(envPath: string): Promise<void> {
  try {
    const raw = await fs.readFile(envPath, 'utf8');
    const lines = raw.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;

      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // Missing .env is okay; caller validates required keys later.
  }
}

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function getRunsArg(): number {
  const eqArg = process.argv.find((arg) => arg.startsWith('--runs='));
  if (eqArg) {
    const raw = eqArg.split('=')[1];
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new Error(`Invalid --runs value: ${raw}. Expected a positive integer.`);
    }
    return parsed;
  }

  const valueArg = getArg('--runs');
  if (valueArg) {
    const parsed = Number.parseInt(valueArg, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new Error(`Invalid --runs value: ${valueArg}. Expected a positive integer.`);
    }
    return parsed;
  }

  return 1;
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJsonl(filePath: string): Promise<GoldenCase[]> {
  const raw = await fs.readFile(filePath, 'utf8');
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((line, idx) => {
    try {
      return JSON.parse(line) as GoldenCase;
    } catch (err) {
      throw new Error(`Invalid JSONL at line ${idx + 1}: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}

function toEmail(testCase: GoldenCase): Email {
  return {
    id: testCase.case_id,
    from: testCase.email.from,
    subject: testCase.email.subject,
    date: testCase.email.date,
    body: testCase.email.body,
  };
}

async function runCase(testCase: GoldenCase, dryRun: boolean): Promise<EvalResult> {
  if (dryRun) {
    return {
      case_id: testCase.case_id,
      case_type: testCase.case_type,
      expected_classification: testCase.expected?.classification ?? null,
      predicted_classification: 'no_expense',
      receipt_email_ids: [],
      extracted_expenses: [],
      error: null,
    };
  }

  try {
    const email = toEmail(testCase);
    const filterResult = await filterReceiptEmails([email]);
    const receiptEmailIds = filterResult.receiptEmailIds || [];

    let extractedExpenses: BatchExtractedExpense[] = [];
    if (receiptEmailIds.includes(email.id)) {
      extractedExpenses = await extractExpensesFromEmails([email]);
    }

    const predictedClassification = extractedExpenses.length > 0 ? 'expense' : 'no_expense';

    return {
      case_id: testCase.case_id,
      case_type: testCase.case_type,
      expected_classification: testCase.expected?.classification ?? null,
      predicted_classification: predictedClassification,
      receipt_email_ids: receiptEmailIds,
      extracted_expenses: extractedExpenses,
      error: null,
    };
  } catch (err) {
    return {
      case_id: testCase.case_id,
      case_type: testCase.case_type,
      expected_classification: testCase.expected?.classification ?? null,
      predicted_classification: 'no_expense',
      receipt_email_ids: [],
      extracted_expenses: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function summarize(results: EvalResult[]): string {
  const total = results.length;
  const predictedExpense = results.filter((r) => r.predicted_classification === 'expense').length;
  const predictedNoExpense = total - predictedExpense;
  const errored = results.filter((r) => r.error !== null).length;

  return [
    `Processed cases: ${total}`,
    `Predicted expense: ${predictedExpense}`,
    `Predicted no_expense: ${predictedNoExpense}`,
    `Errored cases: ${errored}`,
  ].join('\n');
}

async function main(): Promise<void> {
  await loadEnvFile(path.join(repoRoot, 'backend/.env'));

  const datasetArg = getArg('--dataset');
  const outputArg = getArg('--output');
  const dryRun = hasFlag('--dry-run');
  const runs = getRunsArg();

  const datasetPath = datasetArg
    ? path.resolve(datasetArg)
    : path.join(repoRoot, 'evals/datasets/golden/email_expense_golden_v1.jsonl');

  const baseTimestamp = new Date().toISOString().replaceAll(':', '-');
  const resultsDir = path.join(repoRoot, 'evals/datasets/results');

  const testCases = await readJsonl(datasetPath);
  if (testCases.length === 0) {
    throw new Error(`Dataset is empty: ${datasetPath}`);
  }

  if (!dryRun && !process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set. Add it to backend/.env or use --dry-run.');
  }

  const reportDir = path.join(repoRoot, 'evals/results');
  await ensureDir(resultsDir);
  await ensureDir(reportDir);

  for (let runNumber = 1; runNumber <= runs; runNumber++) {
    const runSuffix = runs > 1 ? `_run_${runNumber}` : '';
    const runOutputPath = outputArg
      ? path.resolve(
          outputArg.match(/\.jsonl$/i)
            ? outputArg.replace(/\.jsonl$/i, `${runSuffix}.jsonl`)
            : `${outputArg}${runSuffix}`
        )
      : path.join(
          resultsDir,
          `email_extraction_eval_results_${baseTimestamp}${runSuffix}.jsonl`
        );

    await ensureDir(path.dirname(runOutputPath));

    console.log(`\nStarting run ${runNumber}/${runs}`);
    const results: EvalResult[] = [];
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(
        `[run ${runNumber}/${runs}] [${i + 1}/${testCases.length}] ${testCase.case_id} (${testCase.case_type})`
      );
      const result = await runCase(testCase, dryRun);
      results.push(result);
    }

    const lines = results.map((r) => JSON.stringify(r)).join('\n') + '\n';
    await fs.writeFile(runOutputPath, lines, 'utf8');

    console.log('\nEval run complete.');
    console.log(`Dataset: ${datasetPath}`);
    console.log(`Results: ${runOutputPath}`);
    console.log(summarize(results));

    const singleScore = await scoreSingleRun({
      datasetPath,
      resultsPath: runOutputPath,
      reportDir,
    });
    console.log('Single-run scoring complete.');
    console.log(`Score report (JSON): ${singleScore.jsonReportPath}`);
    console.log(`Score report (MD): ${singleScore.mdReportPath}`);
    console.log(`Accuracy: ${singleScore.report.classification.accuracy}%`);
    console.log(`Precision: ${singleScore.report.extraction.precision}%`);
    console.log(`Recall: ${singleScore.report.extraction.recall}%`);
    console.log(`F1: ${singleScore.report.extraction.f1}%`);
  }

  const aggregateScore = await scoreAggregateRuns({
    reportDir,
  });
  console.log('\nAggregate scoring complete (across all score reports in evals/results).');
  console.log(`Aggregate report (JSON): ${aggregateScore.jsonReportPath}`);
  console.log(`Aggregate report (MD): ${aggregateScore.mdReportPath}`);
  console.log(`Aggregate micro accuracy: ${aggregateScore.report.microMetrics.classificationAccuracy}%`);
  console.log(`Aggregate micro precision: ${aggregateScore.report.microMetrics.precision}%`);
  console.log(`Aggregate micro recall: ${aggregateScore.report.microMetrics.recall}%`);
  console.log(`Aggregate micro F1: ${aggregateScore.report.microMetrics.f1}%`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
