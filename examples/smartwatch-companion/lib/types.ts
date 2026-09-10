export type DemoUserId = "ava" | "liam";

export interface DemoProfile {
  id: DemoUserId;
  name: string;
  initials: string;
  goal: string;
  targetDate: string;
  weeklyTarget: string;
  accent: string;
}

export interface ChatItem {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface DemoState {
  mode: "preview" | "live";
  profile: DemoProfile;
  agentId?: string;
  sessionId?: string;
  scheduledTaskId?: string;
  isReady: boolean;
  isSynced: boolean;
  hasReviewed: boolean;
  distanceKm: number;
  feedback: string;
  plan: Array<{
    day: string;
    title: string;
    detail: string;
    level: "easy" | "steady" | "rest";
  }>;
  messages: ChatItem[];
  lastEvent: string;
}

export type DemoAction =
  | { action: "reset"; userId: DemoUserId }
  | { action: "setup"; userId: DemoUserId }
  | { action: "sync"; userId: DemoUserId }
  | { action: "review"; userId: DemoUserId }
  | { action: "message"; userId: DemoUserId; message: string };
