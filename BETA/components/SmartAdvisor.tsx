
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, Budget } from '../types';
import { getSpendingAdvice, predictNextMonth, analyzeEverything } from '../services/geminiService';
import { QCard, QButton } from './UI/QuirkyComponents';
import { Sparkles, TrendingUp, Lightbulb, BrainCircuit, Star } from 'lucide-react';

interface Props {
    transactions: Transaction[];
    budgets: Budget[];
}

const SmartAdvisor: React.FC<Props> = ({ transactions, budgets }) => {
    const [advice, setAdvice] = useState<string>('');
    const [prediction, setPrediction] = useState<{ prediction: number, reasoning: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [fullAnalysis, setFullAnalysis] = useState<string>('');
    const [analyzing, setAnalyzing] = useState(false);

    const totalIncome = transactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((acc, t) => acc + t.amount, 0);
    const totalAllocated = budgets.reduce((acc, b) => acc + b.limit, 0);
    const unallocated = totalIncome - totalAllocated;

    const fetchInsights = async () => {
        setLoading(true);
        const [adv, pred] = await Promise.all([
            getSpendingAdvice(transactions, unallocated),
            predictNextMonth(transactions)
        ]);
        setAdvice(adv);
        setPrediction(pred);
        setLoading(false);
    };

    const handleAnalyzeEverything = async () => {
        setAnalyzing(true);
        const analysis = await analyzeEverything(transactions, budgets);
        setFullAnalysis(analysis);
        setAnalyzing(false);
    };



    if (transactions.length === 0) {
        return (
            <div className="text-center py-20 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800">
                <BrainCircuit className="mx-auto mb-4 w-12 h-12 opacity-10" />
                <p className="text-stone-400 italic">I need some transactions to read your financial future.</p>
            </div>
        )
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <QCard title="Spending Forecast" className="bg-stone-100 dark:bg-stone-900 border-b-4 border-stone-200 dark:border-stone-800">
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-stone-200 dark:bg-stone-800 text-stone-600 rounded-full">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-stone-500 text-[10px] uppercase tracking-widest">Next Month Estimate</h4>
                        {loading ? (
                            <div className="h-8 w-32 bg-stone-200 dark:bg-stone-700 animate-pulse rounded mt-1" />
                        ) : prediction ? (
                            <div className="text-3xl font-black text-stone-900 dark:text-stone-100">
                                ₱{prediction.prediction.toLocaleString()}
                            </div>
                        ) : (
                            <div className="text-3xl font-black text-stone-300 dark:text-stone-700">
                                ---
                            </div>
                        )}
                    </div>
                </div>
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed italic border-l-2 border-stone-300 dark:border-stone-700 pl-4">
                    {loading ? "Analyzing patterns..." : (prediction?.reasoning || "Click 'Generate Financial Insights' to view forecast.")}
                </p>
            </QCard>

            <QCard title="Advisor Notes" className="border-l-4 border-stone-800 dark:border-stone-200">
                <div className="space-y-4">
                    {loading ? (
                        <div className="space-y-3">
                            <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-3/4 animate-pulse" />
                            <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-full animate-pulse" />
                            <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-5/6 animate-pulse" />
                        </div>
                    ) : !advice ? (
                        <div className="text-center py-8">
                            <QButton onClick={fetchInsights} className="mx-auto">
                                <Sparkles size={18} className="mr-2" /> Generate Financial Insights
                            </QButton>
                            <p className="text-xs text-stone-400 mt-4">Powered by Gemini AI</p>
                        </div>
                    ) : (
                        <div className="text-stone-700 dark:text-stone-300 text-sm leading-relaxed">
                            <div className="whitespace-pre-line flex flex-col gap-4">
                                {advice.split('\n').map((line, i) => line.trim() && (
                                    <div key={i} className="flex gap-3 items-start group">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-stone-400 group-hover:bg-stone-800 transition-colors shrink-0" />
                                        <span>{line.replace(/^[-*]\s*/, '')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                {advice && (
                    <div className="mt-8 flex justify-end">
                        <QButton variant="ghost" onClick={fetchInsights} loading={loading} className="text-[10px] uppercase font-bold tracking-widest">
                            <Sparkles size={14} className="mr-2" /> Refresh Wisdom
                        </QButton>
                    </div>
                )}
            </QCard>
            <QCard title="Deep Analysis" className="md:col-span-2 bg-gradient-to-br from-stone-800 to-stone-900 text-stone-100 border-none shadow-xl">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex-1">
                        <p className="text-stone-300 text-sm mb-4 leading-relaxed">
                            Unlock a comprehensive financial audit using all your transaction history and budget allocations.
                        </p>
                        {fullAnalysis ? (
                            <div className="prose prose-invert prose-sm max-w-none bg-black/20 p-6 rounded-xl border border-white/10">
                                <pre className="whitespace-pre-wrap font-sans text-stone-300">{fullAnalysis}</pre>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-yellow-500/80 text-xs font-bold uppercase tracking-widest">
                                <Star size={12} fill="currentColor" /> Premium Feature Unlocked
                            </div>
                        )}
                    </div>
                    <QButton
                        onClick={handleAnalyzeEverything}
                        loading={analyzing}
                        className="bg-white text-stone-900 hover:bg-stone-200 border-none shrink-0"
                    >
                        {analyzing ? 'Analyzing...' : 'Analyze Everything'}
                    </QButton>
                </div>
            </QCard>
        </div>
    );
};

export default SmartAdvisor;
