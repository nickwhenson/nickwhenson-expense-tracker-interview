# Expense Tracker - Interview Exercise

A simple expense tracking application built with React, TypeScript, Node.js, and SQLite.

<img width="1058" height="635" alt="image" src="https://github.com/user-attachments/assets/74719286-c2ba-4d6a-91a7-21920cd9021a" />

## Project Structure

```
expense-tracker-interview/
├── backend/          # Node.js + Express + Knex API
├── frontend/         # React + Vite + TanStack Query
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Backend Setup

```bash
cd backend
npm install
npm run db:migrate    # Run database migrations
npm run db:seed       # Seed with sample data
npm run dev           # Start dev server on http://localhost:3002
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev           # Start dev server on http://localhost:5173
```

### Test Accounts

After seeding, you can login with:
- Email: `demo@example.com`
- Password: `password123`

## Tech Stack

### Backend
- Node.js + Express
- TypeScript
- Knex.js (query builder)
- SQLite (database)
- JWT (authentication)

### Frontend
- React 18
- TypeScript
- Vite
- TanStack Query (data fetching)
- Tailwind CSS (styling)

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Expenses
- `GET /api/expenses` - List user's expenses
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Categories
- `GET /api/categories` - List all categories

## Evals

Run the email extraction eval runner against the golden JSONL dataset:

```bash
cd backend
npx tsx ../evals/runners/run_email_extraction_eval.ts
```

This now performs both steps automatically:
- Runs extraction and saves raw run output to `evals/datasets/results/*.jsonl`
- Scores the run and writes reports to `evals/results/`
- Updates an aggregate report across all single-run score reports in `evals/results/`

Run multiple times in one command:

```bash
cd backend
npx tsx ../evals/runners/run_email_extraction_eval.ts --runs=5
```

You can also use `--runs 5`.

Dry run (no LLM/API calls):

```bash
cd backend
npx tsx ../evals/runners/run_email_extraction_eval.ts --dry-run
```

Optional flags:
- `--dataset <path>`: Use a custom JSONL dataset (default: `evals/datasets/golden/email_expense_golden_v1.jsonl`)
- `--output <path>`: Write results to a custom JSONL file (default: timestamped file under `evals/datasets/results/`)

Notes:
- Non-dry runs require `GEMINI_API_KEY` in `backend/.env`.
- Results are written as JSONL, one result object per case.

You can also run scoring directly:

```bash
cd backend
npx tsx ../evals/scoring/score_email_extraction_eval.ts --results ../evals/datasets/results/<run_output>.jsonl
```
