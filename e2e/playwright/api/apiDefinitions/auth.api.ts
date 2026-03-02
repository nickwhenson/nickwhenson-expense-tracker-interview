import type { APIRequestContext } from '@playwright/test';
import { requestJson } from './httpClient';
import type { AuthResponse, Credentials } from '../types';

const AUTH_BASE = '/api/auth';

export async function register(
  request: APIRequestContext,
  credentials: Credentials
): Promise<AuthResponse> {
  return requestJson<AuthResponse>(request, 'POST', `${AUTH_BASE}/register`, {
    data: credentials,
    expectedStatus: 201,
  });
}

export async function login(
  request: APIRequestContext,
  credentials: Credentials
): Promise<AuthResponse> {
  return requestJson<AuthResponse>(request, 'POST', `${AUTH_BASE}/login`, {
    data: credentials,
    expectedStatus: 200,
  });
}
