import type { APIRequestContext } from '@playwright/test';
import { requestJson } from './httpClient';
import type {
  Expense,
  CreateExpenseData,
  UpdateExpenseData,
} from '../types';

const EXPENSES_BASE = '/api/expenses';

export async function createExpense(
  request: APIRequestContext,
  token: string,
  data: CreateExpenseData
): Promise<Expense> {
  return requestJson<Expense>(request, 'POST', EXPENSES_BASE, {
    token,
    data,
    expectedStatus: 201,
  });
}

export async function updateExpense(
  request: APIRequestContext,
  token: string,
  expenseId: number,
  data: UpdateExpenseData
): Promise<Expense> {
  return requestJson<Expense>(request, 'PUT', `${EXPENSES_BASE}/${expenseId}`, {
    token,
    data,
    expectedStatus: 200,
  });
}

export async function deleteExpense(
  request: APIRequestContext,
  token: string,
  expenseId: number
): Promise<void> {
  return requestJson<void>(request, 'DELETE', `${EXPENSES_BASE}/${expenseId}`, {
    token,
    expectedStatus: 204,
  });
}
