
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, TransactionType, Budget } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export const parseReceiptImage = async (base64Image: string): Promise<Partial<Transaction>> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Analyze this receipt image. Extract the vendor name, total amount, date, and categorize the expense." }
        ]
      },
      config: {
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

export const getSpendingAdvice = async (transactions: Transaction[], unallocated: number): Promise<string> => {
  const summary = transactions.slice(0, 30).map(t =>
    `${t.date}: ${t.vendor} (${t.category}) - $${t.amount} [${t.type}]`
  ).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `History:\n${summary}\n\nCurrent Unallocated Funds: ₱${unallocated}\n\nProvide 3 witty tips. Address the unallocated amount if it is too high (suggest investing/saving) or negative (suggest cutting costs).`,
      config: {
        systemInstruction: "You are a smart, slightly quirky financial advisor. Use a direct, helpful, and slightly humorous tone. Keep advice actionable. Use Philippine Pesos (₱) for currency.",
      },
    });
    return response.text || "No insights available right now.";
  } catch (e) {
    console.error(e);
    return "Our AI advisor is taking a nap. Try again later.";
  }
};

export const predictNextMonth = async (transactions: Transaction[]): Promise<{ prediction: number, reasoning: string }> => {
  const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE);
  if (expenses.length === 0) return { prediction: 0, reasoning: "No expenses to analyze yet." };
  const total = expenses.reduce((acc, t) => acc + t.amount, 0);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `The user spent ₱${total} over ${expenses.length} transactions. Predict next month's total spending.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prediction: { type: Type.NUMBER, description: "Predicted amount" },
            reasoning: { type: Type.STRING, description: "Brief explanation" }
          },
          required: ["prediction", "reasoning"]
        }
      }
    });
    const data = JSON.parse(response.text || "{}");
    return {
      prediction: data.prediction || 0,
      reasoning: data.reasoning || "Insufficient data."
    };
  } catch (e) {
    console.error("Prediction Error:", e);
    return { prediction: 0, reasoning: "Could not generate a prediction." };
  }
}

export const analyzeEverything = async (transactions: Transaction[], budgets: Budget[]): Promise<string> => {
  const transactionSummary = transactions.map(t =>
    `${t.date}: ${t.vendor} (${t.category}) - $${t.amount} [${t.type}]`
  ).join('\n');

  const budgetSummary = budgets.map(b =>
    `${b.category}: $${b.limit}`
  ).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following financial data and provide a comprehensive report.\n\nTransactions:\n${transactionSummary}\n\nBudgets:\n${budgetSummary}\n\nProvide insights on spending habits, budget adherence, and potential savings.`,
      config: {
        systemInstruction: "You are a detailed and insightful financial analyst. Provide a structured report with markdown formatting. Use Philippine Pesos (₱) for all monetary values.",
      }
    });
    return response.text || "Unable to generate analysis.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Error analyzing data.";
  }
};
