import type { APIRequestContext } from '@playwright/test';
import { requestJson } from './httpClient';
import type { Category } from '../types';

const CATEGORIES_BASE = '/api/categories';

export async function listCategories(request: APIRequestContext): Promise<Category[]> {
  return requestJson<Category[]>(request, 'GET', CATEGORIES_BASE, {
    expectedStatus: 200,
  });
}
