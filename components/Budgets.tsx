
import React, { useState } from 'react';
import { Budget, Transaction, TransactionType, EXPENSE_CATEGORIES, THEME_COLORS } from '../types';
import { QButton, QInput, QSelect, QCard } from './UI/QuirkyComponents';
import { Trash2, AlertTriangle, Coins, PlusCircle, Pencil } from 'lucide-react';

interface Props {
    budgets: Budget[];
    transactions: Transaction[];
    onUpdateBudgets: (budgets: Budget[]) => void;
}

const Budgets: React.FC<Props> = ({ budgets, transactions, onUpdateBudgets }) => {
    const [newBudget, setNewBudget] = useState<Partial<Budget>>({ category: EXPENSE_CATEGORIES[0], limit: 100, color: THEME_COLORS[0] });
    const [customCategory, setCustomCategory] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const totalIncome = transactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((acc, t) => acc + t.amount, 0);

    const totalAllocated = budgets.reduce((acc, b) => acc + b.limit, 0);
    const unallocated = totalIncome - totalAllocated;

    const handleAdd = () => {
        if (!newBudget.limit) return;
        const finalCategory = (newBudget.category === 'Other' && customCategory.trim())
            ? customCategory.trim()
            : newBudget.category!;

        if (editingId) {
            // Update existing
            const updated = budgets.map(b => b.id === editingId ? {
                ...b,
                category: finalCategory,
                limit: Number(newBudget.limit),
                color: newBudget.color!
            } : b);
            onUpdateBudgets(updated);
        } else {
            // Create new
            const updated = [...budgets, {
                id: crypto.randomUUID(),
                category: finalCategory,
                limit: Number(newBudget.limit),
                color: newBudget.color!
            }];
            onUpdateBudgets(updated);
        }

        setShowAdd(false);
        setEditingId(null);
        setNewBudget({ category: EXPENSE_CATEGORIES[0], limit: 100, color: THEME_COLORS[0] });
        setCustomCategory('');
    };

    const handleEdit = (budget: Budget) => {
        const isCustom = !EXPENSE_CATEGORIES.includes(budget.category);
        setNewBudget({
            category: isCustom ? 'Other' : budget.category,
            limit: budget.limit,
            color: budget.color
        });
        if (isCustom) setCustomCategory(budget.category);
        else setCustomCategory('');

        setEditingId(budget.id);
        setShowAdd(true);
    };

    const handleDelete = (id: string) => {
        onUpdateBudgets(budgets.filter(b => b.id !== id));
    };

    const getSpent = (category: string) => {
        return transactions
            .filter(t => t.type === TransactionType.EXPENSE && t.category === category)
            .reduce((acc, t) => acc + t.amount, 0);
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Allocation Header */}
            <div className="relative p-8 bg-stone-100 dark:bg-stone-900 rounded-tl-[40px] rounded-br-[60px] border-b-4 border-r-4 border-stone-200 dark:border-stone-800 transition-all">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-center md:text-left">
                        <h2 className="text-sm font-black text-stone-400 uppercase tracking-[0.2em] mb-1">Total Pool</h2>
                        <div className="text-4xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2 justify-center md:justify-start">
                            <Coins className="text-stone-400" size={32} />
                            ₱{totalIncome.toLocaleString()}
                        </div>
                    </div>

                    <div className={`p-6 px-10 rounded-full border-2 transform rotate-[-1deg] transition-all shadow-quirky ${unallocated < 0 ? 'bg-red-50 border-red-200' : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'}`}>
                        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">To Be Budgeted</h3>
                        <div className={`text-3xl font-black ${unallocated < 0 ? 'text-red-500' : 'text-stone-800 dark:text-stone-100'}`}>
                            ₱{unallocated.toLocaleString()}
                        </div>
                    </div>

                    <QButton onClick={() => setShowAdd(!showAdd)} className="rounded-full w-14 h-14 flex items-center justify-center p-0">
                        <PlusCircle size={24} />
                    </QButton>
                </div>
            </div>

            {showAdd && (
                <div className="animate-in zoom-in-95 duration-200">
                    <QCard title={editingId ? "Edit Allocation" : "Assign Income"} className="bg-stone-50 dark:bg-stone-900 border-dashed border-2">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <QSelect
                                label="Category"
                                value={newBudget.category}
                                onChange={e => {
                                    setNewBudget({ ...newBudget, category: e.target.value });
                                    if (e.target.value !== 'Other') setCustomCategory('');
                                }}
                            >
                                {EXPENSE_CATEGORIES.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </QSelect>
                            {newBudget.category === 'Other' && (
                                <QInput
                                    label="Custom Category"
                                    placeholder="Name your category"
                                    value={customCategory}
                                    onChange={e => setCustomCategory(e.target.value)}
                                    autoFocus
                                />
                            )}
                            <QInput
                                label="Assign Amount (₱)"
                                type="number"
                                value={newBudget.limit}
                                onChange={e => setNewBudget({ ...newBudget, limit: Number(e.target.value) })}
                            />
                            <QSelect
                                label="Marker"
                                value={newBudget.color}
                                onChange={e => setNewBudget({ ...newBudget, color: e.target.value })}
                            >
                                {THEME_COLORS.map((c, i) => <option key={i} value={c}>Palette {i + 1}</option>)}
                            </QSelect>
                            <div className="flex gap-2">
                                <QButton onClick={handleAdd} className="flex-1">{editingId ? 'Update' : 'Assign'}</QButton>
                                <QButton variant="ghost" onClick={() => {
                                    setShowAdd(false);
                                    setEditingId(null);
                                    setNewBudget({ category: EXPENSE_CATEGORIES[0], limit: 100, color: THEME_COLORS[0] });
                                }}>Cancel</QButton>
                            </div>
                        </div>
                    </QCard>
                </div>
            )}

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {budgets.map(budget => {
                    const spent = getSpent(budget.category);
                    const percent = Math.min((spent / budget.limit) * 100, 100);
                    const isOver = spent > budget.limit;

                    return (
                        <QCard key={budget.id} className="relative group flex flex-col h-full border-b-[4px] border-r-[3px]">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex flex-col">
                                    <h3 className="font-black text-lg text-stone-800 dark:text-stone-200 tracking-tight">{budget.category}</h3>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: budget.color }}></div>
                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">Budget Allocation</span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleEdit(budget)} className="text-stone-300 hover:text-stone-600 dark:hover:text-stone-100 transition-colors p-1">
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(budget.id)} className="text-stone-300 hover:text-red-400 transition-colors p-1">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-auto">
                                <div className="flex justify-between items-baseline mb-2">
                                    <span className={`text-2xl font-black ${isOver ? 'text-red-500' : 'text-stone-800 dark:text-stone-100'}`}>
                                        ₱{spent.toFixed(0)}
                                    </span>
                                    <span className="text-stone-400 text-xs font-mono">OF ₱{budget.limit}</span>
                                </div>

                                {/* Hand-drawn feel progress bar */}
                                <div className="h-2.5 w-full bg-stone-100 dark:bg-stone-800 rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700 relative mb-2">
                                    <div
                                        className="h-full transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                                        style={{
                                            width: `${percent}%`,
                                            backgroundColor: isOver ? '#ef4444' : budget.color,
                                            borderRadius: '0 10px 10px 0'
                                        }}
                                    />
                                </div>

                                <div className="flex justify-between items-center text-[10px] font-black text-stone-400 uppercase">
                                    <span>{percent.toFixed(0)}% Utilized</span>
                                    <span>₱{(budget.limit - spent).toFixed(0)} Left</span>
                                </div>
                            </div>

                            {isOver && (
                                <div className="absolute top-2 right-12 text-red-500 animate-bounce">
                                    <AlertTriangle size={16} />
                                </div>
                            )}
                        </QCard>
                    );
                })}
            </div>

            {budgets.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-3xl">
                    <Coins size={48} className="mx-auto mb-4 text-stone-300" />
                    <p className="text-stone-400 font-medium italic">Your income is currently unassigned. Give your money a job!</p>
                    <QButton variant="secondary" onClick={() => setShowAdd(true)} className="mt-4 mx-auto">
                        Start Allocating
                    </QButton>
                </div>
            )}
        </div>
    );
};

export default Budgets;
