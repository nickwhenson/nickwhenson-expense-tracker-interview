import { Pencil, Trash2 } from 'lucide-react';
import type { Expense } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: number) => void;
}

export function ExpenseList({ expenses, onEdit, onDelete }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500" data-testid="expense-list-empty">
        No expenses found. Add your first expense!
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <ul className="divide-y divide-gray-200" data-testid="expense-list">
        {expenses.map((expense) => (
          <li
            key={expense.id}
            className="p-4 hover:bg-gray-50"
            data-testid={`expense-item-${expense.id}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div
                  className="flex-shrink-0"
                  data-testid={`expense-icon-${expense.id}`}
                >
                  <CategoryIcon icon={expense.categoryIcon} />
                </div>
                <div>
                  <p
                    className="text-sm font-medium text-gray-900"
                    data-testid={`expense-description-${expense.id}`}
                  >
                    {expense.description}
                  </p>
                  <p
                    className="text-sm text-gray-500"
                    data-testid={`expense-meta-${expense.id}`}
                  >
                    {expense.categoryName} &middot; {formatDate(expense.date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span
                  className="text-sm font-semibold text-gray-900"
                  data-testid={`expense-amount-${expense.id}`}
                >
                  ${expense.amount.toFixed(2)}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(expense)}
                    className="p-1 text-gray-400 hover:text-indigo-600"
                    title="Edit"
                    data-testid={`expense-edit-${expense.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(expense.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete"
                    data-testid={`expense-delete-${expense.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
