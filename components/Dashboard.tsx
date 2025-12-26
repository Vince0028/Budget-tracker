
import React from 'react';
import { Transaction, TransactionType, Budget } from '../types';
import { QCard } from './UI/QuirkyComponents';
import { ArrowUpRight, ArrowDownRight, Wallet, PiggyBank, PieChart } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid, ReferenceLine } from 'recharts';

interface Props {
    transactions: Transaction[];
    budgets: Budget[];
}

const Dashboard: React.FC<Props> = ({ transactions, budgets }) => {
    const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    const totalAllocated = budgets.reduce((acc, b) => acc + b.limit, 0);
    const unallocated = income - totalAllocated;

    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    const chartData = transactions
        .slice(0, 30)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(t => ({
            date: t.date.substring(5),
            amount: t.type === TransactionType.EXPENSE ? -t.amount : t.amount
        }));

    const categoryData = Object.entries(transactions.reduce((acc: Record<string, number>, t) => {
        if (t.type === TransactionType.EXPENSE) {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
        }
        return acc;
    }, {} as Record<string, number>))
        .map(([name, value]) => ({ name, value: Number(value) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    const StatCard = ({ title, value, icon: Icon, trend, color, subtitle }: any) => (
        <div className="bg-white dark:bg-stone-900 p-5 rounded-tl-xl rounded-tr-sm rounded-br-3xl rounded-bl-md shadow-sm border border-stone-200 dark:border-stone-800 relative overflow-hidden group hover:translate-y-[-2px] transition-transform">
            <div className={`absolute -top-2 -right-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${color}`}>
                <Icon size={80} />
            </div>
            <h3 className="text-stone-500 dark:text-stone-400 font-medium text-xs uppercase tracking-widest mb-1">{title}</h3>
            <div className="text-3xl font-bold text-stone-800 dark:text-stone-100 tracking-tighter">
                ₱{value.toLocaleString()}
            </div>
            {subtitle && <p className="text-[10px] text-stone-400 mt-1 uppercase font-bold">{subtitle}</p>}
            {trend !== undefined && (
                <div className={`mt-2 inline-flex items-center text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-stone-100 text-stone-600' : 'bg-red-50 text-red-600'}`}>
                    {trend > 0 ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
                    {Math.abs(trend).toFixed(1)}%
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Income" value={income} icon={Wallet} color="text-stone-600" subtitle="Total Pool" />
                <StatCard
                    title="Allocated"
                    value={totalAllocated}
                    icon={PieChart}
                    color="text-stone-400"
                    subtitle={`${((totalAllocated / (income || 1)) * 100).toFixed(0)}% of income assigned`}
                />
                <StatCard
                    title="Unassigned"
                    value={unallocated}
                    icon={PiggyBank}
                    color={unallocated < 0 ? "text-red-500" : "text-stone-500"}
                    subtitle={unallocated < 0 ? "Over-budgeted!" : "Waiting for a job"}
                />
                <StatCard title="Savings Rate" value={savingsRate.toFixed(1)} icon={ArrowUpRight} color="text-stone-700" trend={savingsRate} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <QCard title="Income Utilization" className="lg:col-span-1">
                    <div className="flex flex-col gap-4 py-4">
                        <div className="flex justify-between items-end">
                            <span className="text-xs font-bold text-stone-500 uppercase">Assigned to Categories</span>
                            <span className="text-lg font-bold">₱{totalAllocated}</span>
                        </div>
                        <div className="h-4 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden border border-stone-200 dark:border-stone-700 p-[2px]">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${unallocated < 0 ? 'bg-red-400' : 'bg-stone-600'}`}
                                style={{ width: `${Math.min((totalAllocated / (income || 1)) * 100, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-stone-400 italic">
                            {unallocated > 0
                                ? `You have ₱${unallocated} remaining to give a job.`
                                : unallocated < 0
                                    ? "You've assigned more than you have!"
                                    : "Perfect! Every dollar has a job."}
                        </p>
                    </div>
                </QCard>

                <QCard title="Cash Flow" className="lg:col-span-2">
                    <div className="h-[200px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" strokeOpacity={0.5} />
                                {/* <XAxis dataKey="date" hide /> */}
                                <Tooltip
                                    cursor={{ stroke: '#a8a29e', strokeWidth: 1, strokeDasharray: '4 4' }}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                        padding: '12px 16px'
                                    }}
                                    itemStyle={{ color: '#1c1917', fontWeight: 'bold' }}
                                    formatter={(value: number) => [`₱${Math.abs(value).toLocaleString()}`, value > 0 ? 'Income' : 'Expense']}
                                    labelStyle={{ display: 'none' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorAmount)"
                                    animationDuration={1500}
                                />
                                <ReferenceLine y={0} stroke="#a8a29e" strokeDasharray="3 3" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </QCard>
            </div>
        </div>
    );
};

export default Dashboard;
