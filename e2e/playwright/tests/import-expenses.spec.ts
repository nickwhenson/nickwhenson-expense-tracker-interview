import { expect, test } from '@playwright/test';
import { deleteExpenseWorkflow } from '../api/workflows/expense.workflows';
import { ExpenseListComponent } from '../components/expenseList.component';
import { createSampleImportCsv } from '../helpers/importCsv';

test.describe('Import Expenses', () => {
  let createdExpenseIds: number[] = [];

  test.afterEach(async ({ request }) => {
    if (createdExpenseIds.length === 0) {
      return;
    }

    for (const expenseId of createdExpenseIds) {
      await deleteExpenseWorkflow(request, { expenseId });
    }
    createdExpenseIds = [];
  });

  test('bulk imports expenses from csv', async ({ page }) => {
    const expenseList = new ExpenseListComponent(page);
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;

    if (!email || !password) {
      throw new Error('Missing E2E_EMAIL or E2E_PASSWORD. Set them in e2e/playwright/environment/.env');
    }

    const sampleCsv = await createSampleImportCsv({ rowCount: 3 });

    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.getByRole('link', { name: 'Import' }).click();
    await expect(page.getByRole('heading', { name: 'Import Expenses' })).toBeVisible();

    await page.getByRole('button', { name: 'Start Import' }).click();
    await page.locator('input[type="file"][accept=".csv"]').setInputFiles(sampleCsv.filePath);

    await expect(page.getByRole('heading', { name: 'Map CSV Columns' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('heading', { name: 'Preview Import' })).toBeVisible();
    await page.getByRole('button', { name: `Import ${sampleCsv.rows.length} Expenses` }).click();

    await expect(page.getByRole('heading', { name: 'Import Complete!' })).toBeVisible();
    await page.getByRole('button', { name: 'View Expenses' }).click();

    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();

    for (const row of sampleCsv.rows) {
      const importedExpense = expenseList.firstItemByDescription(row.description);
      await importedExpense.expectVisible();
      createdExpenseIds.push(await importedExpense.getExpenseId());
    }
  });
});
