
import React, { useState, useEffect } from 'react';
import { AppState, ViewState, Transaction, Budget, UserProfile, CATEGORIES, THEME_COLORS } from './types';
import { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabaseClient';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Budgets from './components/Budgets';
import SmartAdvisor from './components/SmartAdvisor';
import { QButton } from './components/UI/QuirkyComponents';
import { LayoutDashboard, Receipt, PieChart, BrainCircuit, Moon, Sun, Shield } from 'lucide-react';

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

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  const [state, setState] = useState<AppState>({
    transactions: [],
    budgets: [],
    user: { name: 'Guest', email: '', currency: 'PHP' },
    darkMode: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // For now, if no user, we can't fetch personalized data. 
        // We could implement a simple anonymous sign-in here if needed.
        console.log("No user signed in");
        return;
      }

      const { data: transactions } = await supabase.from('transactions').select('*').order('date', { ascending: false }).order('order_index', { ascending: true });
      const { data: budgets } = await supabase.from('budgets').select('*');
      const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();

      setState(prev => ({
        ...prev,
        transactions: transactions as Transaction[] || [],
        budgets: budgets as Budget[] || [],
        user: profile ? { name: profile.name, email: profile.email, currency: profile.currency } : prev.user
      }));

    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchData();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchData();
      else setState(prev => ({ ...prev, transactions: [], budgets: [] }));
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) console.error("Error deleting transaction:", error);
    else setState(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
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

  const deleteBudget = async (id: string) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) console.error("Error deleting budget:", error);
    else setState(prev => ({ ...prev, budgets: prev.budgets.filter(b => b.id !== id) }));
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex items-center gap-3 px-4 py-3 w-full text-left transition-all duration-300 rounded-r-3xl rounded-l-md mb-2
        ${currentView === view
          ? 'bg-stone-800 text-stone-100 dark:bg-stone-100 dark:text-stone-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] translate-x-2'
          : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-200'
        }`}
    >
      <Icon size={18} strokeWidth={3} />
      <span className="font-black text-xs uppercase tracking-widest">{label}</span>
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
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 text-stone-500">
            {state.darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => setShowPrivacy(true)} className="p-2 text-stone-500">
            <Shield size={20} />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-stone-100 dark:bg-stone-900 border-r-2 border-stone-200 dark:border-stone-800 flex-col h-screen sticky top-0 z-40">
        <div className="p-8 pb-4">
          <h1 className="text-3xl font-black tracking-tighter text-stone-900 dark:text-stone-100 flex items-center gap-0.5">
            <div className="w-10 h-10 bg-stone-800 dark:bg-stone-200 text-stone-100 dark:text-stone-900 flex items-center justify-center rounded-tl-[15px] rounded-br-[25px] transform -rotate-6 shadow-sm mr-1">
              B
            </div>
            ETA
          </h1>
          <p className="text-[10px] text-stone-400 mt-2 font-black uppercase tracking-widest">Budget Evaluation Tracking App</p>
        </div>

        <nav className="flex-1 p-4 mt-4">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Pulse" />
          <NavItem view="transactions" icon={Receipt} label="Ledger" />
          <NavItem view="budgets" icon={PieChart} label="Allocations" />
          <NavItem view="advisor" icon={BrainCircuit} label="Oracle" />
        </nav>

        <div className="p-6 space-y-4 border-t-2 border-stone-200 dark:border-stone-800">
          <button
            onClick={() => setShowPrivacy(true)}
            className="flex items-center gap-3 px-4 py-1 text-stone-400 text-[10px] font-black uppercase tracking-widest hover:text-stone-800 dark:hover:text-stone-200 w-full"
          >
            <Shield size={14} /> Privacy
          </button>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-1 text-stone-400 text-[10px] font-black uppercase tracking-widest hover:text-stone-800 dark:hover:text-stone-200 w-full"
          >
            {state.darkMode ? <Sun size={14} /> : <Moon size={14} />}
            {state.darkMode ? 'Day' : 'Night'}
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-3 px-4 py-1 text-red-400 text-[10px] font-black uppercase tracking-widest hover:text-red-600 w-full"
          >
            <Shield size={14} /> Sign Out
          </button>
        </div>
      </aside>



      <main className="flex-1 p-4 md:p-10 pb-24 md:pb-10 overflow-y-auto h-screen bg-stone-50/50 dark:bg-stone-950">
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700">
          {currentView === 'dashboard' && <Dashboard transactions={state.transactions} budgets={state.budgets} />}
          {currentView === 'transactions' && <Transactions transactions={state.transactions} budgets={state.budgets} onAdd={addTransaction} onDelete={deleteTransaction} onReorder={handleReorder} />}
          {currentView === 'budgets' && <Budgets budgets={state.budgets} transactions={state.transactions} onUpdateBudgets={updateBudgets} onDeleteBudget={deleteBudget} />}
          {currentView === 'advisor' && <SmartAdvisor transactions={state.transactions} budgets={state.budgets} />}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 p-2 px-6 flex justify-between items-center z-50 pb-safe">
        <MobileNavItem view="dashboard" icon={LayoutDashboard} label="Pulse" />
        <MobileNavItem view="transactions" icon={Receipt} label="Ledger" />
        <MobileNavItem view="budgets" icon={PieChart} label="Allocations" />
        <MobileNavItem view="advisor" icon={BrainCircuit} label="Oracle" />
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex flex-col items-center justify-center p-2 rounded-xl text-stone-300 dark:text-stone-600 hover:text-red-500"
        >
          <Shield size={24} />
          <span className="text-[10px] font-bold uppercase tracking-wide mt-1">Exit</span>
        </button>
      </nav>

      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
    </div >
  );
};

export default App;
