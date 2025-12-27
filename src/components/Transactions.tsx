
import React, { useState, useEffect, useRef } from 'react';
import { Transaction, TransactionType, CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES, Budget } from '../types';
import { QButton, QInput, QSelect, QCard, QBadge } from './UI/QuirkyComponents';
import ConfirmModal from './ConfirmModal';
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
  onReorder?: (transactions: Transaction[]) => void;
}

const SortableTransactionRow = ({ transaction, onEdit, onDelete, isPendingDelete, onUndo }: { transaction: Transaction, onEdit: () => void, onDelete: () => void, isPendingDelete?: boolean, onUndo?: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: transaction.id });
  const [timeLeft, setTimeLeft] = useState(20);

  useEffect(() => {
    if (isPendingDelete) {
      setTimeLeft(20);
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isPendingDelete]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 'auto',
    opacity: isDragging ? 0.8 : 1,
    position: 'relative' as 'relative', // Explicit cast
    touchAction: 'pan-y',
  };

  if (isPendingDelete) {
    return (
      <div ref={setNodeRef} style={style} className="p-4 border-b-2 border-stone-100 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-900/50 flex justify-between items-center rounded-sm select-none grayscale opacity-60">
        <div className="flex items-center gap-4 flex-1">
          <span className="italic text-stone-500 font-medium text-sm">Deleting in {timeLeft}s...</span>
          <div className="flex-1 h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
            <div className="h-full bg-stone-400 animate-[width_20s_linear_forwards] w-full origin-left transform -scale-x-100"></div>
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
      {/* Visual grip handle, always visible but subtle */}
      {/* Grip handle removed to save space on mobile and prevent horizontal overflow */}
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
        {/* Buttons visible on mobile, no hover needed. Compressed usage. */}
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

const Transactions: React.FC<Props> = ({ transactions, budgets, onAdd, onDelete, onReorder }) => {
  const [filter, setFilter] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ type: 'delete' | 'edit' | null; id: string | null; data?: Transaction }>({ type: null, id: null });

  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const deleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return () => {
      // Commit all pending deletes on unmount
      Object.entries(deleteTimers.current).forEach(([id, timer]) => {
        clearTimeout(timer);
        onDelete(id);
      });
    };
  }, [onDelete]);

  const queueDelete = (id: string) => {
    setPendingDeletes(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    deleteTimers.current[id] = setTimeout(() => {
      commitDelete(id);
    }, 20000); // 20 seconds
  };

  const commitDelete = (id: string) => {
    onDelete(id);
    setPendingDeletes(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    const newTimers = { ...deleteTimers.current };
    delete newTimers[id];
    deleteTimers.current = newTimers;
  };

  const undoDelete = (id: string) => {
    if (deleteTimers.current[id]) {
      clearTimeout(deleteTimers.current[id]);
      const newTimers = { ...deleteTimers.current };
      delete newTimers[id];
      deleteTimers.current = newTimers;
    }
    setPendingDeletes(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

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
      queueDelete(confirmState.id);
    } else if (confirmState.type === 'edit' && confirmState.data) {
      proceedWithEdit(confirmState.data);
    }
    setConfirmState({ type: null, id: null });
  };

  const filteredTransactions = transactions.filter(t =>
    t.vendor.toLowerCase().includes(filter.toLowerCase()) ||
    t.category.toLowerCase().includes(filter.toLowerCase())
  );

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
              {(newTrans.type === TransactionType.INCOME ? INCOME_CATEGORIES : allExpenseCategories).map(c =>
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
            {editingId && (
              <div className="md:col-span-2 flex justify-between mt-2 pt-2 border-t border-stone-200 dark:border-stone-700">
                <button
                  type="button"
                  onClick={() => setConfirmState({ type: 'delete', id: editingId })}
                  className="px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} /> Delete
                </button>
                <div className="flex gap-2">
                  <QButton type="button" variant="ghost" onClick={() => { setIsAdding(false); setEditingId(null); }}>Cancel</QButton>
                  <QButton type="submit">Update Transaction</QButton>
                </div>
              </div>
            )}
            {!editingId && (
              <div className="md:col-span-2 flex justify-end mt-2 gap-2">
                <QButton type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</QButton>
                <QButton type="submit">Save Transaction</QButton>
              </div>
            )}
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
                <div className="flex items-center gap-2 mb-2 sticky top-0 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-sm p-2 z-10">
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                  <div className="h-px bg-stone-200 dark:bg-stone-800 flex-1"></div>
                </div>
                <SortableContext items={groupedTransactions[date].map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="bg-white dark:bg-stone-900 rounded-lg shadow-sm overflow-hidden">
                    {groupedTransactions[date].map(t => (
                      <SortableTransactionRow
                        key={t.id}
                        transaction={t}
                        isPendingDelete={pendingDeletes.has(t.id)}
                        onUndo={() => undoDelete(t.id)}
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