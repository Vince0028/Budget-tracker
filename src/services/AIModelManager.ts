
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// List of models to try in order of preference.
const MODELS = [
    'gemini-3.1-pro-review',
    'gemini-3.0-pro-preview',
    'gemini-2.5-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
];

type GenerateOptions = {
    preferredModels?: string[];
};

class AIModelManager {
    private client: GoogleGenAI;
    private requestQueue: Array<() => Promise<void>> = [];
    private isProcessing = false;
    private rateLimitDelay = 1000; // 1 second delay between requests minimum
    private lastRequestTime = 0;

    constructor() {
        this.client = new GoogleGenAI({ apiKey: API_KEY });
    }

    /**
     * Attempts to generate content using the available models in order.
     * If one fails, it tries the next one.
     */
    async generateContent(
        prompt: any,
        config?: any,
        options?: GenerateOptions
    ): Promise<GenerateContentResponse> {
        return this.enqueueRequest(async () => {
            let lastError: any;
            const preferredModels = options?.preferredModels && options.preferredModels.length > 0
                ? options.preferredModels
                : MODELS;

            for (const modelName of preferredModels) {
                try {
                    // console.log(`Attempting to generate content with model: ${modelName}`);
                    const model = this.client.models;

                    const response = await model.generateContent({
                        model: modelName,
                        contents: prompt.contents ? prompt.contents : prompt,
                        config: config
                    });

                    return response;
                } catch (error: any) {
                    console.warn(`Model ${modelName} failed:`, error);
                    lastError = error;
                    // If it's a rate limit error (429), we might want to wait longer, 
                    // but for now we fallback to the next model which might be on a different quota bucket slightly?
                    // Actually usually 429 is per project, but sometimes per model.
                    // We continue to the next model.
                }
            }

            throw lastError || new Error("All AI models failed to respond.");
        });
    }

    // specific method to match the interface effectively
    get models() {
        return {
            generateContent: this.generateContent.bind(this)
        }
    }

    /**
     * Simple queue to prevent sending too many requests at once globally in the app.
     */
    private enqueueRequest<T>(task: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.requestQueue.push(async () => {
                try {
                    const now = Date.now();
                    const timeSinceLast = now - this.lastRequestTime;
                    if (timeSinceLast < this.rateLimitDelay) {
                        await new Promise(r => setTimeout(r, this.rateLimitDelay - timeSinceLast));
                    }

                    this.lastRequestTime = Date.now();
                    const result = await task();
                    resolve(result);
                } catch (e) {
                    reject(e);
                }
            });
            this.processQueue();
        });
    }

    private async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.requestQueue.length > 0) {
            const task = this.requestQueue.shift();
            if (task) await task();
        }

        this.isProcessing = false;
    }
}

export const aiManager = new AIModelManager();
