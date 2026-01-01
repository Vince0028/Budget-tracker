import React, { useState, useEffect, useRef } from 'react';
import { WishlistItem } from '../types';
import { Plus, Trash2, ExternalLink, ArrowUpRight, Gift, ShoppingBag, Target, Pencil, GripVertical } from 'lucide-react';
import { QButton, QCard, QInput } from './UI/QuirkyComponents';
import ConfirmModal from './ConfirmModal';
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
    wishlist: WishlistItem[];
    unallocatedCash: number;
    onAdd: (item: WishlistItem) => void;
    onDelete: (id: string) => void;
    onPromote: (item: WishlistItem) => void;
    onUpdateWishlist: (items: WishlistItem[]) => void;
    pendingDeletes: Record<string, number>;
    onUndoDelete: (id: string) => void;
}

const SortableWishlistCard = ({ item, children, deleteDeadline, onUndo }: { item: WishlistItem, children: React.ReactNode, deleteDeadline?: number, onUndo?: () => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

    const isPendingDelete = !!deleteDeadline;
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (deleteDeadline) {
            const updateTimer = () => {
                const remaining = Math.max(0, Math.ceil((deleteDeadline - Date.now()) / 1000));
                setTimeLeft(remaining);
                return remaining;
            };
            updateTimer();
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
        touchAction: 'pan-y',
    };

    if (isPendingDelete) {
        return (
            <div ref={setNodeRef} style={style} className="h-full relative select-none p-6 border-2 border-stone-200 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-900/50 rounded-lg flex flex-col justify-center items-center grayscale opacity-60">
                <div className="flex flex-col items-center gap-2 w-full">
                    <span className="italic text-stone-500 font-medium text-sm">Deleting in {timeLeft}s...</span>
                    <div className="w-full h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-stone-400 w-full origin-left transform -scale-x-100 transition-transform duration-1000 ease-linear"
                            style={{ transform: `translateX(-${(1 - timeLeft / 20) * 100}%)` }}
                        ></div>
                    </div>
                </div>
                <button
                    onClick={onUndo}
                    className="mt-4 px-4 py-2 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg text-sm font-bold hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
                >
                    Undo Delete
                </button>
            </div>
        );
    }

    return (
        <div ref={setNodeRef} style={style} className="h-full relative select-none" {...attributes} {...listeners}>
            {/* Grip handle as a visual hint, but interaction is now on the whole card via listeners above */}
            <div className="absolute top-6 left-5 z-20 text-stone-300 dark:text-stone-700 opacity-50 hover:opacity-100 cursor-grab">
                <GripVertical size={20} />
            </div>
            {children}
        </div>
    );
};

const Wishlist: React.FC<Props> = ({ wishlist, unallocatedCash, onAdd, onDelete, onPromote, onUpdateWishlist, pendingDeletes, onUndoDelete }) => {
    const [showAdd, setShowAdd] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newItem, setNewItem] = useState<Partial<WishlistItem> & { amount: number | string }>({
        name: '',
        amount: '',
        priority: 'medium',
        link: '',
        note: ''
    });
    const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

    const [confirmState, setConfirmState] = useState<{ type: 'delete' | 'edit' | 'promote' | null; id: string | null; data?: WishlistItem }>({ type: null, id: null });

    // Removed local delete logic as it is now lifted to App.tsx

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 500, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = wishlist.findIndex((w) => w.id === active.id);
            const newIndex = wishlist.findIndex((w) => w.id === over?.id);
            onUpdateWishlist(arrayMove(wishlist, oldIndex, newIndex));
        }
    };

    const handleEditClick = (item: WishlistItem) => {
        setConfirmState({ type: 'edit', id: item.id, data: item });
    };

    const proceedWithEdit = (item: WishlistItem) => {
        setNewItem({
            name: item.name,
            amount: item.amount,
            priority: item.priority,
            link: item.link,
            note: item.note
        });
        setEditingId(item.id);
        setShowAdd(true);
    };

    const handleConfirmAction = () => {
        if (confirmState.type === 'delete' && confirmState.id) {
            onDelete(confirmState.id); // Uses prop from App
        } else if (confirmState.type === 'edit' && confirmState.data) {
            proceedWithEdit(confirmState.data);
        } else if (confirmState.type === 'promote' && confirmState.data) {
            onPromote(confirmState.data);
        }
        setConfirmState({ type: null, id: null });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newItem.name && newItem.amount) {
            if (editingId) {
                const updatedItem = {
                    id: editingId,
                    name: newItem.name,
                    amount: Number(newItem.amount),
                    priority: newItem.priority as 'low' | 'medium' | 'high',
                    link: newItem.link,
                    note: newItem.note
                };

                const newWishlist = wishlist.map(w => w.id === editingId ? { ...w, ...updatedItem } : w);
                onUpdateWishlist(newWishlist as WishlistItem[]);
            } else {
                onAdd({
                    id: crypto.randomUUID(),
                    name: newItem.name,
                    amount: Number(newItem.amount),
                    priority: newItem.priority as 'low' | 'medium' | 'high',
                    link: newItem.link,
                    note: newItem.note
                });
            }
            setNewItem({ name: '', amount: '', priority: 'medium', link: '', note: '' });
            setShowAdd(false);
            setEditingId(null);
        }
    };

    const priorityColors = {
        low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };

    const filteredWishlist = wishlist.filter(item => filter === 'all' || item.priority === filter);
    const totalWishlistValue = wishlist.reduce((acc, item) => acc + item.amount, 0);
    const filteredValue = filteredWishlist.reduce((acc, item) => acc + item.amount, 0);

    return (
        <div className="space-y-6 pb-20">
            <ConfirmModal
                isOpen={!!confirmState.type}
                onClose={() => setConfirmState({ type: null, id: null })}
                onConfirm={handleConfirmAction}
                title={
                    confirmState.type === 'delete' ? "Delete Wish?"
                        : confirmState.type === 'edit' ? "Edit Wish?"
                            : "Fund This Wish?"
                }
                message={
                    confirmState.type === 'delete' ? "Are you sure you want to delete this item? It will be gone forever (unless you undo quickly!)."
                        : confirmState.type === 'edit' ? "Make changes to this item?"
                            : "This will create a new Budget Allocation for this item and remove it from your wishlist. Ready to start saving?"
                }
                confirmText={
                    confirmState.type === 'delete' ? "Yes, Delete"
                        : confirmState.type === 'edit' ? "Yes, Edit"
                            : "Yes, Fund It"
                }
                variant={confirmState.type === 'delete' ? 'danger' : 'primary'}
            />

            {/* Header Banner - Unallocated Cash */}
            <div className="bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 p-8 rounded-3xl relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-stone-800 dark:bg-stone-200 rounded-full blur-3xl -mr-32 -mt-32 opacity-50"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2 opacity-80">
                            <Target size={20} />
                            <span className="text-xs font-black uppercase tracking-widest">Available to Assign</span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter mb-2">
                            ₱{unallocatedCash.toLocaleString()}
                        </h1>
                        <p className="text-sm font-medium opacity-70 max-w-md">
                            Pick an item from your wishlist below to fund it!
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 opacity-90">
                        <span className="text-[10px] uppercase font-bold tracking-widest">Total Wishlist Value</span>
                        <span className="text-2xl font-black">₱{totalWishlistValue.toLocaleString()}</span>
                        {filter !== 'all' && (
                            <span className="text-xs font-medium">({filter}: ₱{filteredValue.toLocaleString()})</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-black text-stone-800 dark:text-stone-100 tracking-tight flex items-center gap-2">
                    <Gift className="text-stone-400" />
                    Wishlist
                </h2>

                <div className="flex gap-2 p-1 bg-stone-200 dark:bg-stone-800 rounded-xl overflow-hidden">
                    {(['all', 'high', 'medium', 'low'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
                                ${filter === f
                                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                                    : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="flex-grow md:flex-grow-0">
                    <QButton onClick={() => { setEditingId(null); setNewItem({ name: '', amount: '', priority: 'medium', link: '', note: '' }); setShowAdd(true); }} icon={Plus}>Add Item</QButton>
                </div>
            </div>

            {showAdd && (
                <QCard title={editingId ? "Edit Wish" : "Add New Wish"} className="animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <QInput
                                label="Item Name"
                                value={newItem.name}
                                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                placeholder="e.g. New Headphones"
                                required
                            />
                            <QInput
                                label="Estimated Price"
                                type="number"
                                placeholder="0"
                                value={newItem.amount}
                                onChange={e => setNewItem({ ...newItem, amount: e.target.value === '' ? '' : Number(e.target.value) })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Priority</label>
                                <div className="flex gap-2">
                                    {(['low', 'medium', 'high'] as const).map(p => (
                                        <button
                                            type="button"
                                            key={p}
                                            onClick={() => setNewItem({ ...newItem, priority: p })}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border-2 transition-all
                                    ${newItem.priority === p
                                                    ? 'border-stone-800 bg-stone-800 text-stone-100 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                                                    : 'border-stone-200 text-stone-400 hover:border-stone-300'}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <QInput
                                label="Link (Optional)"
                                value={newItem.link}
                                onChange={e => setNewItem({ ...newItem, link: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowAdd(false)}
                                className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
                            >
                                Cancel
                            </button>
                            <QButton type="submit">{editingId ? 'Update Wish' : 'Add to List'}</QButton>
                        </div>
                    </form>
                </QCard>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredWishlist.map(w => w.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredWishlist.length === 0 && !showAdd && (
                            <div className="col-span-full py-20 text-center text-stone-400">
                                <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="font-bold">
                                    {filter === 'all' ? "Your wishlist is empty." : `No ${filter} priority items.`}
                                </p>
                                {filter === 'all' && <p className="text-sm">Add things you want to buy later.</p>}
                            </div>
                        )}

                        {filteredWishlist.map(item => (
                            <SortableWishlistCard
                                key={item.id}
                                item={item}
                                deleteDeadline={pendingDeletes[item.id]}
                                onUndo={() => onUndoDelete(item.id)}
                            >
                                <QCard className="relative group flex flex-col h-full border-b-[4px] border-r-[3px]Hover hover:-translate-y-1 transition-transform duration-200">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col gap-1 pr-4">
                                            <span className={`self-start px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${priorityColors[item.priority]}`}>
                                                {item.priority}
                                            </span>
                                            <h3 className="font-black text-xl text-stone-900 dark:text-stone-100 leading-none tracking-tight">{item.name}</h3>
                                        </div>
                                        <div className="text-sm md:text-lg font-black text-stone-800 dark:text-stone-200 whitespace-nowrap">
                                            ₱{item.amount.toLocaleString()}
                                        </div>
                                    </div>

                                    {item.link && (
                                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors flex items-center gap-1 mb-6">
                                            <ExternalLink size={12} strokeWidth={3} />
                                            Visit Link
                                        </a>
                                    )}

                                    <div className="mt-auto pt-4 border-t-2 border-dashed border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleEditClick(item)}
                                                className="p-2 text-stone-300 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                onClick={() => setConfirmState({ type: 'delete', id: item.id, data: item })}
                                                className="p-2 text-stone-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setConfirmState({ type: 'promote', id: item.id, data: item })}
                                            className="flex items-center gap-2 py-2 px-4 bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors shadow-sm"
                                        >
                                            Fund It <ArrowUpRight size={14} strokeWidth={3} />
                                        </button>
                                    </div>
                                </QCard>
                            </SortableWishlistCard>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
};

export default Wishlist;
