import { expect, test, type Page } from '@playwright/test';
import { createExpenseWorkflow, deleteExpenseWorkflow } from '../api/workflows/expense.workflows';
import { EditExpenseModalComponent } from '../components/editExpenseModal.component';
import { ExpenseListComponent } from '../components/expenseList.component';
import { createRandomAmount, createRandomDate, setRandomCategory } from '../helpers/randomData';

test.describe('Expenses', () => {
  let createdExpenseId: number;

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
  });

  async function loginAndOpenExpenses(page: Page) {
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
  }

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

  function formatDateForUi(dateString: string): string {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  test('edits an existing expense - description', async ({ page }) => {
    const expenseList = new ExpenseListComponent(page);
    const editExpenseModal = new EditExpenseModalComponent(page);
    const uniqueDescription = `Edited expense ${Date.now()}`;
    await loginAndOpenExpenses(page);

    if (!createdExpenseId) {
      throw new Error('No seeded expense id found from beforeEach');
    }

    await expenseList.itemById(createdExpenseId).clickEdit();
    await editExpenseModal.expectVisible();
    await editExpenseModal.submit({
      description: uniqueDescription
    });

    await expenseList.expectVisible();
    const createdExpense = expenseList.firstItemByDescription(uniqueDescription);
    await createdExpense.expectVisible();
  });

  test('edits an existing expense - category', async ({ page }) => {
    const expenseList = new ExpenseListComponent(page);
    const editExpenseModal = new EditExpenseModalComponent(page);
    const updatedCategory = '4';

    await loginAndOpenExpenses(page);

    if (!createdExpenseId) {
      throw new Error('No seeded expense id found from beforeEach');
    }

    const expenseItem = expenseList.itemById(createdExpenseId);
    await expenseItem.clickEdit();
    await editExpenseModal.expectVisible();
    await editExpenseModal.submit({
      category: updatedCategory,
    });

    await expenseList.expectVisible();
    await expect(expenseList.itemById(createdExpenseId).meta()).toContainText('Bills');
  });

  test('edits an existing expense - amount', async ({ page }) => {
    const expenseList = new ExpenseListComponent(page);
    const editExpenseModal = new EditExpenseModalComponent(page);
    const updatedAmountText = createRandomAmount().toFixed(2);

    await loginAndOpenExpenses(page);

    if (!createdExpenseId) {
      throw new Error('No seeded expense id found from beforeEach');
    }

    const expenseItem = expenseList.itemById(createdExpenseId);
    await expenseItem.clickEdit();
    await editExpenseModal.expectVisible();
    await editExpenseModal.submit({
      amount: updatedAmountText,
    });

    await expenseList.expectVisible();
    await expect(expenseList.itemById(createdExpenseId).amount()).toHaveText(`$${updatedAmountText}`);
  });

  test('edits an existing expense - date', async ({ page }) => {
    const expenseList = new ExpenseListComponent(page);
    const editExpenseModal = new EditExpenseModalComponent(page);
    const updatedDate = createRandomDate();

    await loginAndOpenExpenses(page);

    if (!createdExpenseId) {
      throw new Error('No seeded expense id found from beforeEach');
    }

    const expenseItem = expenseList.itemById(createdExpenseId);
    await expenseItem.clickEdit();
    await editExpenseModal.expectVisible();
    await editExpenseModal.submit({
      date: updatedDate,
    });

    await expenseList.expectVisible();
    await expect(expenseList.itemById(createdExpenseId).meta()).toContainText(formatDateForUi(updatedDate));
  });

  test('edits an existing expense - from dashboard page', async ({ page }) => {
    const expenseList = new ExpenseListComponent(page);
    const editExpenseModal = new EditExpenseModalComponent(page);
    const uniqueDescription = `Edited from dashboard ${Date.now()}`;

    if (!createdExpenseId) {
      throw new Error('No seeded expense id found from beforeEach');
    }

    await loginToDashboard(page);
    await expenseList.itemById(createdExpenseId).clickEdit();
    await expect(page).toHaveURL(/\/expenses/);
    await editExpenseModal.expectVisible();
    await editExpenseModal.submit({ description: uniqueDescription });

    await expenseList.expectVisible();
    await expect(expenseList.itemById(createdExpenseId).description()).toHaveText(uniqueDescription);
  });
});
