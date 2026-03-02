import { expect, test, type Page } from '@playwright/test';
import { createExpenseWorkflow, deleteExpenseWorkflow } from '../api/workflows/expense.workflows';
import { ExpenseListComponent } from '../components/expenseList.component';
import { createRandomAmount, createRandomDate, setRandomCategory } from '../helpers/randomData';
import { DeleteExpenseModalComponent } from '../components/deleteExpenseModal.component';

test.describe('Expenses', () => {
  let createdExpenseId: number | undefined;

  test.beforeEach(async ({ request }) => {
      const randomAmount = createRandomAmount();
      const randomDate = createRandomDate();
      const randomCategory = setRandomCategory();
  
      const { expense } = await createExpenseWorkflow(request, {
        expenseData: {
          categoryId: Number(randomCategory),
          amount: randomAmount,
          description: `Seeded expense ${Date.now()}`,
          date: randomDate,
        },
      });
  
      createdExpenseId = expense.id;
    });

  test.afterEach(async ({ request }) => {
    if (!createdExpenseId) {
      return;
    }

    await deleteExpenseWorkflow(request, { expenseId: createdExpenseId });
    createdExpenseId = undefined;
  });

  async function loginToDashboard(page: Page) {
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;

    if (!email || !password) {
      throw new Error('Missing E2E_EMAIL or E2E_PASSWORD. Set them in e2e/playwright/environment/.env');
    }

    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  }

  test('deletes an existing expense', async ({ page }) => {
    const expenseList = new ExpenseListComponent(page);
    const deleteExpenseModal = new DeleteExpenseModalComponent(page);
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;

    if (!email || !password) {
      throw new Error('Missing E2E_EMAIL or E2E_PASSWORD. Set them in e2e/playwright/environment/.env');
    }

    await page.goto('/');

    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.getByRole('link', { name: 'Expenses' }).click();
    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();

    if (!createdExpenseId) {
      throw new Error('No seeded expense id found from beforeEach');
    }

    const deletedExpenseId = createdExpenseId;
    await expenseList.itemById(createdExpenseId).clickDelete();
    await deleteExpenseModal.expectVisible();
    await deleteExpenseModal.confirmDelete();
    createdExpenseId = undefined;

    await expenseList.expectVisible();
    await expect(page.getByTestId(`expense-item-${deletedExpenseId}`)).toHaveCount(0);
  });

  test('deletes an existing expense - from dashboard page', async ({ page }) => {
    const expenseList = new ExpenseListComponent(page);
    const deleteExpenseModal = new DeleteExpenseModalComponent(page);

    if (!createdExpenseId) {
      throw new Error('No seeded expense id found from beforeEach');
    }

    await loginToDashboard(page);
    const deletedExpenseId = createdExpenseId;
    await expenseList.itemById(deletedExpenseId).clickDelete();
    await expect(page).toHaveURL(/\/expenses/);
    await deleteExpenseModal.expectVisible();
    await deleteExpenseModal.confirmDelete();
    createdExpenseId = undefined;

    await expenseList.expectVisible();
    await expect(page.getByTestId(`expense-item-${deletedExpenseId}`)).toHaveCount(0);
  });
});
