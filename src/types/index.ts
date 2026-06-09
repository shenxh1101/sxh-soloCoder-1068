export interface Attraction {
  id: string;
  name: string;
  city: string;
  country: string;
  description: string;
  imageUrl: string;
  ticketPrice: number;
  duration: string;
  openTime: string;
  rating: number;
  tags: string[];
  latitude?: number;
  longitude?: number;
}

export interface TimeSlot {
  id: string;
  attractionId: string;
  attractionName: string;
  startTime: string;
  endTime: string;
  period: 'morning' | 'afternoon' | 'evening';
  transport?: string;
  notes?: string;
}

export interface HotelInfo {
  id: string;
  name: string;
  address: string;
  price: number;
  checkIn: string;
  checkOut: string;
  phone?: string;
  imageUrl?: string;
}

export interface DayPlan {
  date: string;
  dateStr: string;
  timeSlots: TimeSlot[];
  hotel?: HotelInfo;
  weather?: {
    condition: string;
    temp: string;
    icon: string;
  };
}

export interface ExpenseItem {
  id: string;
  category: 'ticket' | 'transport' | 'hotel' | 'food' | 'shopping' | 'other';
  name: string;
  amount: number;
  date?: string;
  notes?: string;
  paidBy?: string;
  isAA?: boolean;
}

export interface ChecklistItem {
  id: string;
  category: string;
  name: string;
  checked: boolean;
}

export interface Traveler {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  tasks: string[];
}

export interface Budget {
  ticket: number;
  transport: number;
  hotel: number;
  food: number;
  shopping: number;
  other: number;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  days: DayPlan[];
  travelers: Traveler[];
  budget: Budget;
}

export interface FavoriteAttraction extends Attraction {
  isFavorite: boolean;
  addedAt: string;
}

export type ExpenseCategory = 'ticket' | 'transport' | 'hotel' | 'food' | 'shopping' | 'other';

export const EXPENSE_CATEGORY_MAP: Record<ExpenseCategory, { label: string; color: string }> = {
  ticket: { label: '门票', color: '#3b82f6' },
  transport: { label: '交通', color: '#10b981' },
  hotel: { label: '住宿', color: '#f59e0b' },
  food: { label: '餐饮', color: '#ec4899' },
  shopping: { label: '购物', color: '#8b5cf6' },
  other: { label: '其他', color: '#64748b' }
};

export const PERIOD_MAP: Record<string, { label: string; color: string }> = {
  morning: { label: '上午', color: '#f59e0b' },
  afternoon: { label: '下午', color: '#3b82f6' },
  evening: { label: '晚上', color: '#8b5cf6' }
};
