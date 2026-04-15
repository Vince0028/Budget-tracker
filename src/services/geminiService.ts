import { Type } from "@google/genai";
import { Transaction, TransactionType, Budget } from "../types";
import { aiManager } from "./AIModelManager";

export interface SpendingAdviceResponse {
  quickVerdict: string;
  biggestLeak: string;
  nextMoves: string[];
}

export interface SpendingForecastResponse {
  estimate: number;
  basis: string;
  reasoning: string;
}

export interface FinancialAnalysisResponse {
  executiveSummary: string;
  spendingPatterns: string[];
  budgetHealth: string[];
  wasteRiskAreas: string[];
  recommendedActions: string[];
}

export const parseReceiptImage = async (base64Image: string): Promise<Partial<Transaction>> => {
  try {
    const response = await aiManager.generateContent({
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Analyze this receipt image. Extract the vendor name, total amount, date, and categorize the expense." }
        ]
      },
    }, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          vendor: { type: Type.STRING, description: "Name of the merchant" },
          amount: { type: Type.NUMBER, description: "Total numeric amount found" },
          date: { type: Type.STRING, description: "Date in YYYY-MM-DD format" },
          category: { type: Type.STRING, description: "One of: Food & Dining, Transportation, Housing, Utilities, Entertainment, Healthcare, Shopping, Personal Care, Education, Travel, Other" }
        },
        required: ["vendor", "amount", "date", "category"]
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned from AI");
    const data = JSON.parse(text);

    return {
      vendor: data.vendor || "Unknown Vendor",
      amount: data.amount || 0,
      date: data.date || new Date().toISOString().split('T')[0],
      category: data.category || "Other",
      type: TransactionType.EXPENSE
    };
  } catch (error) {
    console.error("Gemini Receipt Error:", error);
    throw error;
  }
};

export const getSpendingAdvice = async (transactions: Transaction[], unallocated: number): Promise<SpendingAdviceResponse> => {
  const summary = transactions.slice(0, 30).map(t =>
    `${t.date}: ${t.vendor} (${t.category}) - ₱${t.amount} [${t.type}]`
  ).join('\n');

  try {
    const response = await aiManager.generateContent({
      contents: `History:\n${summary}\n\nCurrent To Be Budgeted: ₱${unallocated}\n\nReturn JSON only with this shape:\n{\n  "quickVerdict": "one short sentence",\n  "biggestLeak": "one short sentence",\n  "nextMoves": ["item 1", "item 2", "item 3"]\n}\n\nKeep each field short, practical, and specific to the data.`,
    }, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          quickVerdict: { type: Type.STRING },
          biggestLeak: { type: Type.STRING },
          nextMoves: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["quickVerdict", "biggestLeak", "nextMoves"],
      },
      systemInstruction: "You are a concise financial advisor. You are blunt, structured, and highly readable. Use markdown headings and bullets. No fluff.",
    }, {
      preferredModels: ['gemini-2.5-flash', 'gemini-3.0-pro-preview', 'gemini-3.1-pro-review'],
    });
    const data = JSON.parse(response.text || '{}');
    return {
      quickVerdict: data.quickVerdict || 'No insights available right now.',
      biggestLeak: data.biggestLeak || 'No major spending leak detected.',
      nextMoves: Array.isArray(data.nextMoves) ? data.nextMoves.slice(0, 3) : [],
    };
  } catch (e) {
    console.error(e);
    return {
      quickVerdict: 'Our AI advisor is taking a nap. Try again later.',
      biggestLeak: '',
      nextMoves: [],
    };
  }
};

export const predictNextMonth = async (transactions: Transaction[]): Promise<SpendingForecastResponse> => {
  const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE);
  if (expenses.length === 0) return { estimate: 0, basis: 'No expense data yet.', reasoning: 'No expenses to analyze yet.' };

  const now = new Date();
  const currentMonthExpenses = expenses.filter(t => {
    const date = new Date(t.date);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });

  const currentMonthSpent = currentMonthExpenses.reduce((acc, t) => acc + t.amount, 0);
  const daysElapsed = Math.max(1, now.getDate());
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const estimatedMonthlySpend = currentMonthSpent > 0
    ? Math.round((currentMonthSpent / daysElapsed) * daysInMonth)
    : Math.round(expenses.reduce((acc, t) => acc + t.amount, 0) / Math.max(1, new Set(expenses.map(t => new Date(t.date).getFullYear() + '-' + new Date(t.date).getMonth())).size));

  return {
    estimate: estimatedMonthlySpend,
    basis: currentMonthSpent > 0
      ? `Based on this month's spending pace: ₱${currentMonthSpent.toLocaleString()} so far across ${currentMonthExpenses.length} expenses.`
      : `Based on your historical average monthly spend of about ₱${estimatedMonthlySpend.toLocaleString()}.`,
    reasoning: currentMonthSpent > 0
      ? 'This estimate uses only the current month and projects the rest of the month from the pace so far.'
      : 'No current-month spending exists yet, so the estimate falls back to your historical monthly average.'
  };
}

export const analyzeEverything = async (transactions: Transaction[], budgets: Budget[]): Promise<FinancialAnalysisResponse> => {
  const transactionSummary = transactions.map(t =>
    `${t.date}: ${t.vendor} (${t.category}) - ₱${t.amount} [${t.type}]`
  ).join('\n');

  const budgetSummary = budgets.map(b =>
    `${b.category}: ₱${b.limit}`
  ).join('\n');

  try {
    const response = await aiManager.generateContent({
      contents: `Analyze the following financial data and return JSON only.\n\nTransactions:\n${transactionSummary}\n\nBudgets:\n${budgetSummary}\n\nReturn this shape exactly:\n{\n  "executiveSummary": "short summary",\n  "spendingPatterns": ["point 1", "point 2"],\n  "budgetHealth": ["point 1", "point 2"],\n  "wasteRiskAreas": ["point 1", "point 2"],\n  "recommendedActions": ["step 1", "step 2", "step 3"]\n}\n\nKeep it organized, specific, and concise. No markdown tables, no ascii decoration, no filler. Use Philippine Pesos (₱) in any amount mention.`,
    }, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          executiveSummary: { type: Type.STRING },
          spendingPatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
          budgetHealth: { type: Type.ARRAY, items: { type: Type.STRING } },
          wasteRiskAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["executiveSummary", "spendingPatterns", "budgetHealth", "wasteRiskAreas", "recommendedActions"],
      },
      systemInstruction: "You are a detailed financial analyst. Output structured JSON only. Be concise, direct, and specific.",
    }, {
      preferredModels: ['gemini-3.1-pro-review', 'gemini-3.0-pro-preview', 'gemini-2.5-flash'],
    });
    const data = JSON.parse(response.text || '{}');
    return {
      executiveSummary: data.executiveSummary || 'Unable to generate analysis.',
      spendingPatterns: Array.isArray(data.spendingPatterns) ? data.spendingPatterns : [],
      budgetHealth: Array.isArray(data.budgetHealth) ? data.budgetHealth : [],
      wasteRiskAreas: Array.isArray(data.wasteRiskAreas) ? data.wasteRiskAreas : [],
      recommendedActions: Array.isArray(data.recommendedActions) ? data.recommendedActions.slice(0, 3) : [],
    };
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      executiveSummary: 'Error analyzing data.',
      spendingPatterns: [],
      budgetHealth: [],
      wasteRiskAreas: [],
      recommendedActions: [],
    };
  }
};
