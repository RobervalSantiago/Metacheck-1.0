
export enum UserRole {
  ADMIN = 'admin',
  SALES = 'sales'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatar: string;
  mix: string;
  userCode?: string;
  industries?: string[];
  industryColors?: Record<string, string>;
  workingDates?: string[]; // Array of specific dates "YYYY-MM-DD" representing working days
}

export interface Client {
  id: string;
  code: string;
  name: string;
  city: string;
  visitDay?: string;
  lat?: number;
  lng?: number;
  createdAt?: string;
  frequency?: 'weekly' | 'odd_week' | 'even_week';
}

export interface Goal {
  userId: string;
  month: string;
  salesTarget: number;
  activationTarget: number;
  industryTargets?: Record<string, number>;
  industryCoverageTargets?: Record<string, number>;
}

export interface SaleLog {
  id: string;
  userId: string;
  timestamp: string;
  clientName: string;
  amount: number;
  items: string[];
}

export interface ActivationLog {
  id: string;
  userId: string;
  timestamp: string;
  clientName: string;
  location: { lat: number; lng: number } | null;
  photoUrl?: string;
  notes: string;
  checklist?: string[];
  saleValue?: number;
  saleValuePalm?: number;
  saleValueSite?: number;
}

export interface TaskState {
  id: string;
  label: string;
  checked: boolean;
}

export interface PED {
  id: string;
  name: string;
  period: 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual';
  items: string[];
  createdAt: string;
}

export interface ClientUIState {
  clientId: string;
  isExpanded: boolean;
  isSaved: boolean;
  tasks: TaskState[];
  industryTasks?: Record<string, TaskState[]>; // CycleKey -> List of tasks
  pedTasks?: Record<string, Record<string, string[]>>; // Maps PED ID -> PeriodKey -> checked items labels
  saleValue?: string;
  saleValuePalm?: string;
  saleValueSite?: string;
  lastOperation?: { type: 'palm' | 'site'; value: number };
  history?: { palm: string; site: string }[];
  future?: { palm: string; site: string }[];
}

export interface ComboItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  suggestedResalePrice?: number;
}

export interface Combo {
  id: string;
  name: string;
  tag?: string;
  items: ComboItem[];
  totalValue: number;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  clients: Client[];
  goals: Goal[];
  salesLogs: SaleLog[];
  activationLogs: ActivationLog[];
  clientStates: Record<string, ClientUIState>;
  peds: PED[];
  activePedIds: string[];
  negotiationLogs: NegotiationLog[];
  sellOutLogs: SellOutLog[];
}

export type View = 'dashboard' | 'admin' | 'clients' | 'profile' | 'negotiate' | 'peds';

export interface NegotiationLog {
  id: string;
  userId?: string;
  timestamp: number;
  clientName: string;
  productName: string;
  price: number;
  quantity: number;
  type: 'bonus' | 'discount';
  bonusQty: number;
  bonusType: 'same' | 'different';
  bonusProduct: string;
  bonusProductPrice: number;
  targetPrice: number;
}

export interface SellOutEntry {
  id: string;
  client: string;
  product: string;
  quantity: string;
  costPrice: string;
  validity: string;
  valuePerUnit: string;
}

export interface SellOutLog {
  id: string;
  userId?: string;
  timestamp: number;
  supervisor: string;
  consultor: string;
  period: string;
  reason: string;
  observation: string;
  entries: SellOutEntry[];
}
