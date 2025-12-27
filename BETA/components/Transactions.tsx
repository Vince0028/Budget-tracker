
import React, { useState, useRef } from 'react';
import { Transaction, TransactionType, CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES, Budget } from '../types';
import { QButton, QInput, QSelect, QCard, QBadge } from './UI/QuirkyComponents';
import ConfirmModal from './ConfirmModal';
import { Trash2, Plus, Upload, Search, FileText, AlertCircle, Pencil, GripVertical } from 'lucide-react';
import { parseReceiptImage } from '../services/geminiService';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  transactions: Transaction[];
  budgets: Budget[];
  onAdd: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onReorder?: (transactions: Transaction[]) => void;
}

const SortableTransactionRow = ({ transaction, onEdit, onDelete }: { transaction: Transaction, onEdit: () => void, onDelete: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: transaction.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as 'relative', // Explicit cast
  };

  return (
    <div ref={setNodeRef} style={style} className="group bg-white dark:bg-stone-900 p-4 border-b-2 border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors flex justify-between items-center rounded-sm">
      <div className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-stone-200 hover:text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" {...attributes} {...listeners}>
        <GripVertical size={16} />
      </div>
      <div className="flex items-center gap-4 pl-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${transaction.type === TransactionType.INCOME ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'}`}>
          {transaction.vendor.charAt(0).toUpperCase()}
        </div>
        <div>
          <h4 className="font-bold text-stone-800 dark:text-stone-200">{transaction.vendor}</h4>
          <div className="flex gap-2 text-xs text-stone-500">
            <span>{transaction.category}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={`font-mono font-bold text-lg ${transaction.type === TransactionType.INCOME ? 'text-green-600 dark:text-green-400' : 'text-stone-800 dark:text-stone-200'}`}>
          {transaction.type === TransactionType.INCOME ? '+' : '-'}₱{transaction.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <button
          onClick={onEdit}
          className="opacity-0 group-hover:opacity-100 p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-opacity"
        >
          <Pencil size={18} />
        </button>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 transition-opacity"
        >
          <Trash2 size={18} />
        </button>
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
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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
          ? "Are you sure you want to delete this transaction? This action cannot be undone."
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
            <div className="md:col-span-2 flex justify-end mt-2 gap-2">
              <QButton type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</QButton>
              <QButton type="submit">{editingId ? 'Update Transaction' : 'Save Transaction'}</QButton>
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