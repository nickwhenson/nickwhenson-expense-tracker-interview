import { expect, type Locator, type Page } from '@playwright/test';

export interface EditExpenseFormData {
  category?: string;
  amount?: string;
  description?: string;
  date?: string;
}

export class EditExpenseModalComponent {
  readonly root: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('modal-edit-expense');
  }

  categorySelect(): Locator {
    return this.page.getByTestId('expense-form-category');
  }

  amountInput(): Locator {
    return this.page.getByTestId('expense-form-amount');
  }

  descriptionInput(): Locator {
    return this.page.getByTestId('expense-form-description');
  }

  dateInput(): Locator {
    return this.page.getByTestId('expense-form-date');
  }

  updateButton(): Locator {
    return this.page.getByTestId('expense-form-submit-edit');
  }

  cancelButton(): Locator {
    return this.page.getByTestId('expense-form-cancel-edit');
  }

  closeButton(): Locator {
    return this.page.getByTestId('modal-close-edit-expense');
  }

  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.updateButton()).toBeVisible();
  }

  async fillForm(data: EditExpenseFormData): Promise<void> {
    if (data.category !== undefined) {
      await this.categorySelect().selectOption(data.category);
    }
    if (data.amount !== undefined) {
      await this.amountInput().fill(data.amount);
    }
    if (data.description !== undefined) {
      await this.descriptionInput().fill(data.description);
    }
    if (data.date !== undefined) {
      await this.dateInput().fill(data.date);
    }
  }

  async submit(data?: EditExpenseFormData): Promise<void> {
    if (data) {
      await this.fillForm(data);
    }
    await this.updateButton().click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton().click();
  }

  async close(): Promise<void> {
    await this.closeButton().click();
  }
}
