
import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, Budget } from '../types';
import { QCard } from './UI/QuirkyComponents';
import { ArrowUpRight, ArrowDownRight, Wallet, PiggyBank, PieChart, Filter } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Props {
    transactions: Transaction[];
    budgets: Budget[];
}

const Dashboard: React.FC<Props> = ({ transactions, budgets }) => {
    // Current date for default selection
    const now = new Date();
    const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all'); // 0-11 for months, 'all' for entire year
    const [selectedType, setSelectedType] = useState<TransactionType | 'all'>('all');

    const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    const totalAllocated = budgets.reduce((acc, b) => acc + b.limit, 0);
    const unallocated = income - totalAllocated;

    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    // Get available years from transactions
    const availableYears = useMemo(() => {
        const years = new Set(transactions.map(t => new Date(t.date).getFullYear()));
        years.add(now.getFullYear()); // Ensure current year is always available
        return Array.from(years).sort((a, b) => b - a);
    }, [transactions]);

    // Filter transactions based on selection
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const date = new Date(t.date);
            const yearMatch = date.getFullYear() === selectedYear;
            const monthMatch = selectedMonth === 'all' || date.getMonth() === selectedMonth;
            const typeMatch = selectedType === 'all' || t.type === selectedType;
            return yearMatch && monthMatch && typeMatch;
        });
    }, [transactions, selectedYear, selectedMonth, selectedType]);

    // Group filtered transactions by date
    const groupedData = useMemo(() => {
        return filteredTransactions.reduce((acc, t) => {
            const date = t.date;
            if (!acc[date]) {
                acc[date] = { income: 0, expense: 0 };
            }
            if (t.type === TransactionType.INCOME) {
                acc[date].income += t.amount;
            } else {
                acc[date].expense += t.amount;
            }
            return acc;
        }, {} as Record<string, { income: number, expense: number }>);
    }, [filteredTransactions]);

    // Generate chart data - ONLY for days with data
    const chartData = useMemo(() => {
        const uniqueDates = Object.keys(groupedData).sort();

        return uniqueDates.map(dateStr => {
            const d = new Date(dateStr);
            const data = groupedData[dateStr];
            return {
                date: dateStr,
                displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                income: data.income,
                expense: data.expense
            };
        });
    }, [groupedData]);

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

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const FilterSelect = ({ value, onChange, options, bold = false }: any) => (
        <div className="relative group">
            <select
                value={value}
                onChange={onChange}
                className={`appearance-none bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 rounded-lg px-3 py-1.5 pr-8 text-xs font-medium text-stone-600 dark:text-stone-300 outline-none transition-all cursor-pointer shadow-sm ${bold ? 'font-bold' : ''}`}
            >
                {options}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Total Income" value={income} icon={Wallet} color="text-stone-600" subtitle="Total Pool" />
                <StatCard
                    title="Total Expenses"
                    value={expenses}
                    icon={ArrowDownRight}
                    color="text-red-500"
                    subtitle="Combined Spending"
                />
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

                <QCard className="lg:col-span-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-stone-100 dark:border-stone-800 pb-4 gap-4">
                        <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200 inline-block transform -rotate-[0.5deg]">Cash Flow</h3>

                        <div className="flex gap-2 items-center flex-wrap">
                            <FilterSelect
                                value={selectedType}
                                onChange={(e: any) => setSelectedType(e.target.value)}
                                options={
                                    <>
                                        <option value="all">All Types</option>
                                        <option value={TransactionType.INCOME}>Income</option>
                                        <option value={TransactionType.EXPENSE}>Expense</option>
                                    </>
                                }
                            />

                            <div className="w-[1px] h-6 bg-stone-200 dark:bg-stone-700 mx-1 hidden sm:block"></div>

                            <FilterSelect
                                value={selectedMonth}
                                onChange={(e: any) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                options={
                                    <>
                                        <option value="all">All Months</option>
                                        {months.map((m, i) => (
                                            <option key={m} value={i}>{m}</option>
                                        ))}
                                    </>
                                }
                            />

                            <FilterSelect
                                value={selectedYear}
                                onChange={(e: any) => setSelectedYear(Number(e.target.value))}
                                bold={true}
                                options={
                                    availableYears.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))
                                }
                            />
                        </div>
                    </div>

                    <div className="h-[250px] w-full mt-4 overflow-x-auto !overflow-y-hidden">
                        {chartData.length > 0 ? (
                            <div style={{ minWidth: `${Math.max(100, chartData.length * 60)}px`, width: '100%', height: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" strokeOpacity={0.5} />
                                        <XAxis
                                            dataKey="displayDate"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#a8a29e', fontSize: 10 }}
                                            dy={10}
                                            interval={0} // Show all ticks since we removed empty days
                                            minTickGap={15}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#a8a29e', fontSize: 10 }}
                                            tickFormatter={(value) => `₱${value}`}
                                        />
                                        <Tooltip
                                            cursor={{ stroke: '#a8a29e', strokeWidth: 1, strokeDasharray: '4 4' }}
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                                padding: '12px 16px'
                                            }}
                                            labelStyle={{ color: '#78716c', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}
                                            formatter={(value: number, name: string) => [
                                                `₱${value.toLocaleString()}`,
                                                name === 'income' ? 'Income' : 'Expense'
                                            ]}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="income"
                                            name="income"
                                            stroke="#22c55e"
                                            strokeWidth={3}
                                            fillOpacity={0.5}
                                            fill="url(#colorIncome)"
                                            animationDuration={1500}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="expense"
                                            name="expense"
                                            stroke="#ef4444"
                                            strokeWidth={3}
                                            fillOpacity={0.5}
                                            fill="url(#colorExpense)"
                                            animationDuration={1500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center text-stone-400 text-sm italic">
                                No transactions found for this period.
                            </div>
                        )}
                    </div>
                </QCard>
            </div>
        </div>
    );
};

export default Dashboard;
