import { expect, type Locator, type Page } from '@playwright/test';

export interface AddExpenseFormData {
  category?: string;
  amount?: string;
  description?: string;
  date?: string;
}

export class AddExpenseModalComponent {
  readonly root: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('modal-add-expense');
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

  createButton(): Locator {
    return this.page.getByTestId('expense-form-submit-add');
  }

  cancelButton(): Locator {
    return this.page.getByTestId('expense-form-cancel-add');
  }

  closeButton(): Locator {
    return this.page.getByTestId('modal-close-add-expense');
  }

  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.createButton()).toBeVisible();
  }

  async fillForm(data: AddExpenseFormData): Promise<void> {
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

  async submit(data?: AddExpenseFormData): Promise<void> {
    if (data) {
      await this.fillForm(data);
    }
    await this.createButton().click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton().click();
  }

  async close(): Promise<void> {
    await this.closeButton().click();
  }
}
