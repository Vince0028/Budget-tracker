import React, { useEffect, useMemo, useState } from 'react';
import { TripPool } from '../types';
import { QButton, QCard, QInput, QSelect } from './UI/QuirkyComponents';
import Modal from './UI/Modal';
import ConfirmModal from './ConfirmModal';
import { CalendarClock, Plus, Users, WalletCards, MinusCircle, Trash2, TriangleAlert, Pencil, CheckCircle, RotateCcw, Pin } from 'lucide-react';

interface Props {
  pools: TripPool[];
  onAddPool: (pool: TripPool) => void;
  onUpdatePool: (pool: TripPool) => void;
  onDeletePool: (id: string) => void;
  onRunAutoCharges: () => void;
}

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const parseAtLeast = (rawValue: string, min: number, fallback: number) => {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
};

const calculateWeeksSince = (startDate: string): number => {
  const start = new Date(startDate);
  const now = new Date();
  if (Number.isNaN(start.getTime())) return 0;
  
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((now.getTime() - start.getTime()) / msPerWeek);
};

const Trips: React.FC<Props> = ({ pools, onAddPool, onUpdatePool, onDeletePool, onRunAutoCharges }) => {
  const [showAddPool, setShowAddPool] = useState(false);
  const [createPoolError, setCreatePoolError] = useState('');

  const [newPool, setNewPool] = useState({
    name: '',
    targetAmount: '',
    incrementAmount: '50',
    autoChargeEnabled: true,
    autoChargeAmount: '50',
    autoChargeWeekday: 5,
    chargeStartDate: new Date().toISOString().split('T')[0],
  });

  const scheduleFieldClass = (enabled: boolean) =>
    enabled ? '' : 'opacity-50 pointer-events-none select-none';

  const totals = useMemo(() => {
    const totalTarget = pools.reduce((sum, pool) => sum + pool.targetAmount, 0);
    const totalCollected = pools.reduce(
      (sum, pool) => sum + pool.members.reduce((memberSum, member) => memberSum + member.totalPaid, 0),
      0
    );
    const membersOwing = pools.reduce(
      (sum, pool) => sum + pool.members.filter(member => member.balance < 0).length,
      0
    );

    return {
      totalTarget,
      totalCollected,
      membersOwing,
    };
  }, [pools]);

  const handleCreatePool = () => {
    const trimmedName = newPool.name.trim();
    if (!trimmedName) {
      setCreatePoolError('Trip name is required.');
      return;
    }

    const parsedTarget = Number(newPool.targetAmount);
    const targetAmount = Number.isFinite(parsedTarget) && parsedTarget > 0 ? parsedTarget : 0;

    onAddPool({
      id: crypto.randomUUID(),
      name: trimmedName,
      targetAmount,
      incrementAmount: parseAtLeast(newPool.incrementAmount, 50, 50),
      autoChargeEnabled: newPool.autoChargeEnabled,
      autoChargeAmount: parseAtLeast(newPool.autoChargeAmount, 50, 50),
      autoChargeWeekday: Number(newPool.autoChargeWeekday),
      chargeStartDate: newPool.chargeStartDate,
      lastAutoChargeAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      members: [],
    });

    setShowAddPool(false);
    setCreatePoolError('');
    setNewPool({
      name: '',
      targetAmount: '',
      incrementAmount: '50',
      autoChargeEnabled: true,
      autoChargeAmount: '50',
      autoChargeWeekday: 5,
      chargeStartDate: new Date().toISOString().split('T')[0],
    });
  };

  const updatePoolField = (pool: TripPool, field: keyof TripPool, value: string | number | boolean) => {
    onUpdatePool({
      ...pool,
      [field]: value,
    });
  };

  const addMember = (pool: TripPool, memberName: string) => {
    if (!memberName.trim()) return;
    const alreadyExists = pool.members.some(member => member.name.toLowerCase() === memberName.trim().toLowerCase());
    if (alreadyExists) return;

    const weeksSince = calculateWeeksSince(pool.chargeStartDate);
    const catchUpCharge = weeksSince * Math.max(50, pool.autoChargeAmount || 50);

    onUpdatePool({
      ...pool,
      members: [
        ...pool.members,
        {
          id: crypto.randomUUID(),
          name: memberName.trim(),
          balance: pool.autoChargeEnabled ? -catchUpCharge : 0,
          totalPaid: 0,
        },
      ],
    });
  };

  const removeMember = (pool: TripPool, memberId: string) => {
    onUpdatePool({
      ...pool,
      members: pool.members.filter(member => member.id !== memberId),
    });
  };

  const addPayment = (pool: TripPool, memberId: string, amount: number) => {
    const paymentAmount = Math.max(50, amount || pool.incrementAmount || 50);

    onUpdatePool({
      ...pool,
      members: pool.members.map(member =>
        member.id === memberId
          ? {
            ...member,
            totalPaid: member.totalPaid + paymentAmount,
          }
          : member
      ),
    });
  };

  const chargeOneMember = (pool: TripPool, memberId: string, amount: number) => {
    const chargeAmount = Math.max(50, amount || pool.autoChargeAmount || 50);

    onUpdatePool({
      ...pool,
      members: pool.members.map(member =>
        member.id === memberId
          ? {
            ...member,
            balance: member.balance - chargeAmount,
          }
          : member
      ),
    });
  };

  const chargeAllMembersNow = (pool: TripPool) => {
    const chargeAmount = Math.max(50, pool.autoChargeAmount || 50);
    const anchor = pool.lastAutoChargeAt || pool.chargeStartDate || pool.createdAt;
    const runCount = pool.autoChargeEnabled ? Math.max(1, calculateWeeksSince(anchor)) : 1;
    const totalCharge = chargeAmount * runCount;

    onUpdatePool({
      ...pool,
      members: pool.members.map(member => ({
        ...member,
        balance: member.balance - totalCharge,
      })),
      lastAutoChargeAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 p-8 rounded-3xl relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-stone-800 dark:bg-stone-200 rounded-full blur-3xl -mr-32 -mt-32 opacity-60"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-80">
              <WalletCards size={16} />
              Group Trip Collections
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mt-2">₱{totals.totalCollected.toLocaleString()}</h1>
            <p className="text-sm opacity-70 mt-2">Collected so far across all trips.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-right">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">Target</p>
              <p className="text-xl font-black">₱{totals.totalTarget.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">Members Owing</p>
              <p className="text-xl font-black">{totals.membersOwing}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-2xl font-black tracking-tight text-stone-800 dark:text-stone-100 flex items-center gap-2">
          <Users className="text-stone-400" />
          Trip Funds
        </h2>
        <QButton onClick={() => setShowAddPool(true)}>
          <Plus size={16} />
          Add Trip
        </QButton>
      </div>

      <Modal isOpen={showAddPool} onClose={() => {
        setShowAddPool(false);
        setCreatePoolError('');
      }} title="Create Trip Fund">
        <div className="space-y-4">
          <QInput
            label="Trip Name"
            placeholder="e.g. Batangas Swimming Trip"
            value={newPool.name}
            onChange={e => {
              setCreatePoolError('');
              setNewPool(prev => ({ ...prev, name: e.target.value }));
            }}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QInput
              label="Target Amount (Optional)"
              type="number"
              min={0}
              value={newPool.targetAmount}
              onChange={e => setNewPool(prev => ({ ...prev, targetAmount: e.target.value }))}
            />
            <QInput
              label="Quick Add Increment (min 50)"
              type="number"
              min={50}
              step={50}
              value={newPool.incrementAmount}
              onChange={e => setNewPool(prev => ({ ...prev, incrementAmount: e.target.value }))}
              onBlur={() => setNewPool(prev => ({ ...prev, incrementAmount: String(parseAtLeast(prev.incrementAmount, 50, 50)) }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={scheduleFieldClass(newPool.autoChargeEnabled)}>
              <QInput
                label="Scheduled Charge Amount"
                type="number"
                min={50}
                step={50}
                value={newPool.autoChargeAmount}
                disabled={!newPool.autoChargeEnabled}
                onChange={e => setNewPool(prev => ({ ...prev, autoChargeAmount: e.target.value }))}
                onBlur={() => setNewPool(prev => ({ ...prev, autoChargeAmount: String(parseAtLeast(prev.autoChargeAmount, 50, 50)) }))}
              />
            </div>
            <div className={scheduleFieldClass(newPool.autoChargeEnabled)}>
              <QSelect
                label="Scheduled Day"
                value={newPool.autoChargeWeekday}
                disabled={!newPool.autoChargeEnabled}
                onChange={e => setNewPool(prev => ({ ...prev, autoChargeWeekday: Number(e.target.value) }))}
              >
                {WEEKDAY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </QSelect>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
            <input
              type="checkbox"
              checked={newPool.autoChargeEnabled}
              onChange={e => setNewPool(prev => ({ ...prev, autoChargeEnabled: e.target.checked }))}
            />
            Enable scheduled weekly charges
          </label>

          <QInput
            label="Charge Start Date"
            type="date"
            value={newPool.chargeStartDate}
            onChange={e => setNewPool(prev => ({ ...prev, chargeStartDate: e.target.value }))}
          />

          {newPool.autoChargeEnabled && (
            <div className="p-3 rounded-lg bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
              <p className="text-xs text-stone-400 uppercase tracking-widest font-bold mb-2">Schedule Preview</p>
              <p className="text-sm font-bold text-stone-700 dark:text-stone-200">
                Week {calculateWeeksSince(newPool.chargeStartDate) + 1} · {newPool.autoChargeWeekday === new Date().getDay() ? <span className="inline-flex items-center gap-1"><Pin size={14} /> Charge Day Today</span> : `Next charge: ${WEEKDAY_OPTIONS.find(w => w.value === newPool.autoChargeWeekday)?.label}`}
              </p>
            </div>
          )}

          {createPoolError && (
            <p className="text-sm font-bold text-red-500">{createPoolError}</p>
          )}

          <div className="flex justify-end gap-2">
            <QButton variant="ghost" onClick={() => {
              setShowAddPool(false);
              setCreatePoolError('');
            }}>Cancel</QButton>
            <QButton onClick={handleCreatePool}>Create</QButton>
          </div>
        </div>
      </Modal>

      {pools.length === 0 && (
        <QCard className="py-12 text-center">
          <p className="text-stone-500 font-semibold">No trip fund yet. Create one to start collecting money from your group.</p>
        </QCard>
      )}

      <div className="space-y-4">
        {pools.map(pool => {
          const poolCollected = pool.members.reduce((sum, member) => sum + member.totalPaid, 0);
          const remaining = Math.max(0, pool.targetAmount - poolCollected);

          return (
            <TripPoolCard
              key={pool.id}
              pool={pool}
              poolCollected={poolCollected}
              remaining={remaining}
              onDelete={() => onDeletePool(pool.id)}
              onUpdatePool={onUpdatePool}
              onUpdatePoolField={updatePoolField}
              onAddMember={addMember}
              onRemoveMember={removeMember}
              onAddPayment={addPayment}
              onChargeOneMember={chargeOneMember}
              onChargeAllMembersNow={chargeAllMembersNow}
            />
          );
        })}
      </div>
    </div>
  );
};

const TripPoolCard: React.FC<{
  pool: TripPool;
  poolCollected: number;
  remaining: number;
  onDelete: () => void;
  onUpdatePool: (pool: TripPool) => void;
  onUpdatePoolField: (pool: TripPool, field: keyof TripPool, value: string | number | boolean) => void;
  onAddMember: (pool: TripPool, memberName: string) => void;
  onRemoveMember: (pool: TripPool, memberId: string) => void;
  onAddPayment: (pool: TripPool, memberId: string, amount: number) => void;
  onChargeOneMember: (pool: TripPool, memberId: string, amount: number) => void;
  onChargeAllMembersNow: (pool: TripPool) => void;
}> = ({
  pool,
  poolCollected,
  remaining,
  onDelete,
  onUpdatePool,
  onUpdatePoolField,
  onAddMember,
  onRemoveMember,
  onAddPayment,
  onChargeOneMember,
  onChargeAllMembersNow,
}) => {
  const [memberName, setMemberName] = useState('');
  const [incrementInput, setIncrementInput] = useState(String(pool.incrementAmount));
  const [autoChargeInput, setAutoChargeInput] = useState(String(pool.autoChargeAmount));
  const [customTargetMember, setCustomTargetMember] = useState<{ id: string; name: string } | null>(null);
  const [customPaymentAmount, setCustomPaymentAmount] = useState(String(Math.max(50, pool.incrementAmount || 50)));
  const [editMemberForm, setEditMemberForm] = useState<{
    id: string;
    name: string;
    charged: string;
    paid: string;
    error: string;
  } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<
    | { type: 'delete-trip' }
    | { type: 'charge-all' }
    | { type: 'remove-member'; memberId: string; memberName: string }
    | { type: 'charge-member'; memberId: string; memberName: string; amount: number }
    | { type: 'custom-pay'; memberId: string; memberName: string; amount: number }
    | { type: 'end-trip' }
    | { type: 'reopen-trip' }
    | null
  >(null);

  useEffect(() => {
    setIncrementInput(String(pool.incrementAmount));
    setAutoChargeInput(String(pool.autoChargeAmount));
  }, [pool.id, pool.incrementAmount, pool.autoChargeAmount]);

  useEffect(() => {
    setCustomPaymentAmount(String(Math.max(50, pool.incrementAmount || 50)));
  }, [pool.incrementAmount]);

  const progress = Math.min(100, Math.round((poolCollected / (pool.targetAmount || 1)) * 100));
  const getChargeAllRunCount = () => {
    if (!pool.autoChargeEnabled) return 1;
    const anchor = pool.lastAutoChargeAt || pool.chargeStartDate || pool.createdAt;
    return Math.max(1, calculateWeeksSince(anchor));
  };

  const getConfirmCopy = () => {
    if (!pendingConfirm) return null;

    if (pendingConfirm.type === 'delete-trip') {
      return {
        title: 'Delete Trip Fund?',
        message: 'This removes the whole trip and all member tracking records for it.',
        confirmText: 'Yes, Delete',
        variant: 'danger' as const,
      };
    }

    if (pendingConfirm.type === 'charge-all') {
      const chargeAllRuns = getChargeAllRunCount();
      const perRunAmount = Math.max(50, pool.autoChargeAmount || 50);
      const totalCatchupCharge = chargeAllRuns * perRunAmount;
      return {
        title: 'Charge Everyone?',
        message: `Apply -₱${totalCatchupCharge} (${chargeAllRuns} week${chargeAllRuns > 1 ? 's' : ''} × ₱${perRunAmount}) to all members in this trip?`,
        confirmText: 'Yes, Charge All',
        variant: 'primary' as const,
      };
    }

    if (pendingConfirm.type === 'end-trip') {
      return {
        title: 'End Trip?',
        message: 'This will mark the trip as ended and pause auto-charges. You can still settle balances.',
        confirmText: 'Yes, End Trip',
        variant: 'primary' as const,
      };
    }
    
    if (pendingConfirm.type === 'reopen-trip') {
      return {
        title: 'Reopen Trip?',
        message: 'This will reopen the trip and resume operations.',
        confirmText: 'Yes, Reopen',
        variant: 'primary' as const,
      };
    }

    if (pendingConfirm.type === 'remove-member') {
      return {
        title: 'Remove Member?',
        message: `${pendingConfirm.memberName} will be removed from this trip tracking list.`,
        confirmText: 'Yes, Remove',
        variant: 'danger' as const,
      };
    }

    if (pendingConfirm.type === 'charge-member') {
      return {
        title: 'Confirm Charge',
        message: `Apply a -₱${pendingConfirm.amount} charge to ${pendingConfirm.memberName}?`,
        confirmText: 'Yes, Charge',
        variant: 'primary' as const,
      };
    }

    return {
      title: 'Confirm Custom Payment',
      message: `Add a ₱${pendingConfirm.amount} payment for ${pendingConfirm.memberName}?`,
      confirmText: 'Yes, Add Payment',
      variant: 'primary' as const,
    };
  };

  const executePendingConfirm = () => {
    if (!pendingConfirm) return;

    if (pendingConfirm.type === 'delete-trip') {
      onDelete();
      return;
    }

    if (pendingConfirm.type === 'charge-all') {
      onChargeAllMembersNow(pool);
      return;
    }

    if (pendingConfirm.type === 'end-trip') {
      onUpdatePoolField(pool, 'isEnded', true);
      return;
    }

    if (pendingConfirm.type === 'reopen-trip') {
      onUpdatePoolField(pool, 'isEnded', false);
      return;
    }

    if (pendingConfirm.type === 'remove-member') {
      onRemoveMember(pool, pendingConfirm.memberId);
      return;
    }

    if (pendingConfirm.type === 'charge-member') {
      onChargeOneMember(pool, pendingConfirm.memberId, pendingConfirm.amount);
      return;
    }

    onAddPayment(pool, pendingConfirm.memberId, pendingConfirm.amount);
  };

  const confirmCopy = getConfirmCopy();

  const saveEditedMember = () => {
    if (!editMemberForm) return;

    const trimmedName = editMemberForm.name.trim();
    if (!trimmedName) {
      setEditMemberForm(prev => prev ? { ...prev, error: 'Member name is required.' } : prev);
      return;
    }

    const chargedValue = Number(editMemberForm.charged);
    const paidValue = Number(editMemberForm.paid);
    const charged = Number.isFinite(chargedValue) ? Math.max(0, chargedValue) : 0;
    const paid = Number.isFinite(paidValue) ? Math.max(0, paidValue) : 0;

    onUpdatePool({
      ...pool,
      members: pool.members.map(member =>
        member.id === editMemberForm.id
          ? {
            ...member,
            name: trimmedName,
            balance: -charged,
            totalPaid: paid,
          }
          : member
      ),
    });

    setEditMemberForm(null);
  };

  return (
    <QCard className={`border-b-4 border-r-4 ${pool.isEnded ? 'opacity-80' : ''}`}>
      <ConfirmModal
        isOpen={!!pendingConfirm}
        onClose={() => setPendingConfirm(null)}
        onConfirm={() => {
          executePendingConfirm();
          setPendingConfirm(null);
        }}
        title={confirmCopy?.title || 'Please Confirm'}
        message={confirmCopy?.message || 'Are you sure you want to continue?'}
        confirmText={confirmCopy?.confirmText || 'Confirm'}
        variant={confirmCopy?.variant || 'primary'}
      />

      <Modal
        isOpen={!!customTargetMember}
        onClose={() => setCustomTargetMember(null)}
        title={customTargetMember ? `Custom Payment - ${customTargetMember.name}` : 'Custom Payment'}
      >
        <div className="space-y-4">
          <QInput
            label="Amount (min 50)"
            type="number"
            min={50}
            step={50}
            value={customPaymentAmount}
            onChange={e => setCustomPaymentAmount(e.target.value)}
            onBlur={() => setCustomPaymentAmount(String(parseAtLeast(customPaymentAmount, 50, Math.max(50, pool.incrementAmount || 50))))}
          />
          <div className="flex justify-end gap-2">
            <QButton variant="ghost" onClick={() => setCustomTargetMember(null)}>Cancel</QButton>
            <QButton
              onClick={() => {
                if (!customTargetMember) return;
                setPendingConfirm({
                  type: 'custom-pay',
                  memberId: customTargetMember.id,
                  memberName: customTargetMember.name,
                  amount: parseAtLeast(customPaymentAmount, 50, Math.max(50, pool.incrementAmount || 50)),
                });
                setCustomTargetMember(null);
              }}
            >
              Add Payment
            </QButton>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!editMemberForm}
        onClose={() => setEditMemberForm(null)}
        title={editMemberForm ? `Edit Member - ${editMemberForm.name}` : 'Edit Member'}
      >
        <div className="space-y-4">
          <QInput
            label="Member Name"
            value={editMemberForm?.name || ''}
            onChange={e => setEditMemberForm(prev => prev ? { ...prev, name: e.target.value, error: '' } : prev)}
          />
          <QInput
            label="Charged Amount"
            type="number"
            min={0}
            value={editMemberForm?.charged || '0'}
            onChange={e => setEditMemberForm(prev => prev ? { ...prev, charged: e.target.value } : prev)}
          />
          <QInput
            label="Paid Amount"
            type="number"
            min={0}
            value={editMemberForm?.paid || '0'}
            onChange={e => setEditMemberForm(prev => prev ? { ...prev, paid: e.target.value } : prev)}
          />

          {editMemberForm?.error && (
            <p className="text-sm font-bold text-red-500">{editMemberForm.error}</p>
          )}

          <div className="flex justify-end gap-2">
            <QButton variant="ghost" onClick={() => setEditMemberForm(null)}>Cancel</QButton>
            <QButton onClick={saveEditedMember}>Save Changes</QButton>
          </div>
        </div>
      </Modal>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-stone-800 dark:text-stone-100 tracking-tight flex items-center gap-2 flex-wrap">
            {pool.name}
            {pool.isEnded && (
              <span className="text-[10px] bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 px-2 py-1 rounded-md uppercase tracking-widest font-bold">
                Ended
              </span>
            )}
          </h3>
          <p className="text-xs text-stone-500 uppercase tracking-widest mt-1">
            Target ₱{pool.targetAmount.toLocaleString()} · Remaining ₱{remaining.toLocaleString()}
          </p>
          {pool.autoChargeEnabled && !pool.isEnded && (
            <p className="text-xs text-stone-400 uppercase tracking-widest mt-2 font-bold flex flex-wrap items-center gap-1">
              Week {calculateWeeksSince(pool.chargeStartDate) + 1} · {pool.autoChargeWeekday === new Date().getDay() ? <span className="inline-flex items-center gap-1 text-stone-800 dark:text-stone-200"><Pin size={12} /> Charge Day Today</span> : `Next charge: ${WEEKDAY_OPTIONS.find(w => w.value === pool.autoChargeWeekday)?.label}`}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          {!pool.isEnded ? (
            <QButton variant="secondary" onClick={() => setPendingConfirm({ type: 'end-trip' })}>
              <CheckCircle size={16} />
              End Trip
            </QButton>
          ) : (
            <QButton variant="secondary" onClick={() => setPendingConfirm({ type: 'reopen-trip' })}>
              <RotateCcw size={16} />
              Reopen
            </QButton>
          )}
          {!pool.isEnded && (
            <QButton variant="secondary" onClick={() => setPendingConfirm({ type: 'charge-all' })}>
              <MinusCircle size={16} />
              Charge All Now
            </QButton>
          )}
          <QButton variant="danger" onClick={() => setPendingConfirm({ type: 'delete-trip' })}>
            <Trash2 size={16} />
            Delete
          </QButton>
        </div>
      </div>

      <div className="mt-5">
        <div className="h-3 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
          <div className="h-full bg-stone-700 dark:bg-stone-300 transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="mt-2 text-xs font-bold text-stone-500 uppercase tracking-wider">
          Progress {progress}% · Collected ₱{poolCollected.toLocaleString()}
        </div>
      </div>

      {!pool.isEnded && (
        <>
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-4 border-t border-stone-200 dark:border-stone-800 pt-4">
            <QInput
              label="Quick Add Amount (min 50)"
              type="number"
              min={50}
              step={50}
              value={incrementInput}
              onChange={e => setIncrementInput(e.target.value)}
              onBlur={() => {
                const normalized = parseAtLeast(incrementInput, 50, pool.incrementAmount);
                setIncrementInput(String(normalized));
                onUpdatePoolField(pool, 'incrementAmount', normalized);
              }}
            />

            <div className={!pool.autoChargeEnabled ? 'opacity-50 pointer-events-none select-none' : ''}>
              <QInput
                label="Auto Charge Amount"
                type="number"
                min={50}
                step={50}
                value={autoChargeInput}
                disabled={!pool.autoChargeEnabled}
                onChange={e => setAutoChargeInput(e.target.value)}
                onBlur={() => {
                  const normalized = parseAtLeast(autoChargeInput, 50, pool.autoChargeAmount);
                  setAutoChargeInput(String(normalized));
                  onUpdatePoolField(pool, 'autoChargeAmount', normalized);
                }}
              />
            </div>

            <div className={!pool.autoChargeEnabled ? 'opacity-50 pointer-events-none select-none' : ''}>
              <QSelect
                label="Weekly Charge Day"
                value={pool.autoChargeWeekday}
                disabled={!pool.autoChargeEnabled}
                onChange={e => onUpdatePoolField(pool, 'autoChargeWeekday', Number(e.target.value))}
              >
                {WEEKDAY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </QSelect>
            </div>

            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
                <input
                  type="checkbox"
                  checked={pool.autoChargeEnabled}
                  onChange={e => onUpdatePoolField(pool, 'autoChargeEnabled', e.target.checked)}
                />
                Auto weekly charge
              </label>
            </div>
          </div>

          <div className="mt-6 border-t border-stone-200 dark:border-stone-800 pt-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-end">
              <QInput
                label="Add Member"
                value={memberName}
                onChange={e => setMemberName(e.target.value)}
                placeholder="e.g. Mark"
              />
              <QButton
                className="h-[42px]"
                onClick={() => {
                  onAddMember(pool, memberName);
                  setMemberName('');
                }}
              >
                <Plus size={16} />
                Add Person
              </QButton>
            </div>
          </div>
        </>
      )}

      <div className={`mt-4 space-y-2 max-h-[30rem] overflow-y-auto pr-1 ${pool.isEnded ? 'border-t border-stone-200 dark:border-stone-800 pt-4' : ''}`}>
          {pool.members.length === 0 && (
            <p className="text-sm text-stone-400 italic">No members yet.</p>
          )}

          {[...pool.members]
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
            .map(member => {
            const quickAmount = Math.max(50, pool.incrementAmount || 50);
            const chargeAmount = Math.max(50, pool.autoChargeAmount || 50);

            return (
              <div key={member.id} className="relative p-3 rounded-xl bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-center">
                <button
                  type="button"
                  className="absolute top-2 right-2 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 transition-colors"
                  onClick={() => setEditMemberForm({
                    id: member.id,
                    name: member.name,
                    charged: String(Math.max(0, Math.abs(member.balance))),
                    paid: String(Math.max(0, member.totalPaid)),
                    error: '',
                  })}
                  title={`Edit ${member.name}`}
                  aria-label={`Edit ${member.name}`}
                >
                  <Pencil size={14} />
                </button>
                <div className="min-w-0">
                  <p className="font-bold text-stone-800 dark:text-stone-100">{member.name}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-500">
                    Charged: ₱{Math.abs(member.balance).toLocaleString()}
                  </p>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Paid: ₱{member.totalPaid.toLocaleString()}
                  </p>
                  <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${member.totalPaid >= Math.abs(member.balance) ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {member.totalPaid >= Math.abs(member.balance) ? `Settled ✓` : `Still Owes: ₱${(Math.abs(member.balance) - member.totalPaid).toLocaleString()}`}
                  </p>
                  {!pool.isEnded && pool.autoChargeEnabled && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[11px] text-stone-400 font-medium">
                        {Math.abs(member.balance) > 0 ? `${Math.round(Math.abs(member.balance) / Math.max(50, pool.autoChargeAmount || 50))} weeks of charges` : 'Caught up'}
                      </p>
                      {(() => {
                        const weeksElapsed = calculateWeeksSince(pool.chargeStartDate);
                        const chargeAmountForCalc = Math.max(50, pool.autoChargeAmount || 50);
                        const weeksPaidFor = Math.floor(member.totalPaid / chargeAmountForCalc);
                        const weeksBehind = weeksElapsed - weeksPaidFor;
                        
                        return (
                          <p className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                            weeksBehind > 0 ? 'text-red-500' : weeksBehind < 0 ? 'text-emerald-500' : 'text-stone-400'
                          }`}>
                            {weeksBehind > 0 ? <><TriangleAlert size={12} /> {weeksBehind} weeks behind</> : weeksBehind < 0 ? `✓ ${Math.abs(weeksBehind)} weeks ahead` : '✓ On schedule'}
                          </p>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-[auto_auto_auto_auto] gap-2 items-center">
                  <QButton className="h-10 px-4" onClick={() => onAddPayment(pool, member.id, quickAmount)}>
                    +₱{quickAmount}
                  </QButton>

                  <QButton
                    className="h-10 px-4"
                    variant="secondary"
                    onClick={() => {
                      setCustomTargetMember({ id: member.id, name: member.name });
                      setCustomPaymentAmount(String(quickAmount));
                    }}
                  >
                    Custom
                  </QButton>

                  {!pool.isEnded && (
                    <QButton
                      className="h-10 px-4"
                      variant="secondary"
                      onClick={() => setPendingConfirm({ type: 'charge-member', memberId: member.id, memberName: member.name, amount: chargeAmount })}
                    >
                      Charge -₱{chargeAmount}
                    </QButton>
                  )}

                  {!pool.isEnded && (
                    <QButton
                      className="h-10 px-4"
                      variant="danger"
                      onClick={() => setPendingConfirm({ type: 'remove-member', memberId: member.id, memberName: member.name })}
                    >
                      Remove
                    </QButton>
                  )}
                </div>
              </div>
            );
            })}
        </div>
    </QCard>
  );
};

export default Trips;
