import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { ApiErrorBody } from '../types';

interface RequestJsonOptions {
  token?: string;
  params?: Record<string, string | number | undefined>;
  data?: unknown;
  expectedStatus?: number;
}

export async function requestJson<T>(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options: RequestJsonOptions = {}
): Promise<T> {
  const { token, params, data, expectedStatus } = options;
  const response = await request.fetch(path, {
    method,
    params,
    data,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  await assertResponse(response, expectedStatus);

  if (response.status() === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function assertResponse(response: APIResponse, expectedStatus?: number): Promise<void> {
  if (expectedStatus !== undefined) {
    if (response.status() !== expectedStatus) {
      throw await buildHttpError(response, `Expected status ${expectedStatus} but got ${response.status()}`);
    }
    return;
  }

  if (!response.ok()) {
    throw await buildHttpError(response);
  }
}

async function buildHttpError(response: APIResponse, message?: string): Promise<Error> {
  const defaultMessage = `Request failed with status ${response.status()}`;

  try {
    const errorBody = (await response.json()) as ApiErrorBody;
    return new Error(message ?? errorBody.error ?? defaultMessage);
  } catch {
    return new Error(message ?? defaultMessage);
  }
}
