import type { APIRequestContext } from '@playwright/test';
import { login } from '../apiDefinitions/auth.api';
import {
  createExpense,
  deleteExpense,
  updateExpense,
} from '../apiDefinitions/expenses.api';
import type {
  Credentials,
  CreateExpenseData,
  Expense,
  UpdateExpenseData,
} from '../types';

interface AuthInput {
  token?: string;
  credentials?: Credentials;
}

interface CreateExpenseWorkflowInput extends AuthInput {
  expenseData: CreateExpenseData;
}

interface CreateExpenseWorkflowResult {
  token: string;
  expense: Expense;
}

interface UpdateExpenseWorkflowInput extends AuthInput {
  expenseId?: number;
  updateData: UpdateExpenseData;
  createIfMissing?: boolean;
  seedExpenseData?: CreateExpenseData;
}

interface UpdateExpenseWorkflowResult {
  token: string;
  expense: Expense;
}

interface DeleteExpenseWorkflowInput extends AuthInput {
  expenseId?: number;
  createIfMissing?: boolean;
  seedExpenseData?: CreateExpenseData;
}

interface DeleteExpenseWorkflowResult {
  token: string;
  deletedExpenseId: number;
}

const DEFAULT_CREDENTIALS: Credentials = {
  email: process.env.E2E_EMAIL ?? 'demo@example.com',
  password: process.env.E2E_PASSWORD ?? 'password123',
};

const DEFAULT_SEED_EXPENSE: CreateExpenseData = {
  categoryId: 1,
  amount: 10,
  description: `Seed expense ${Date.now()}`,
  date: '2026-03-01',
};

async function resolveToken(
  request: APIRequestContext,
  input?: AuthInput
): Promise<string> {
  if (input?.token) {
    return input.token;
  }

  const credentials = input?.credentials ?? DEFAULT_CREDENTIALS;
  const authResponse = await login(request, credentials);
  return authResponse.token;
}

export async function createExpenseWorkflow(
  request: APIRequestContext,
  input: CreateExpenseWorkflowInput
): Promise<CreateExpenseWorkflowResult> {
  const token = await resolveToken(request, input);
  const expense = await createExpense(request, token, input.expenseData);

  return { token, expense };
}

export async function updateExpenseWorkflow(
  request: APIRequestContext,
  input: UpdateExpenseWorkflowInput
): Promise<UpdateExpenseWorkflowResult> {
  const token = await resolveToken(request, input);
  let targetExpenseId = input.expenseId;

  if (!targetExpenseId) {
    if (!input.createIfMissing) {
      throw new Error('Missing expenseId. Set expenseId or enable createIfMissing.');
    }

    const seeded = await createExpense(
      request,
      token,
      input.seedExpenseData ?? DEFAULT_SEED_EXPENSE
    );
    targetExpenseId = seeded.id;
  }

  const expense = await updateExpense(request, token, targetExpenseId, input.updateData);
  return { token, expense };
}

export async function deleteExpenseWorkflow(
  request: APIRequestContext,
  input: DeleteExpenseWorkflowInput
): Promise<DeleteExpenseWorkflowResult> {
  const token = await resolveToken(request, input);
  let targetExpenseId = input.expenseId;

  if (!targetExpenseId) {
    if (!input.createIfMissing) {
      throw new Error('Missing expenseId. Set expenseId or enable createIfMissing.');
    }

    const seeded = await createExpense(
      request,
      token,
      input.seedExpenseData ?? DEFAULT_SEED_EXPENSE
    );
    targetExpenseId = seeded.id;
  }

  await deleteExpense(request, token, targetExpenseId);
  return { token, deletedExpenseId: targetExpenseId };
}
