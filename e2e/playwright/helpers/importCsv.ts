import { writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRandomDate, setRandomCategory } from './randomData';

export interface SampleImportRow {
  date: string;
  amount: string;
  description: string;
  category: string;
}

export interface SampleImportCsv {
  filePath: string;
  fileName: string;
  rows: SampleImportRow[];
}

interface CreateSampleImportCsvOptions {
  rowCount?: number;
  prefix?: string;
}

const CATEGORY_NAME_BY_ID: Record<string, string> = {
  '1': 'Food',
  '2': 'Transport',
  '3': 'Entertainment',
  '4': 'Bills',
  '5': 'Shopping',
  '6': 'Other',
};

export async function createSampleImportCsv(
  options: CreateSampleImportCsvOptions = {}
): Promise<SampleImportCsv> {
  const rowCount = options.rowCount ?? 3;
  const prefix = options.prefix ?? `playwright-import-${Date.now()}`;

  const rows: SampleImportRow[] = Array.from({ length: rowCount }, (_, index) => {
    const categoryId = setRandomCategory();
    return {
      date: createRandomDate(),
      amount: (Math.floor(Math.random() * 9000) / 100 + 1).toFixed(2),
      description: `${prefix}-row-${index + 1}`,
      category: CATEGORY_NAME_BY_ID[categoryId],
    };
  });

  const csvLines = [
    'date,amount,description,category',
    ...rows.map((row) => `${row.date},${row.amount},${row.description},${row.category}`),
  ];

  const fileName = `${prefix}.csv`;
  const filePath = path.join(os.tmpdir(), fileName);
  await writeFile(filePath, `${csvLines.join('\n')}\n`, 'utf-8');

  return { filePath, fileName, rows };
}
