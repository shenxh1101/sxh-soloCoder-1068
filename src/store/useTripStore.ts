import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dayjs from 'dayjs';
import type {
  Attraction,
  FavoriteAttraction,
  DayPlan,
  TimeSlot,
  ExpenseItem,
  ChecklistItem,
  HotelInfo,
  Traveler,
  Trip,
  Budget,
  ExpenseCategory
} from '@/types';

interface TripState {
  trip: Trip;
  favorites: FavoriteAttraction[];
  expenses: ExpenseItem[];
  checklist: ChecklistItem[];

  setTripName: (name: string) => void;
  setTripDestination: (destination: string) => void;
  setTripDates: (startDate: string, endDate: string) => void;

  setBudget: (category: ExpenseCategory, amount: number) => void;
  setAllBudgets: (budget: Partial<Budget>) => void;
  getBudgetByCategory: () => Budget;
  getTotalBudget: () => number;

  addFavorite: (attraction: Attraction) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;

  addTimeSlot: (date: string, slot: Omit<TimeSlot, 'id'>) => void;
  removeTimeSlot: (date: string, slotId: string) => void;
  updateTimeSlot: (date: string, slotId: string, updates: Partial<TimeSlot>) => void;
  reorderTimeSlots: (date: string, slots: TimeSlot[]) => void;
  moveTimeSlot: (date: string, slotId: string, direction: 'up' | 'down') => void;

  setHotel: (date: string, hotel: Omit<HotelInfo, 'id'>) => void;
  removeHotel: (date: string) => void;

  addExpense: (expense: Omit<ExpenseItem, 'id'>) => void;
  removeExpense: (id: string) => void;
  updateExpense: (id: string, updates: Partial<ExpenseItem>) => void;
  clearExpenses: () => void;

  toggleChecklistItem: (id: string) => void;
  addChecklistItem: (item: Omit<ChecklistItem, 'id'>) => void;
  removeChecklistItem: (id: string) => void;

  addTraveler: (traveler: Omit<Traveler, 'id'>) => void;
  removeTraveler: (id: string) => void;
  updateTravelerTask: (travelerId: string, tasks: string[]) => void;

  getTotalExpense: () => number;
  getExpenseByCategory: () => Record<string, number>;
  autoGenerateExpenses: () => void;
  getAAData: () => { travelerId: string; name: string; paid: number; shouldPay: number; diff: number }[];
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const generateDays = (startDate: string, endDate: string): DayPlan[] => {
  const days: DayPlan[] = [];
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const diff = end.diff(start, 'day');

  for (let i = 0; i <= diff; i++) {
    const date = start.add(i, 'day');
    days.push({
      date: date.format('YYYY-MM-DD'),
      dateStr: `第${i + 1}天 ${date.format('MM/DD')}`,
      timeSlots: [],
      weather: {
        condition: i % 3 === 0 ? '晴' : i % 3 === 1 ? '多云' : '小雨',
        temp: `${18 + i}°C - ${25 + i}°C`,
        icon: i % 3 === 0 ? '☀️' : i % 3 === 1 ? '⛅' : '🌧️'
      }
    });
  }
  return days;
};

const today = dayjs();
const defaultStart = today.add(7, 'day').format('YYYY-MM-DD');
const defaultEnd = today.add(11, 'day').format('YYYY-MM-DD');

const STORAGE_KEY = 'trip-planner-storage';

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trip: {
        id: generateId(),
        name: '东京五日游',
        destination: '东京, 日本',
        startDate: defaultStart,
        endDate: defaultEnd,
        days: generateDays(defaultStart, defaultEnd),
        travelers: [
          { id: generateId(), name: '我', role: '组织者', tasks: ['行程规划', '酒店预订'] }
        ],
        budget: {
          ticket: 2000,
          transport: 1000,
          hotel: 4000,
          food: 2000,
          shopping: 1500,
          other: 500
        }
      },
      favorites: [],
      expenses: [],
      checklist: [
        { id: generateId(), category: '证件', name: '身份证', checked: false },
        { id: generateId(), category: '证件', name: '护照', checked: false },
        { id: generateId(), category: '证件', name: '签证', checked: false },
        { id: generateId(), category: '衣物', name: '换洗衣物', checked: false },
        { id: generateId(), category: '衣物', name: '外套', checked: false },
        { id: generateId(), category: '衣物', name: '舒适的鞋子', checked: false },
        { id: generateId(), category: '电子', name: '手机充电器', checked: false },
        { id: generateId(), category: '电子', name: '充电宝', checked: false },
        { id: generateId(), category: '电子', name: '转换插头', checked: false },
        { id: generateId(), category: '日用', name: '牙刷', checked: false },
        { id: generateId(), category: '日用', name: '防晒霜', checked: false },
        { id: generateId(), category: '日用', name: '雨伞', checked: false },
        { id: generateId(), category: '药品', name: '感冒药', checked: false },
        { id: generateId(), category: '药品', name: '肠胃药', checked: false },
        { id: generateId(), category: '药品', name: '创可贴', checked: false }
      ],

      setTripName: (name) => set((state) => ({
        trip: { ...state.trip, name }
      })),

      setTripDestination: (destination) => set((state) => ({
        trip: { ...state.trip, destination }
      })),

      setTripDates: (startDate, endDate) => set((state) => {
        const oldDays = state.trip.days;
        const newDays = generateDays(startDate, endDate);

        const mergedDays = newDays.map(newDay => {
          const oldDay = oldDays.find(d => d.date === newDay.date);
          if (oldDay) {
            return {
              ...newDay,
              timeSlots: oldDay.timeSlots,
              hotel: oldDay.hotel
            };
          }
          return newDay;
        });

        return {
          trip: {
            ...state.trip,
            startDate,
            endDate,
            days: mergedDays
          }
        };
      }),

      setBudget: (category, amount) => set((state) => ({
        trip: {
          ...state.trip,
          budget: {
            ...state.trip.budget,
            [category]: amount
          }
        }
      })),

      setAllBudgets: (budget) => set((state) => ({
        trip: {
          ...state.trip,
          budget: {
            ...state.trip.budget,
            ...budget
          }
        }
      })),

      getBudgetByCategory: () => get().trip.budget,

      getTotalBudget: () => {
        const budget = get().trip.budget;
        return Object.values(budget).reduce((sum, val) => sum + val, 0);
      },

      addFavorite: (attraction) => set((state) => {
        if (state.favorites.some(f => f.id === attraction.id)) return state;
        return {
          favorites: [...state.favorites, { ...attraction, isFavorite: true, addedAt: new Date().toISOString() }]
        };
      }),

      removeFavorite: (id) => set((state) => ({
        favorites: state.favorites.filter(f => f.id !== id)
      })),

      isFavorite: (id) => get().favorites.some(f => f.id === id),

      addTimeSlot: (date, slot) => set((state) => ({
        trip: {
          ...state.trip,
          days: state.trip.days.map(day =>
            day.date === date
              ? { ...day, timeSlots: [...day.timeSlots, { ...slot, id: generateId() }] }
              : day
          )
        }
      })),

      removeTimeSlot: (date, slotId) => set((state) => ({
        trip: {
          ...state.trip,
          days: state.trip.days.map(day =>
            day.date === date
              ? { ...day, timeSlots: day.timeSlots.filter(s => s.id !== slotId) }
              : day
          )
        }
      })),

      updateTimeSlot: (date, slotId, updates) => set((state) => ({
        trip: {
          ...state.trip,
          days: state.trip.days.map(day =>
            day.date === date
              ? {
                  ...day,
                  timeSlots: day.timeSlots.map(s =>
                    s.id === slotId ? { ...s, ...updates } : s
                  )
                }
              : day
          )
        }
      })),

      reorderTimeSlots: (date, slots) => set((state) => ({
        trip: {
          ...state.trip,
          days: state.trip.days.map(day =>
            day.date === date ? { ...day, timeSlots: slots } : day
          )
        }
      })),

      moveTimeSlot: (date, slotId, direction) => set((state) => {
        const day = state.trip.days.find(d => d.date === date);
        if (!day) return state;

        const slots = [...day.timeSlots];
        const index = slots.findIndex(s => s.id === slotId);

        if (index === -1) return state;
        if (direction === 'up' && index === 0) return state;
        if (direction === 'down' && index === slots.length - 1) return state;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [slots[index], slots[targetIndex]] = [slots[targetIndex], slots[index]];

        return {
          trip: {
            ...state.trip,
            days: state.trip.days.map(d =>
              d.date === date ? { ...d, timeSlots: slots } : d
            )
          }
        };
      }),

      setHotel: (date, hotel) => set((state) => {
        const hotelData = { ...hotel, id: generateId() };

        const existingHotelExpense = state.expenses.find(
          e => e.category === 'hotel' && e.date === date
        );

        if (hotelData.price > 0) {
          if (existingHotelExpense) {
            get().updateExpense(existingHotelExpense.id, {
              name: hotelData.name,
              amount: hotelData.price
            });
          } else {
            get().addExpense({
              category: 'hotel',
              name: hotelData.name,
              amount: hotelData.price,
              date: date
            });
          }
        } else if (existingHotelExpense) {
          get().removeExpense(existingHotelExpense.id);
        }

        return {
          trip: {
            ...state.trip,
            days: state.trip.days.map(day =>
              day.date === date ? { ...day, hotel: hotelData } : day
            )
          }
        };
      }),

      removeHotel: (date) => set((state) => {
        const existingHotelExpense = state.expenses.find(
          e => e.category === 'hotel' && e.date === date
        );
        if (existingHotelExpense) {
          get().removeExpense(existingHotelExpense.id);
        }

        return {
          trip: {
            ...state.trip,
            days: state.trip.days.map(day =>
              day.date === date ? { ...day, hotel: undefined } : day
            )
          }
        };
      }),

      addExpense: (expense) => set((state) => ({
        expenses: [...state.expenses, { ...expense, id: generateId() }]
      })),

      removeExpense: (id) => set((state) => ({
        expenses: state.expenses.filter(e => e.id !== id)
      })),

      updateExpense: (id, updates) => set((state) => ({
        expenses: state.expenses.map(e =>
          e.id === id ? { ...e, ...updates } : e
        )
      })),

      clearExpenses: () => set({ expenses: [] }),

      toggleChecklistItem: (id) => set((state) => ({
        checklist: state.checklist.map(item =>
          item.id === id ? { ...item, checked: !item.checked } : item
        )
      })),

      addChecklistItem: (item) => set((state) => ({
        checklist: [...state.checklist, { ...item, id: generateId() }]
      })),

      removeChecklistItem: (id) => set((state) => ({
        checklist: state.checklist.filter(item => item.id !== id)
      })),

      addTraveler: (traveler) => set((state) => ({
        trip: {
          ...state.trip,
          travelers: [...state.trip.travelers, { ...traveler, id: generateId() }]
        }
      })),

      removeTraveler: (id) => set((state) => ({
        trip: {
          ...state.trip,
          travelers: state.trip.travelers.filter(t => t.id !== id)
        }
      })),

      updateTravelerTask: (travelerId, tasks) => set((state) => ({
        trip: {
          ...state.trip,
          travelers: state.trip.travelers.map(t =>
            t.id === travelerId ? { ...t, tasks } : t
          )
        }
      })),

      getTotalExpense: () => {
        return get().expenses.reduce((sum, e) => sum + e.amount, 0);
      },

      getExpenseByCategory: () => {
        const result: Record<string, number> = {};
        get().expenses.forEach(e => {
          result[e.category] = (result[e.category] || 0) + e.amount;
        });
        return result;
      },

      autoGenerateExpenses: () => {
        const { trip, favorites } = get();
        get().clearExpenses();

        trip.days.forEach(day => {
          if (day.hotel && day.hotel.price > 0) {
            get().addExpense({
              category: 'hotel',
              name: day.hotel.name,
              amount: day.hotel.price,
              date: day.date
            });
          }
          day.timeSlots.forEach(slot => {
            const attraction = favorites.find(f => f.id === slot.attractionId);
            if (attraction && attraction.ticketPrice > 0) {
              get().addExpense({
                category: 'ticket',
                name: `${attraction.name} 门票`,
                amount: attraction.ticketPrice,
                date: day.date
              });
            }
          });
        });
      },

      getAAData: () => {
        const { trip, expenses, getTotalExpense } = get();
        const travelers = trip.travelers;
        const total = getTotalExpense();
        const perPerson = travelers.length > 0 ? total / travelers.length : 0;

        return travelers.map(traveler => {
          const paid = expenses
            .filter(e => e.paidBy === traveler.id)
            .reduce((sum, e) => sum + e.amount, 0);
          const shouldPay = perPerson;
          const diff = paid - shouldPay;
          return {
            travelerId: traveler.id,
            name: traveler.name,
            paid,
            shouldPay,
            diff
          };
        });
      }
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        trip: state.trip,
        favorites: state.favorites,
        expenses: state.expenses,
        checklist: state.checklist
      })
    }
  )
);
