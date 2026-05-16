export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  targetDate?: Date;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  totalPoints: number;
  currentProgress: number;
  createdAt: Date;
  updatedAt: Date;
  milestones?: Milestone[];
}

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  description?: string;
  order: number;
  targetDate?: Date;
  isCompleted: boolean;
  completedAt?: Date;
  tasks?: Task[];
}

export interface Task {
  id: string;
  milestoneId: string;
  title: string;
  description?: string;
  points: number;
  estimatedTime?: number;
  plannedDate: Date;
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED';
  completedAt?: Date;
  skippedAt?: Date;
}

export interface PointTransaction {
  id: string;
  userId: string;
  taskId?: string;
  amount: number;
  type: 'EARNED' | 'SPENT';
  description: string;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  username: string;
  totalPoints: number;
  level: number;
}

export interface AIPromptRequest {
  goal: string;
  description?: string;
  targetDate?: string;
}

export interface AIGeneratedTask {
  title: string;
  description: string;
  points: number;
  estimatedTime?: number;
  plannedDate: string;
}

export interface AIGeneratedMilestone {
  title: string;
  description: string;
  order: number;
  targetDate?: string;
  tasks: AIGeneratedTask[];
}

export interface AIPlanningResponse {
  milestones: AIGeneratedMilestone[];
}
