export enum TimerMode {
  POMODORO = 'pomodoro',
  BREAK = 'break',
}

export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  estimatedPomos: number;
  completedPomos: number;
  durationPerPomo: number; // in minutes, allowing custom override per task
  date: string; // YYYY-MM-DD
}

export interface DailyStats {
  date: string; // ISO string YYYY-MM-DD
  pomodorosCompleted: number;
  minutesFocused: number;
  breaksTaken: number;
  tasksCompleted: number;
}

export interface AppSettings {
  pomodoroTime: number;
  breakTime: number;
  dailyGoalPomos: number;
  streak: number;
  lastActiveDate: string;
}