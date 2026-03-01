export interface User {
  id: number;
  email: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
}

export interface Expense {
  id: number;
  userId: number;
  categoryId: number;
  amount: number;
  description: string;
  date: string;
  createdAt: string;
  categoryName: string;
  categoryIcon: string;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface CreateExpenseData {
  categoryId: number;
  amount: number;
  description: string;
  date: string;
}

export interface UpdateExpenseData {
  categoryId?: number;
  amount?: number;
  description?: string;
  date?: string;
}

export interface ApiErrorBody {
  error?: string;
  details?: unknown;
}
