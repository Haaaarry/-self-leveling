import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PointsState {
  totalPoints: number;
  level: number;
  transactions: Array<{
    id: string;
    amount: number;
    type: 'EARNED' | 'SPENT';
    description: string;
    createdAt: string;
  }>;
  setPoints: (points: number, level: number) => void;
  addTransaction: (transaction: PointsState['transactions'][0]) => void;
  setTransactions: (transactions: PointsState['transactions']) => void;
}

export const usePointsStore = create<PointsState>()(
  persist(
    (set) => ({
      totalPoints: 0,
      level: 1,
      transactions: [],
      setPoints: (totalPoints, level) => set({ totalPoints, level }),
      addTransaction: (transaction) =>
        set((state) => ({
          transactions: [transaction, ...state.transactions],
        })),
      setTransactions: (transactions) => set({ transactions }),
    }),
    {
      name: 'points-storage',
    }
  )
);
