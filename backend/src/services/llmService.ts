import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai';
import logger from '../logger.js';

// Email filter result
export interface EmailFilterResult {
  receiptEmailIds: string[];
}

// Batch extraction result
export interface BatchExtractedExpense {
  emailId: string;
  merchant: string;
  amount: number;
  date: string;
  category: string;
  description: string;
}

// Email structure for scanning
export interface Email {
  id: string;
  from: string;
  subject: string;
  date: string;
  body: string;
}

// Schema for email filtering response
const emailFilterSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    receiptEmailIds: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Array of email IDs that contain receipts or transaction information',
    },
  },
  required: ['receiptEmailIds'],
};

// Schema for batch expense extraction
const batchExtractSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    expenses: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          emailId: { type: SchemaType.STRING, description: 'ID of the source email' },
          merchant: { type: SchemaType.STRING, description: 'Name of the merchant or business' },
          amount: { type: SchemaType.NUMBER, description: 'Total amount spent' },
          date: { type: SchemaType.STRING, description: 'Date of transaction in YYYY-MM-DD format' },
          category: {
            type: SchemaType.STRING,
            description: 'Category: Food, Transport, Entertainment, Bills, Shopping, or Other',
          },
          description: { type: SchemaType.STRING, description: 'Brief description of the expense' },
        },
        required: ['emailId', 'merchant', 'amount', 'date', 'category', 'description'],
      },
    },
  },
  required: ['expenses'],
};

// Get GenAI instance
function getGenAI(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenerativeAI(apiKey);
}

// Get model for email filtering
function getEmailFilterModel() {
  const genAI = getGenAI();
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: emailFilterSchema,
    },
  });
}

// Get model for batch expense extraction
function getBatchExtractModel() {
  const genAI = getGenAI();
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: batchExtractSchema,
    },
  });
}

// Filter emails to find those containing receipts
export async function filterReceiptEmails(emails: Email[]): Promise<EmailFilterResult> {
  try {
    const model = getEmailFilterModel();

    const emailSummaries = emails.map((e) => ({
      id: e.id,
      from: e.from,
      subject: e.subject,
      bodyPreview: e.body.substring(0, 500),
    }));

    const prompt = `Analyze the following emails and identify which ones contain receipts,
transaction confirmations, purchase confirmations, or expense-related information.

Emails:
${JSON.stringify(emailSummaries, null, 2)}

Return the IDs of emails that contain receipt or transaction information.
Only include emails that represent actual purchases or expenses.
Do NOT include newsletters, promotional emails, or general communications.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    logger.info({ responseLength: text.length, emailCount: emails.length }, 'Email filtering completed');

    const filterResult = JSON.parse(text) as EmailFilterResult;
    return filterResult;
  } catch (error) {
    logger.error({ err: error }, 'Failed to filter receipt emails');
    return { receiptEmailIds: [] };
  }
}

// Extract expenses from multiple emails
export async function extractExpensesFromEmails(emails: Email[]): Promise<BatchExtractedExpense[]> {
  try {
    const model = getBatchExtractModel();

    const prompt = `Analyze the following emails and extract expense/receipt information from each.
For each email, extract: merchant name, amount spent, date (YYYY-MM-DD format),
category (Food, Transport, Entertainment, Bills, Shopping, or Other), and a brief description.

Emails:
${JSON.stringify(
  emails.map((e) => ({
    id: e.id,
    from: e.from,
    subject: e.subject,
    date: e.date,
    body: e.body,
  })),
  null,
  2
)}

Extract expense details from each email. If an email contains multiple transactions,
create separate entries for each.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    logger.info({ responseLength: text.length, emailCount: emails.length }, 'Batch expense extraction completed');

    const extractResult = JSON.parse(text) as { expenses: BatchExtractedExpense[] };
    return extractResult.expenses;
  } catch (error) {
    logger.error({ err: error }, 'Failed to extract expenses from emails');
    return [];
  }
}
