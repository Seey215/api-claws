import type { DemoProfile, DemoState, DemoUserId } from "./types";

export const PROFILES: Record<DemoUserId, DemoProfile> = {
  ava: {
    id: "ava",
    name: "Ava Chen",
    initials: "AC",
    goal: "Run my first 10K",
    targetDate: "October 24",
    weeklyTarget: "3 workouts per week",
    accent: "#de5b43",
  },
  liam: {
    id: "liam",
    name: "Liam Park",
    initials: "LP",
    goal: "Build a steady 5K habit",
    targetDate: "November 7",
    weeklyTarget: "2 workouts per week",
    accent: "#267a6a",
  },
};

const initialPlan: DemoState["plan"] = [
  {
    day: "Tue",
    title: "Easy run",
    detail: "3.5 km · relaxed pace",
    level: "easy",
  },
  {
    day: "Thu",
    title: "Tempo blocks",
    detail: "4 × 4 min · controlled",
    level: "steady",
  },
  {
    day: "Sun",
    title: "Long run",
    detail: "5.5 km · conversational",
    level: "easy",
  },
];

export const adjustedPlan: DemoState["plan"] = [
  {
    day: "Tue",
    title: "Recovery run",
    detail: "2.8 km · easier than last week",
    level: "easy",
  },
  {
    day: "Thu",
    title: "Steady run",
    detail: "4.0 km · no speed blocks",
    level: "steady",
  },
  {
    day: "Sun",
    title: "Long run",
    detail: "5.8 km · conversational",
    level: "easy",
  },
];

export const createInitialState = (
  userId: DemoUserId,
  mode: DemoState["mode"],
): DemoState => ({
  mode,
  profile: PROFILES[userId],
  isReady: false,
  isSynced: false,
  hasReviewed: false,
  distanceKm: 4.1,
  feedback: "",
  plan: initialPlan.map((item) => ({ ...item })),
  messages: [
    {
      id: "welcome",
      role: "assistant",
      content: `I can help you work toward: ${PROFILES[userId].goal}. Set up your private Agent to begin.`,
    },
  ],
  lastEvent: "Waiting for Agent setup",
});

export const applyPreviewAction = (
  state: DemoState,
  action: "setup" | "sync" | "review" | "message",
  message?: string,
): DemoState => {
  if (action === "setup") {
    return {
      ...state,
      agentId: `preview-agent-${state.profile.id}`,
      sessionId: `preview-session-${state.profile.id}`,
      scheduledTaskId: `preview-weekly-${state.profile.id}`,
      isReady: true,
      messages: [
        ...state.messages,
        {
          id: "setup-complete",
          role: "assistant",
          content:
            "Your private training Agent is ready. I created a first plan from your goal and recent workouts.",
        },
      ],
      lastEvent: "Agent and isolated Drive created",
    };
  }

  if (action === "sync") {
    return {
      ...state,
      isSynced: true,
      distanceKm: 5.2,
      feedback: "Tuesday felt too hard",
      lastEvent: "Workout and feedback written to Drive",
    };
  }

  if (action === "review") {
    return {
      ...state,
      hasReviewed: true,
      plan: adjustedPlan.map((item) => ({ ...item })),
      messages: [
        ...state.messages,
        {
          id: `review-${Date.now()}`,
          role: "assistant",
          content:
            "I reduced Tuesday's load after your feedback and kept Sunday progressive. Your next week is ready.",
        },
      ],
      lastEvent: "Weekly review completed by scheduled Agent run",
    };
  }

  const cleanMessage = message?.trim() || "Why did Tuesday change?";
  return {
    ...state,
    sessionId: state.sessionId ?? `preview-session-${state.profile.id}`,
    messages: [
      ...state.messages,
      { id: `user-${Date.now()}`, role: "user", content: cleanMessage },
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: state.hasReviewed
          ? "Your latest feedback said Tuesday felt too hard, so I lowered the distance and removed the speed blocks."
          : "I will use your goal, recent workouts, and feedback when I review the next plan.",
      },
    ],
    lastEvent: "Conversation continued in the same Session",
  };
};
