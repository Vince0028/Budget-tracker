
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  vendor: string;
  type: TransactionType;
  description?: string;
  isRecurring?: boolean;
  receiptData?: string;
  order_index?: number;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  color: string;
}

export interface WishlistItem {
  id: string;
  user_id?: string;
  name: string;
  amount: number;
  priority: 'low' | 'medium' | 'high';
  link?: string;
  note?: string;
}

export interface TripMember {
  id: string;
  name: string;
  balance: number;
  totalPaid: number;
}

export interface TripPool {
  id: string;
  user_id?: string;
  name: string;
  targetAmount: number;
  incrementAmount: number;
  autoChargeEnabled: boolean;
  autoChargeAmount: number;
  autoChargeWeekday: number;
  chargeStartDate: string;
  lastAutoChargeAt?: string | null;
  createdAt: string;
  members: TripMember[];
  isEnded?: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  currency: string;
}

export interface AppState {
  transactions: Transaction[];
  budgets: Budget[];
  wishlist: WishlistItem[];
  tripPools: TripPool[];
  user: UserProfile;
  darkMode: boolean;
}

export type ViewState = 'dashboard' | 'transactions' | 'budgets' | 'advisor' | 'wishlist' | 'trips';


export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Housing',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Shopping',
  'Personal Care',
  'Education',
  'Travel',
  'Other'
];

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investment',
  'Gift',
  'Other'
];

export const CATEGORIES = Array.from(new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]));


export const THEME_COLORS = [
  '#78716c', // Stone
  '#65a30d', // Lime (Muted)
  '#0891b2', // Cyan (Muted)
  '#db2777', // Pink (Muted)
  '#ea580c', // Orange (Muted)
  '#4f46e5', // Indigo (Muted)
];