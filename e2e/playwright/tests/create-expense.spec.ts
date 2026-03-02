import { expect, test } from '@playwright/test';
import { deleteExpenseWorkflow } from '../api/workflows/expense.workflows';
import { AddExpenseModalComponent } from '../components/addExpenseModal.component';
import { ExpenseListComponent } from '../components/expenseList.component';
import { createRandomAmount, createRandomDate, setRandomCategory } from '../helpers/randomData';

test.describe('Create expense', () => {
  let createdExpenseId: number | undefined;

  test.afterEach(async ({ request }) => {
    if (!createdExpenseId) {
      return;
    }

    await deleteExpenseWorkflow(request, { expenseId: createdExpenseId });
    createdExpenseId = undefined;
  });

  test('creates a new expense', async ({ page }) => {
    const expenseList = new ExpenseListComponent(page);
    const addExpenseModal = new AddExpenseModalComponent(page);
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;

    if (!email || !password) {
      throw new Error('Missing E2E_EMAIL or E2E_PASSWORD. Set them in e2e/playwright/environment/.env');
    }

    const uniqueDescription = `Playwright expense ${Date.now()}`;
    const randomAmount = createRandomAmount();
    const randomDate = createRandomDate();
    const randomCategory = setRandomCategory();
    const amountText = randomAmount.toFixed(2);

    await page.goto('/');

    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.getByRole('link', { name: 'Expenses' }).click();
    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();

    await page.getByRole('button', { name: 'Add Expense' }).click();
    await addExpenseModal.expectVisible();
    await addExpenseModal.submit({
      category: randomCategory,
      amount: amountText,
      description: uniqueDescription,
      date: randomDate,
    });

    await expenseList.expectVisible();
    const createdExpense = expenseList.firstItemByDescription(uniqueDescription);
    await createdExpense.expectVisible();
    await createdExpense.expectAmount(`$${amountText}`);
    createdExpenseId = await createdExpense.getExpenseId();
  });
});
