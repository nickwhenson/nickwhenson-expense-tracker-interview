import { expect, type Locator } from '@playwright/test';

export class ExpenseItemComponent {
  readonly root: Locator;

  constructor(root: Locator) {
    this.root = root;
  }

  description(): Locator {
    return this.root.locator('[data-testid^="expense-description-"]');
  }

  meta(): Locator {
    return this.root.locator('[data-testid^="expense-meta-"]');
  }

  amount(): Locator {
    return this.root.locator('[data-testid^="expense-amount-"]');
  }

  editButton(): Locator {
    return this.root.locator('[data-testid^="expense-edit-"]');
  }

  deleteButton(): Locator {
    return this.root.locator('[data-testid^="expense-delete-"]');
  }

  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async expectAmount(amount: string): Promise<void> {
    await expect(this.amount()).toHaveText(amount);
  }

  async getExpenseId(): Promise<number> {
    const testId = await this.root.getAttribute('data-testid');
    const match = testId?.match(/^expense-item-(\d+)$/);

    if (!match) {
      throw new Error(`Could not parse expense id from data-testid: ${testId ?? 'null'}`);
    }

    return Number(match[1]);
  }

  async clickEdit(): Promise<void> {
    await this.editButton().click();
  }

  async clickDelete(): Promise<void> {
    await this.deleteButton().click();
  }
}
