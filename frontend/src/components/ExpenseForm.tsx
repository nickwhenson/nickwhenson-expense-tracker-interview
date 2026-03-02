import { useState, useEffect } from 'react';
import { useCategories } from '../hooks/useCategories';
import type { CreateExpenseData, Expense } from '../types';

interface ExpenseFormProps {
  onSubmit: (data: CreateExpenseData) => void;
  onCancel: () => void;
  initialData?: Expense;
  isLoading?: boolean;
}

export function ExpenseForm({ onSubmit, onCancel, initialData, isLoading }: ExpenseFormProps) {
  const isEditMode = Boolean(initialData);
  const { data: categories } = useCategories();
  const [formData, setFormData] = useState<CreateExpenseData>({
    categoryId: initialData?.categoryId || 1,
    amount: initialData?.amount || 0,
    description: initialData?.description || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        categoryId: initialData.categoryId,
        amount: initialData.amount,
        description: initialData.description,
        date: initialData.date,
      });
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      data-testid={isEditMode ? 'expense-form-edit' : 'expense-form-add'}
    >
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Category
        </label>
        <select
          id="category"
          data-testid="expense-form-category"
          value={formData.categoryId}
          onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
        >
          {categories?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
          Amount
        </label>
        <input
          type="number"
          id="amount"
          data-testid="expense-form-amount"
          step="0.01"
          value={formData.amount || ''}
          onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm border p-2 ${
            errors.amount ? 'border-red-500' : 'border-gray-300'
          } focus:border-indigo-500 focus:ring-indigo-500`}
          placeholder="0.00"
        />
        {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <input
          type="text"
          id="description"
          data-testid="expense-form-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm border p-2 ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          } focus:border-indigo-500 focus:ring-indigo-500`}
          placeholder="What was this expense for?"
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
          Date
        </label>
        <input
          type="date"
          id="date"
          data-testid="expense-form-date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm border p-2 ${
            errors.date ? 'border-red-500' : 'border-gray-300'
          } focus:border-indigo-500 focus:ring-indigo-500`}
        />
        {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          data-testid={isEditMode ? 'expense-form-cancel-edit' : 'expense-form-cancel-add'}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
          data-testid={isEditMode ? 'expense-form-submit-edit' : 'expense-form-submit-add'}
        >
          {isLoading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}
