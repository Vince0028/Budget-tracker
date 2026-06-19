
import React, { useState, useEffect, useRef } from 'react';
import { Transaction, TransactionType, CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES, Budget } from '../types';
import { QButton, QInput, QSelect, QCard, QBadge } from './UI/QuirkyComponents';
import ConfirmModal from './ConfirmModal';
import Modal from './UI/Modal';
import { Trash2, Plus, Upload, Search, FileText, AlertCircle, Pencil, GripVertical } from 'lucide-react';
import { parseReceiptImage } from '../services/geminiService';
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  transactions: Transaction[];
  budgets: Budget[];
  onAdd: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onReorder: (transactions: Transaction[]) => void;
  pendingDeletes: Record<string, number>;
  onUndoDelete: (id: string) => void;
}

const SortableTransactionRow = ({ transaction, onEdit, onDelete, deleteDeadline, onUndo }: { transaction: Transaction, onEdit: () => void, onDelete: () => void, deleteDeadline?: number, onUndo?: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: transaction.id });

  const isPendingDelete = !!deleteDeadline;
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (deleteDeadline) {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.ceil((deleteDeadline - Date.now()) / 1000));
        setTimeLeft(remaining);
        return remaining;
      };

      updateTimer(); // Initial calculation
      const timer = setInterval(() => {
        if (updateTimer() <= 0) clearInterval(timer);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [deleteDeadline]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 'auto',
    opacity: isDragging ? 0.8 : 1,
    position: 'relative' as 'relative',
    touchAction: 'pan-y',
  };

  if (isPendingDelete) {
    return (
      <div ref={setNodeRef} style={style} className="p-4 border-b-2 border-stone-100 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-900/50 flex justify-between items-center rounded-sm select-none grayscale opacity-60">
        <div className="flex items-center gap-4 flex-1">
          <span className="italic text-stone-500 font-medium text-sm">Deleting in {timeLeft}s...</span>
          <div className="flex-1 h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-stone-400 w-full origin-left transform -scale-x-100 transition-transform duration-1000 ease-linear"
              style={{ transform: `translateX(-${(1 - timeLeft / 20) * 100}%)` }} // Simple visual regression
            ></div>
          </div>
        </div>
        <button
          onClick={onUndo}
          className="ml-4 px-3 py-1 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded text-sm font-bold hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="group bg-white dark:bg-stone-900 p-4 border-b-2 border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors flex justify-between items-center rounded-sm select-none" {...attributes} {...listeners}>
      <div
        className="flex items-center gap-2 md:gap-4 flex-1 min-w-0 cursor-pointer"
        onClick={onEdit}
      >
        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm md:text-lg font-bold ${transaction.type === TransactionType.INCOME ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'}`}>
          {transaction.vendor.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 py-1">
          <h4 className="font-bold text-stone-800 dark:text-stone-200 text-sm md:text-base line-clamp-2 leading-tight break-words">{transaction.vendor}</h4>
          <div className="flex gap-2 text-xs text-stone-500">
            <span className="truncate">{transaction.category}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-4 pl-2 shrink-0">
        <span className={`font-mono font-bold text-sm md:text-lg whitespace-nowrap ${transaction.type === TransactionType.INCOME ? 'text-green-600 dark:text-green-400' : 'text-stone-800 dark:text-stone-200'}`}>
          {transaction.type === TransactionType.INCOME ? '+' : '-'}₱{transaction.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 md:p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
          >
            <Pencil size={18} className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 md:p-2 text-red-300 hover:text-red-500 transition-colors"
          >
            <Trash2 size={18} className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

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

const Transactions: React.FC<Props> = ({ transactions, budgets, onAdd, onDelete, onReorder, pendingDeletes, onUndoDelete }) => {
  const [filter, setFilter] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ type: 'delete' | 'edit' | null; id: string | null; data?: Transaction }>({ type: null, id: null });

  // Removed local delete logic (pendingDeletes, deleteTimers, useEffect, queueDelete, commitDelete, undoDelete) defined here


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
      id: editingId || crypto.randomUUID(),
      date: newTrans.date!,
      amount: Number(newTrans.amount),
      vendor: newTrans.vendor!,
      category: finalCategory,
      type: newTrans.type || TransactionType.EXPENSE,
      description: newTrans.description
    });

    setIsAdding(false);
    setEditingId(null);
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

  const handleEditClick = (t: Transaction) => {
    setConfirmState({ type: 'edit', id: t.id, data: t });
  };

  const proceedWithEdit = (t: Transaction) => {
    const isCustom = !EXPENSE_CATEGORIES.includes(t.category) && !INCOME_CATEGORIES.includes(t.category);
    setNewTrans({
      ...t
    });
    if (isCustom) {
      setNewTrans(prev => ({ ...prev, category: 'Other' }));
      setCustomCategory(t.category);
    } else {
      setCustomCategory('');
    }

    setEditingId(t.id);
    setIsAdding(true);
  };

  const handleConfirmAction = () => {
    if (confirmState.type === 'delete' && confirmState.id) {
      onDelete(confirmState.id);
    } else if (confirmState.type === 'edit' && confirmState.data) {
      proceedWithEdit(confirmState.data);
    }
    setConfirmState({ type: null, id: null });
  };

  // Filter States
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [selectedType, setSelectedType] = useState<TransactionType | 'all'>('all');

  // Get available years
  const availableYears = React.useMemo(() => {
    const years = new Set(transactions.map(t => new Date(t.date).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  const filteredTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    const yearMatch = date.getFullYear() === selectedYear;
    const monthMatch = selectedMonth === 'all' || date.getMonth() === selectedMonth;
    const typeMatch = selectedType === 'all' || t.type === selectedType;
    const searchMatch = t.vendor.toLowerCase().includes(filter.toLowerCase()) ||
      t.category.toLowerCase().includes(filter.toLowerCase());

    return yearMatch && monthMatch && typeMatch && searchMatch;
  });

  // Group by date
  const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
    const date = transaction.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>);

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 500, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id && onReorder) {
      // Find which date group these belong to
      const activeItem = transactions.find(t => t.id === active.id);
      const overItem = transactions.find(t => t.id === over?.id);

      if (activeItem && overItem && activeItem.date === overItem.date) {
        const oldIndex = transactions.findIndex((t) => t.id === active.id);
        const newIndex = transactions.findIndex((t) => t.id === over?.id);
        onReorder(arrayMove(transactions, oldIndex, newIndex));
      }
    }
  };

  // Dynamic expense categories based on budgets
  const budgetCategories = budgets.map(b => b.category);
  const allExpenseCategories = Array.from(new Set([...EXPENSE_CATEGORIES, ...budgetCategories]));

  const filteredIncome = filteredTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
  const filteredExpense = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
  const filteredNet = filteredIncome - filteredExpense;

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
          <QButton onClick={() => {
            setIsAdding(!isAdding);
            setEditingId(null);
            setNewTrans({
              type: TransactionType.EXPENSE,
              date: new Date().toISOString().split('T')[0],
              category: CATEGORIES[0],
              amount: 0,
              vendor: '',
              description: ''
            });
          }}>
            {isAdding ? 'Cancel' : <><Plus size={18} /> Add New</>}
          </QButton>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmState.type}
        onClose={() => setConfirmState({ type: null, id: null })}
        onConfirm={handleConfirmAction}
        title={confirmState.type === 'delete' ? "Delete Transaction?" : "Edit Transaction?"}
        message={confirmState.type === 'delete'
          ? "Are you sure you want to delete this transaction?"
          : "Are you sure you want to edit this transaction? You'll be able to modify all details."}
        confirmText={confirmState.type === 'delete' ? "Yes, Delete" : "Yes, Edit"}
        variant={confirmState.type === 'delete' ? 'danger' : 'primary'}
      />

      <Modal
        isOpen={isAdding}
        onClose={() => {
          setIsAdding(false);
          setEditingId(null);
        }}
        title={editingId ? "Edit Transaction" : "Add Transaction"}
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
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
            {(newTrans.type === TransactionType.INCOME ? INCOME_CATEGORIES : allExpenseCategories).map(c =>
              <option key={c} value={c}>{c}</option>
            )}
          </QSelect>
          {newTrans.category === 'Other' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <QInput
                label="Custom Category"
                placeholder="Name your category"
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                autoFocus
              />
            </div>
          )}
          {editingId && (
            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-stone-200 dark:border-stone-700">
              <QButton type="button" variant="ghost" onClick={() => { setIsAdding(false); setEditingId(null); }}>Cancel</QButton>
              <QButton type="submit">Update</QButton>
            </div>
          )}
          {!editingId && (
            <div className="flex justify-end mt-2 gap-2">
              <QButton type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</QButton>
              <QButton type="submit">Save</QButton>
            </div>
          )}
        </form>
      </Modal>

      <div className="flex flex-col lg:flex-row gap-4">
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

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg shadow-sm outline-none focus:ring-2 ring-stone-200 dark:ring-stone-800 transition-all"
            placeholder="Search transactions..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
      </div>

      {filteredTransactions.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-2 animate-in fade-in slide-in-from-top-2">
          <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm p-4 rounded-xl border border-stone-200/50 dark:border-stone-700/50 shadow-sm flex flex-col justify-center items-center text-center">
             <p className="text-[10px] md:text-xs text-stone-500 font-bold uppercase tracking-widest mb-1">Total Income</p>
             <p className="text-lg md:text-xl font-black text-green-600 dark:text-green-500 break-all leading-tight">
               +₱{filteredIncome.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </p>
          </div>
          <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm p-4 rounded-xl border border-stone-200/50 dark:border-stone-700/50 shadow-sm flex flex-col justify-center items-center text-center">
             <p className="text-[10px] md:text-xs text-stone-500 font-bold uppercase tracking-widest mb-1">Total Expense</p>
             <p className="text-lg md:text-xl font-black text-stone-800 dark:text-stone-200 break-all leading-tight">
               -₱{filteredExpense.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </p>
          </div>
          <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm p-4 rounded-xl border border-stone-200/50 dark:border-stone-700/50 shadow-sm flex flex-col justify-center items-center text-center">
             <p className="text-[10px] md:text-xs text-stone-500 font-bold uppercase tracking-widest mb-1">Net Balance</p>
             <p className={`text-lg md:text-xl font-black break-all leading-tight ${filteredNet >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-500 dark:text-red-400'}`}>
               {filteredNet >= 0 ? '+' : '-'}₱{Math.abs(filteredNet).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </p>
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid gap-6">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-stone-500">
              <FileText size={48} className="mx-auto mb-4 opacity-20" />
              <p>No transactions found.</p>
            </div>
          ) : (
            sortedDates.map(date => (
              <div key={date} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-3 px-1">
                  <h3 className="text-xs font-black text-stone-700 dark:text-stone-300 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-stone-200/50 dark:border-stone-700/50 uppercase tracking-widest">
                    {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </h3>
                  <div className="h-px bg-white/40 dark:bg-stone-800/60 flex-1 rounded-full"></div>
                </div>
                <SortableContext items={groupedTransactions[date].map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="bg-white dark:bg-stone-900 rounded-lg shadow-sm overflow-hidden">
                    {groupedTransactions[date].map(t => (
                      <SortableTransactionRow
                        key={t.id}
                        transaction={t}
                        deleteDeadline={pendingDeletes[t.id]}
                        onUndo={() => onUndoDelete(t.id)}
                        onEdit={() => handleEditClick(t)}
                        onDelete={() => setConfirmState({ type: 'delete', id: t.id })}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            ))
          )}
        </div>
      </DndContext>
    </div>
  );
};

export default Transactions;