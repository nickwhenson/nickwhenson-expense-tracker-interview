import { expect, type Locator, type Page } from '@playwright/test';

export class DeleteExpenseModalComponent {
  readonly root: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('modal-delete-expense');
  }

  message(): Locator {
    return this.page.getByTestId('delete-expense-modal-message');
  }

  cancelButton(): Locator {
    return this.page.getByTestId('delete-expense-modal-cancel');
  }

  deleteButton(): Locator {
    return this.page.getByTestId('delete-expense-modal-confirm');
  }

  closeButton(): Locator {
    return this.page.getByTestId('modal-close-delete-expense');
  }

  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.message()).toBeVisible();
    await expect(this.deleteButton()).toBeVisible();
  }

  async cancel(): Promise<void> {
    await this.cancelButton().click();
  }

  async confirmDelete(): Promise<void> {
    await this.deleteButton().click();
  }

  async close(): Promise<void> {
    await this.closeButton().click();
  }
}
