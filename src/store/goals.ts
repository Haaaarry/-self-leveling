import { create } from 'zustand';
import { Goal } from '@/types';

interface GoalsState {
  goals: Goal[];
  currentGoal: Goal | null;
  loading: boolean;
  error: string | null;
  setGoals: (goals: Goal[]) => void;
  setCurrentGoal: (goal: Goal | null) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useGoalsStore = create<GoalsState>((set) => ({
  goals: [],
  currentGoal: null,
  loading: false,
  error: null,
  setGoals: (goals) => set({ goals }),
  setCurrentGoal: (goal) => set({ currentGoal: goal }),
  addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),
  updateGoal: (id, updates) =>
    set((state) => ({
      goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      currentGoal:
        state.currentGoal?.id === id
          ? { ...state.currentGoal, ...updates }
          : state.currentGoal,
    })),
  removeGoal: (id) =>
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== id),
      currentGoal: state.currentGoal?.id === id ? null : state.currentGoal,
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
