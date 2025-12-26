
import React, { useState, useRef } from 'react';
import { Transaction, TransactionType, CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';
import { QButton, QInput, QSelect, QCard, QBadge } from './UI/QuirkyComponents';
import { Trash2, Plus, Upload, Search, FileText, AlertCircle } from 'lucide-react';
import { parseReceiptImage } from '../services/geminiService';

interface Props {
  transactions: Transaction[];
  onAdd: (t: Transaction) => void;
  onDelete: (id: string) => void;
}

const Transactions: React.FC<Props> = ({ transactions, onAdd, onDelete }) => {
  const [filter, setFilter] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const [newTrans, setNewTrans] = useState<Partial<Transaction>>({
    type: TransactionType.EXPENSE,
    date: new Date().toISOString().split('T')[0],
    category: CATEGORIES[0]
  });
  const [customCategory, setCustomCategory] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsScanning(true);
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onloadend = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const data = await parseReceiptImage(base64);
          setNewTrans(prev => ({ ...prev, ...data }));
          setIsAdding(true); // Open form with populated data
        } catch (error) {
          alert("Failed to scan receipt. Please check console for details.");
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrans.amount || !newTrans.vendor) return;

    const finalCategory = (newTrans.category === 'Other' && customCategory.trim())
      ? customCategory.trim()
      : newTrans.category!;

    onAdd({
      id: crypto.randomUUID(),
      date: newTrans.date!,
      amount: Number(newTrans.amount),
      vendor: newTrans.vendor!,
      category: finalCategory,
      type: newTrans.type || TransactionType.EXPENSE,
      description: newTrans.description
    });

    setIsAdding(false);
    setCustomCategory('');
    setNewTrans({
      type: TransactionType.EXPENSE,
      date: new Date().toISOString().split('T')[0],
      category: CATEGORIES[0],
      amount: 0,
      vendor: '',
      description: ''
    });
  };

  const filteredTransactions = transactions.filter(t =>
    t.vendor.toLowerCase().includes(filter.toLowerCase()) ||
    t.category.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">Transactions</h2>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
          <QButton variant="secondary" onClick={() => fileInputRef.current?.click()} loading={isScanning}>
            <Upload size={18} /> Scan Receipt
          </QButton>
          <QButton onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? 'Cancel' : <><Plus size={18} /> Add New</>}
          </QButton>
        </div>
      </div>

      {isAdding && (
        <QCard className="animate-in slide-in-from-top-4 fade-in duration-300 border-l-4 border-l-stone-800 dark:border-l-stone-400">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QInput
              label="Date"
              type="date"
              value={newTrans.date}
              onChange={e => setNewTrans({ ...newTrans, date: e.target.value })}
              required
            />
            <QSelect
              label="Type"
              value={newTrans.type}
              onChange={e => {
                const newType = e.target.value as TransactionType;
                const defaultCategory = newType === TransactionType.INCOME ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];
                setNewTrans({ ...newTrans, type: newType, category: defaultCategory });
              }}
            >
              <option value={TransactionType.EXPENSE}>Expense</option>
              <option value={TransactionType.INCOME}>Income</option>
            </QSelect>
            <QInput
              label={newTrans.type === TransactionType.INCOME ? "Source" : "Vendor"}
              placeholder="e.g. Coffee Shop"
              value={newTrans.vendor || ''}
              onChange={e => setNewTrans({ ...newTrans, vendor: e.target.value })}
              required
            />
            <QInput
              label="Amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={newTrans.amount || ''}
              onChange={e => setNewTrans({ ...newTrans, amount: Number(e.target.value) })}
              required
            />
            <QSelect
              label="Category"
              value={newTrans.category}
              onChange={e => {
                setNewTrans({ ...newTrans, category: e.target.value });
                if (e.target.value !== 'Other') setCustomCategory('');
              }}
            >
              {(newTrans.type === TransactionType.INCOME ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c =>
                <option key={c} value={c}>{c}</option>
              )}
            </QSelect>
            {newTrans.category === 'Other' && (
              <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2">
                <QInput
                  label="Custom Category"
                  placeholder="Name your category"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            <div className="md:col-span-2 flex justify-end mt-2">
              <QButton type="submit">Save Transaction</QButton>
            </div>
          </form>
        </QCard>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
        <input
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-inner outline-none focus:ring-2 ring-stone-200 dark:ring-stone-800"
          placeholder="Search transactions..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            <FileText size={48} className="mx-auto mb-4 opacity-20" />
            <p>No transactions found.</p>
          </div>
        ) : (
          filteredTransactions.map(t => (
            <div key={t.id} className="group bg-white dark:bg-stone-900 p-4 border-b-2 border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors flex justify-between items-center rounded-sm">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${t.type === TransactionType.INCOME ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'}`}>
                  {t.vendor.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-stone-800 dark:text-stone-200">{t.vendor}</h4>
                  <div className="flex gap-2 text-xs text-stone-500">
                    <span>{t.date}</span>
                    <span>•</span>
                    <span>{t.category}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`font-mono font-bold text-lg ${t.type === TransactionType.INCOME ? 'text-green-600 dark:text-green-400' : 'text-stone-800 dark:text-stone-200'}`}>
                  {t.type === TransactionType.INCOME ? '+' : '-'}₱{t.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <button
                  onClick={() => onDelete(t.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 transition-opacity"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Transactions;