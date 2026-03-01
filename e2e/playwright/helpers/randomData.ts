const MIN_AMOUNT_CENTS = 1;
const MAX_AMOUNT_CENTS = 99998;

const START_DATE_UTC = Date.UTC(2025, 0, 1);
const END_DATE_UTC = Date.UTC(2026, 11, 31);
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EXPENSE_CATEGORIES = ['1', '2', '3', '4', '5', '6'] as const;

export function createRandomAmount(): number {
  const centsRange = MAX_AMOUNT_CENTS - MIN_AMOUNT_CENTS + 1;
  const randomCents = Math.floor(Math.random() * centsRange) + MIN_AMOUNT_CENTS;
  return randomCents / 100;
}

export function createRandomDate(): string {
  const totalDays = Math.floor((END_DATE_UTC - START_DATE_UTC) / MS_PER_DAY);
  const randomDayOffset = Math.floor(Math.random() * (totalDays + 1));
  const randomDate = new Date(START_DATE_UTC + randomDayOffset * MS_PER_DAY);
  return randomDate.toISOString().slice(0, 10);
}

export function setRandomCategory(): string {
  const randomIndex = Math.floor(Math.random() * EXPENSE_CATEGORIES.length);
  return EXPENSE_CATEGORIES[randomIndex];
}
