import { expect, type Locator, type Page } from '@playwright/test';
import { ExpenseItemComponent } from './expenseItem.component';

export class ExpenseListComponent {
  readonly root: Locator;
  readonly emptyState: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('expense-list');
    this.emptyState = page.getByTestId('expense-list-empty');
  }

  itemById(id: number): ExpenseItemComponent {
    return new ExpenseItemComponent(this.page.getByTestId(`expense-item-${id}`));
  }

  firstItemByDescription(description: string): ExpenseItemComponent {
    const item = this.root.locator('li', {
      has: this.page.locator('[data-testid^="expense-description-"]', { hasText: description }),
    }).first();

    return new ExpenseItemComponent(item);
  }

  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async expectNotEmpty(): Promise<void> {
    const count = await this.root.locator('li').count();
    expect(count).toBeGreaterThan(0);
  }
}
