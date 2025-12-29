
import React, { useState, useEffect } from 'react';
import { AppState, ViewState, Transaction, Budget, UserProfile, CATEGORIES, THEME_COLORS, WishlistItem, TransactionType } from './types';
import { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabaseClient';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Budgets from './components/Budgets';
import Wishlist from './components/Wishlist';
import SmartAdvisor from './components/SmartAdvisor';
import { QButton } from './components/UI/QuirkyComponents';
import { LayoutDashboard, Receipt, PieChart, BrainCircuit, Moon, Sun, Shield, Gift, LogOut } from 'lucide-react';
import VantaBackground from './components/UI/VantaBackground';

const PrivacyModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-stone-900 p-8 rounded-tl-3xl rounded-br-[60px] max-w-md w-full shadow-2xl border-b-8 border-r-8 border-stone-800 dark:border-stone-100">
      <h2 className="text-2xl font-black mb-4 uppercase tracking-tighter italic">BETA Confidential</h2>
      <div className="prose dark:prose-invert text-sm text-stone-600 dark:text-stone-400 space-y-4 mb-8 font-medium">
        <p>1. <span className="font-bold">Secure Cloud:</span> Your data is safely stored in the cloud using Supabase. We don't snoop on your bank statements or your midnight snack purchases.</p>
        <p>2. <span className="font-bold">AI Usage:</span> Receipt scanning and smart advice uses Google Gemini. They see the data you send, but we don't keep it.</p>
        <p>3. <span className="font-bold">No Warranties:</span> We're an evaluator tool. Don't take our "Smart Advisor" as legal financial advice. We're just a bunch of pixels.</p>
      </div>
      <QButton onClick={onClose} className="w-full py-4 text-lg">Got it.</QButton>
    </div>
  </div>
);

const TutorialModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to BETA",
      desc: "Your new financial command center. Let's get you oriented.",
      icon: <div className="w-16 h-16 bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 flex items-center justify-center rounded-2xl transform -rotate-3 mb-4"><span className="font-black font-serif text-3xl">B</span></div>
    },
    {
      title: "Pulse (Dashboard)",
      desc: "Visible via the Layout icon. This is your high-level overview. Track income, expenses, and check your financial heartbeat at a glance.",
      icon: <LayoutDashboard size={64} className="text-stone-700 dark:text-stone-200 mb-4" />
    },
    {
      title: "Ledger (Transactions)",
      desc: "Found at the Receipt icon. Record every peso in and out. Tag them, sort them, and keep your records straight.",
      icon: <Receipt size={64} className="text-stone-700 dark:text-stone-200 mb-4" />
    },
    {
      title: "Allocations (Budgets)",
      desc: "The Pie Chart icon. Give every peso a job. Set limits for categories and make sure you don't overspend.",
      icon: <PieChart size={64} className="text-stone-700 dark:text-stone-200 mb-4" />
    },
    {
      title: "Wishlist",
      desc: "The Gift icon. See something you want? add it here. Prioritize your wants and turn them into goals.",
      icon: <Gift size={64} className="text-stone-700 dark:text-stone-200 mb-4" />
    },
    {
      title: "Oracle (Smart Advisor)",
      desc: "The Brain/Circuit icon. Need advice? Our AI analyzes your spending habits and gives you actionable tips.",
      icon: <BrainCircuit size={64} className="text-stone-700 dark:text-stone-200 mb-4" />
    }
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 bg-stone-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-stone-900 p-8 rounded-2xl max-w-sm w-full shadow-2xl border-2 border-stone-200 dark:border-stone-700 flex flex-col items-center text-center relative overflow-hidden">

        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-2 bg-stone-100 dark:bg-stone-800">
          <div
            className="h-full bg-stone-800 dark:bg-stone-100 transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="mt-6 animate-in slide-in-from-right-4 fade-in duration-300" key={step}>
          {currentStep.icon}
        </div>

        <h3 className="text-2xl font-black uppercase tracking-tighter mb-2 text-stone-800 dark:text-stone-100">{currentStep.title}</h3>
        <p className="text-stone-500 dark:text-stone-400 font-medium leading-relaxed mb-8">{currentStep.desc}</p>

        <div className="flex gap-2 w-full">
          {step > 0 && (
            <QButton variant="secondary" onClick={() => setStep(s => s - 1)} className="flex-1">Previous</QButton>
          )}
          <QButton
            onClick={() => {
              if (step < steps.length - 1) setStep(s => s + 1);
              else onClose();
            }}
            className="flex-1"
          >
            {step < steps.length - 1 ? "Next" : "Let's Start"}
          </QButton>
        </div>

        <div className="mt-4 flex gap-1">
          {steps.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-stone-800 dark:bg-stone-100' : 'bg-stone-300 dark:bg-stone-700'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  const [state, setState] = useState<AppState>({
    transactions: [],
    budgets: [],
    wishlist: [],
    user: { name: 'Guest', email: '', currency: 'PHP' },
    darkMode: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: transactions } = await supabase.from('transactions').select('*').order('date', { ascending: false }).order('order_index', { ascending: true });
      const { data: budgets } = await supabase.from('budgets').select('*');
      const { data: wishlist } = await supabase.from('wishlist_items').select('*');
      const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();

      setState(prev => ({
        ...prev,
        transactions: transactions as Transaction[] || [],
        budgets: budgets as Budget[] || [],
        wishlist: wishlist as WishlistItem[] || [],
        user: profile ? { name: profile.name, email: profile.email, currency: profile.currency } : prev.user
      }));

      // Check for empty state to trigger tutorial
      if ((!transactions || transactions.length === 0) && (!budgets || budgets.length === 0)) {
        // We can also check localStorage to see if they've already seen it, but "detection that user still has not put anything" creates a natural guard.
        // If they add data, this check fails next time.
        setShowTutorial(true);
      }
    };
    /* ... (rest of useEffect logic remains same, just ensuring fetch includes wishlist) ... */
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchData();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchData();
      else setState(prev => ({ ...prev, transactions: [], budgets: [], wishlist: [] }));
    });
    return () => subscription.unsubscribe();
  }, []);

  /* ... theme logic ... */

  const addWishlist = async (item: WishlistItem) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('wishlist_items').upsert({
        ...item,
        user_id: user.id
      });
      if (error) console.error(error);
      else setState(prev => ({ ...prev, wishlist: [...prev.wishlist, item] }));
    }
  };



  const updateWishlist = async (items: WishlistItem[]) => {
    // Optimistic update
    setState(prev => ({ ...prev, wishlist: items }));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Prepare updates with order_index
    // Since we just added the column, we can update it.
    // Upserting the whole list is heaviest but easiest given no order_id unique constraint issues usually
    const itemsWithUser = items.map((item, index) => ({
      ...item,
      user_id: user.id,
      order_index: index
    }));

    const { error } = await supabase.from('wishlist_items').upsert(itemsWithUser);
    if (error) console.error("Error updating wishlist order:", error);
  };

  const promoteToBudget = async (item: WishlistItem) => {
    // 1. Create a Budget from Wishlist Item
    const newBudget: Budget = {
      id: crypto.randomUUID(),
      category: item.name,
      limit: item.amount,
      color: '#78716c', // Default color (Stone)
    };

    // Upsert budget
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('budgets').insert({ ...newBudget, user_id: user.id });

      if (!error) {
        // 2. Remove from Wishlist
        await commitDeleteWishlist(item.id);
        // 3. Update local state
        setState(prev => ({
          ...prev,
          budgets: [...prev.budgets, newBudget]
        }));
        // 4. Switch view to budgets to see it
        setCurrentView('budgets');
      } else {
        console.error("Failed to promote:", error);
      }
    }
  };

  /* ... transaction/budget handlers ... */

  // Calculate Unallocated for Wishlist View
  const income = state.transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((acc, t) => acc + t.amount, 0);
  const totalAllocated = state.budgets.reduce((acc, b) => acc + b.limit, 0);
  const unallocated = income - totalAllocated;

  /* ... NavItem definitions ... */

  // In the sidebar nav:
  // <NavItem view="wishlist" icon={Gift} label="Wishlist" /> 
  // (I will inject this in the replacement block below)

  // In the main render:
  // {currentView === 'wishlist' && <Wishlist wishlist={state.wishlist} unallocatedCash={unallocated} onAdd={addWishlist} onDelete={deleteWishlist} onPromote={promoteToBudget} />}


  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

  const toggleTheme = () => setState(prev => ({ ...prev, darkMode: !prev.darkMode }));

  const addTransaction = async (t: Transaction) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('transactions').upsert({
        ...t,
        user_id: user.id,
        order_index: 0 // New transactions at top
      });
      if (error) console.error("Error saving transaction:", error);
      else {
        setState(prev => {
          const exists = prev.transactions.some(existing => existing.id === t.id);
          let newTransactions = exists
            ? prev.transactions.map(existing => existing.id === t.id ? { ...t, order_index: existing.order_index } : existing)
            : [...prev.transactions, { ...t, order_index: 0 }];

          // Sort transactions by date descending, then order_index ascending
          newTransactions.sort((a, b) => {
            const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
            if (dateDiff !== 0) return dateDiff;
            return (a.order_index || 0) - (b.order_index || 0);
          });

          return {
            ...prev,
            transactions: newTransactions
          };
        });
      }
    }
  };

  // --- Global Delete Queues ---

  // 1. Budgets
  const [pendingBudgetDeletes, setPendingBudgetDeletes] = useState<Record<string, number>>({});
  const budgetDeleteTimers = React.useRef<Record<string, NodeJS.Timeout>>({});

  const queueDeleteBudget = (id: string) => {
    const deadline = Date.now() + 20000;
    setPendingBudgetDeletes(prev => ({ ...prev, [id]: deadline }));
    if (budgetDeleteTimers.current[id]) clearTimeout(budgetDeleteTimers.current[id]);
    budgetDeleteTimers.current[id] = setTimeout(() => commitDeleteBudget(id), 20000);
  };

  const undoDeleteBudget = (id: string) => {
    if (budgetDeleteTimers.current[id]) {
      clearTimeout(budgetDeleteTimers.current[id]);
      delete budgetDeleteTimers.current[id];
    }
    setPendingBudgetDeletes(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const commitDeleteBudget = async (id: string) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (!error) setState(prev => ({ ...prev, budgets: prev.budgets.filter(b => b.id !== id) }));
    undoDeleteBudget(id); // Cleanup state
  };

  // 2. Transactions
  const [pendingTransactionDeletes, setPendingTransactionDeletes] = useState<Record<string, number>>({});
  const transactionDeleteTimers = React.useRef<Record<string, NodeJS.Timeout>>({});

  const queueDeleteTransaction = (id: string) => {
    const deadline = Date.now() + 20000;
    setPendingTransactionDeletes(prev => ({ ...prev, [id]: deadline }));
    if (transactionDeleteTimers.current[id]) clearTimeout(transactionDeleteTimers.current[id]);
    transactionDeleteTimers.current[id] = setTimeout(() => commitDeleteTransaction(id), 20000);
  };

  const undoDeleteTransaction = (id: string) => {
    if (transactionDeleteTimers.current[id]) {
      clearTimeout(transactionDeleteTimers.current[id]);
      delete transactionDeleteTimers.current[id];
    }
    setPendingTransactionDeletes(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const commitDeleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) setState(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
    undoDeleteTransaction(id); // Cleanup state
  };

  // 3. Wishlist
  const [pendingWishlistDeletes, setPendingWishlistDeletes] = useState<Record<string, number>>({});
  const wishlistDeleteTimers = React.useRef<Record<string, NodeJS.Timeout>>({});

  const queueDeleteWishlist = (id: string) => {
    const deadline = Date.now() + 20000;
    setPendingWishlistDeletes(prev => ({ ...prev, [id]: deadline }));
    if (wishlistDeleteTimers.current[id]) clearTimeout(wishlistDeleteTimers.current[id]);
    wishlistDeleteTimers.current[id] = setTimeout(() => commitDeleteWishlist(id), 20000);
  };

  const undoDeleteWishlist = (id: string) => {
    if (wishlistDeleteTimers.current[id]) {
      clearTimeout(wishlistDeleteTimers.current[id]);
      delete wishlistDeleteTimers.current[id];
    }
    setPendingWishlistDeletes(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const commitDeleteWishlist = async (id: string) => {
    const { error } = await supabase.from('wishlist_items').delete().eq('id', id);
    if (!error) setState(prev => ({ ...prev, wishlist: prev.wishlist.filter(i => i.id !== id) }));
    undoDeleteWishlist(id); // Cleanup state
  };

  const handleReorder = async (newTransactions: Transaction[]) => {
    // 1. Optimistic Update
    setState(prev => ({ ...prev, transactions: newTransactions }));

    // 2. Identify dirty items (order changed)
    // We compare the new index in the array against the existing property 'order_index'
    const updates = newTransactions.map((t, index) => ({ id: t.id, order_index: index }))
      // Only update if the index is actually different from what we had
      // (Note: we check against the prop value, assuming the passed 'newTransactions' hasn't had props updated yet, just array position)
      .filter((u) => {
        const original = state.transactions.find(t => t.id === u.id);
        return original && original.order_index !== u.order_index;
      });

    if (updates.length === 0) return;

    // 3. Persist modifications
    // Using Promise.all for parallel updates. For small lists this is fine.
    try {
      await Promise.all(updates.map(u =>
        supabase.from('transactions').update({ order_index: u.order_index }).eq('id', u.id)
      ));
    } catch (err) {
      console.error("Failed to persist reorder:", err);
      // Ideally revert optimistic update here, but for now we let it slide or refresh on next load
    }
  };

  const updateBudgets = async (budgets: Budget[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Upsert budgets. This is a bit simplistic, might need more robust handling
      const budgetsWithUser = budgets.map(b => ({ ...b, user_id: user.id }));
      const { error } = await supabase.from('budgets').upsert(budgetsWithUser);
      if (error) console.error("Error updating budgets:", error);
      else setState(prev => ({ ...prev, budgets }));
    }
  };



  // Keep the original deleteBudget for immediate deletions if needed, but rename or remove
  // We will force Budgets.tsx to use queueDeleteBudget


  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`relative flex items-center h-12 px-3 w-full text-left transition-all duration-200 rounded-xl group/item overflow-hidden whitespace-nowrap
        ${currentView === view
          ? 'bg-stone-800 text-stone-100 dark:bg-stone-100 dark:text-stone-900 shadow-md'
          : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-200'
        }`}
    >
      <div className="min-w-[1.5rem] flex justify-center">
        <Icon size={20} strokeWidth={currentView === view ? 3 : 2} />
      </div>
      <span className={`ml-4 font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75`}>
        {label}
      </span>
      {currentView === view && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-current rounded-r-full group-hover:block hidden md:hidden"></div>
      )}
    </button>
  );

  const MobileNavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200
        ${currentView === view
          ? 'text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-800'
          : 'text-stone-400 dark:text-stone-500'
        }`}
    >
      <Icon size={24} strokeWidth={currentView === view ? 2.5 : 2} />
      <span className="text-[10px] font-bold uppercase tracking-wide mt-1">{label}</span>
    </button>
  );

  if (!session) {
    return <Auth />;
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row bg-stone-50 dark:bg-stone-950 transition-colors duration-500`}>
      {/* Mobile Header */}
      <header className="md:hidden flex justify-between items-center p-6 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 sticky top-0 z-50">
        <div className="flex items-center gap-1">
          <div className="w-8 h-8 bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 flex items-center justify-center rounded-lg transform -rotate-6">
            <span className="font-black font-serif">B</span>
          </div>
          <span className="font-black text-xl tracking-tighter text-stone-900 dark:text-stone-100">ETA</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowPrivacy(true)}
            className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg"
          >
            <Shield size={20} />
          </button>
          <button onClick={toggleTheme} className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg">
            {state.darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg ml-1"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar (Fixed Overlay) */}
      <aside className="hidden md:flex flex-col h-screen fixed top-0 left-0 z-50 bg-stone-100 dark:bg-stone-900 border-r-2 border-stone-200 dark:border-stone-800 transition-[width] duration-300 ease-in-out w-20 hover:w-64 group overflow-hidden shadow-2xl">
        <div className="p-6 h-20 flex items-center overflow-hidden whitespace-nowrap flex-shrink-0">
          <div className="min-w-[2.5rem] h-10 flex items-center justify-center">
            <div className="w-10 h-10 bg-stone-800 dark:bg-stone-200 text-stone-100 dark:text-stone-900 flex items-center justify-center rounded-tl-[15px] rounded-br-[25px] transform -rotate-6 shadow-sm">
              <span className="font-black text-xl font-serif">B</span>
            </div>
          </div>
          <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
            <h1 className="text-2xl font-black tracking-tighter text-stone-900 dark:text-stone-100">ETA</h1>
            <p className="text-[8px] text-stone-400 font-bold uppercase tracking-widest leading-tight">Budget Eval Tracking</p>
          </div>
        </div>

        <nav className="flex-1 px-4 mt-4 space-y-2 overflow-y-auto overflow-x-hidden no-scrollbar">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Pulse" />
          <NavItem view="transactions" icon={Receipt} label="Ledger" />
          <NavItem view="budgets" icon={PieChart} label="Allocations" />
          <NavItem view="wishlist" icon={Gift} label="Wishlist" />
          <NavItem view="advisor" icon={BrainCircuit} label="Oracle" />
        </nav>

        <div className="p-4 space-y-2 border-t-2 border-stone-200 dark:border-stone-800 overflow-hidden flex-shrink-0">
          <button
            onClick={() => setShowPrivacy(true)}
            className="flex items-center h-10 px-3 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors w-full"
          >
            <div className="min-w-[1.25rem] flex justify-center"><Shield size={20} /></div>
            <span className="ml-4 text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">Privacy</span>
          </button>

          <button
            onClick={toggleTheme}
            className="flex items-center h-10 px-3 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors w-full"
          >
            <div className="min-w-[1.25rem] flex justify-center">{state.darkMode ? <Sun size={20} /> : <Moon size={20} />}</div>
            <span className="ml-4 text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">{state.darkMode ? 'Day Mode' : 'Night Mode'}</span>
          </button>

          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center h-10 px-3 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors w-full group/logout"
          >
            <div className="min-w-[1.25rem] flex justify-center"><LogOut size={20} className="group-hover/logout:translate-x-1 transition-transform" /></div>
            <span className="ml-4 text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap group-hover/logout:text-red-600">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Spacer to reserve layout width for the collapsed sidebar */}
      <div className="hidden md:block w-20 flex-shrink-0" />


      <main className="flex-1 h-screen relative overflow-hidden z-0">
        <VantaBackground />
        <div className="absolute inset-0 overflow-y-auto p-4 md:p-10 pb-24 md:pb-10 z-10 scroll-smooth">
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700">
            {currentView === 'dashboard' && <Dashboard transactions={state.transactions} budgets={state.budgets} />}
            {currentView === 'transactions' && <Transactions transactions={state.transactions} budgets={state.budgets} onAdd={addTransaction} onDelete={queueDeleteTransaction} onReorder={handleReorder} pendingDeletes={pendingTransactionDeletes} onUndoDelete={undoDeleteTransaction} />}
            {currentView === 'budgets' && <Budgets budgets={state.budgets} transactions={state.transactions} onUpdateBudgets={updateBudgets} onDeleteBudget={queueDeleteBudget} pendingDeletes={pendingBudgetDeletes} onUndoDelete={undoDeleteBudget} />}
            {currentView === 'wishlist' && <Wishlist wishlist={state.wishlist} unallocatedCash={unallocated} onAdd={addWishlist} onDelete={queueDeleteWishlist} onPromote={promoteToBudget} onUpdateWishlist={updateWishlist} pendingDeletes={pendingWishlistDeletes} onUndoDelete={undoDeleteWishlist} />}
            {currentView === 'advisor' && <SmartAdvisor transactions={state.transactions} budgets={state.budgets} />}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 p-2 px-6 flex justify-between items-center z-50 pb-safe">
        <MobileNavItem view="dashboard" icon={LayoutDashboard} label="Pulse" />
        <MobileNavItem view="transactions" icon={Receipt} label="Ledger" />
        <MobileNavItem view="budgets" icon={PieChart} label="Allocations" />
        <MobileNavItem view="wishlist" icon={Gift} label="Wishlist" />
        <MobileNavItem view="advisor" icon={BrainCircuit} label="Oracle" />
      </nav>

      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
    </div >
  );
};

export default App;
