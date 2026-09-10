import { NextResponse } from "next/server";
import {
  ApiClawsClient,
  latestAssistantText,
  liveConfig,
} from "@/lib/api-claws";
import {
  adjustedPlan,
  applyPreviewAction,
  createInitialState,
  PROFILES,
} from "@/lib/profiles";
import { readState, writeState } from "@/lib/store";
import type { DemoAction, DemoState, DemoUserId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isUserId = (value: string | null): value is DemoUserId =>
  value === "ava" || value === "liam";
const actions = new Set(["reset", "setup", "sync", "review", "message"]);

const currentState = (userId: DemoUserId): DemoState => {
  const mode = liveConfig().isLive ? "live" : "preview";
  const stored = readState(userId);
  if (!stored || stored.mode !== mode)
    return writeState(createInitialState(userId, mode));
  return stored;
};

const syncDrive = async (client: ApiClawsClient, state: DemoState) => {
  if (!state.agentId) throw new Error("Set up the user's Agent first");
  await Promise.all([
    client.putDriveFile(
      state.agentId,
      "profile/goal.md",
      `# Running goal\n\nGoal: ${state.profile.goal}\nTarget date: ${state.profile.targetDate}\nPreferred schedule: ${state.profile.weeklyTarget}\n`,
    ),
    client.putDriveFile(
      state.agentId,
      "activity/recent.md",
      `# Recent activity\n\nLatest run: ${state.distanceKm.toFixed(1)} km\nSource: smartwatch companion app\n`,
    ),
    client.putDriveFile(
      state.agentId,
      "feedback/latest.md",
      `# Approved feedback\n\n${state.feedback || "No feedback recorded yet."}\n`,
    ),
  ]);
};

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId");
  if (!isUserId(userId))
    return NextResponse.json({ error: "Unknown demo user" }, { status: 400 });
  return NextResponse.json(currentState(userId));
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as DemoAction;
    if (!isUserId(input.userId)) {
      return NextResponse.json({ error: "Unknown demo user" }, { status: 400 });
    }
    if (!actions.has(input.action)) {
      return NextResponse.json(
        { error: "Unknown demo action" },
        { status: 400 },
      );
    }
    if (input.action === "message" && !input.message.trim()) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 },
      );
    }

    let state = currentState(input.userId);
    if (input.action === "reset") {
      return NextResponse.json(
        writeState(createInitialState(input.userId, state.mode)),
      );
    }
    if (input.action !== "setup" && !state.isReady) {
      return NextResponse.json(
        { error: "Set up the user's Agent first" },
        { status: 409 },
      );
    }
    if (input.action === "review" && !state.isSynced) {
      return NextResponse.json(
        { error: "Sync a workout before running the review" },
        { status: 409 },
      );
    }
    if (state.mode === "preview") {
      state = applyPreviewAction(
        state,
        input.action,
        input.action === "message" ? input.message : undefined,
      );
      return NextResponse.json(writeState(state));
    }

    const client = new ApiClawsClient();
    if (input.action === "setup") {
      const agent = await client.ensureUserAgent(
        input.userId,
        PROFILES[input.userId].name,
      );
      state = { ...state, agentId: agent.id };
      await syncDrive(client, state);
      const task = await client.ensureWeeklyTask(agent.id);
      const detail = await client.runTurn(
        agent.id,
        undefined,
        "Read my goal and recent activity from Drive. Create my first concise three-workout plan.",
      );
      const reply =
        latestAssistantText(detail) || "Your first training plan is ready.";
      state = {
        ...state,
        sessionId: detail.session.id,
        scheduledTaskId: task.id,
        isReady: true,
        messages: [
          ...state.messages,
          { id: `setup-${Date.now()}`, role: "assistant", content: reply },
        ],
        lastEvent: "Agent, isolated Drive, and weekly review created",
      };
    } else if (input.action === "sync") {
      state = {
        ...state,
        distanceKm: 5.2,
        feedback: "Tuesday felt too hard",
        isSynced: true,
      };
      await syncDrive(client, state);
      state.lastEvent =
        "Workout and approved feedback written to this Agent's Drive";
    }

    if (input.action === "message") {
      if (!state.agentId) throw new Error("Set up the user's Agent first");
      const detail = await client.runTurn(
        state.agentId,
        state.sessionId,
        input.message,
      );
      const reply =
        latestAssistantText(detail) ||
        "The Agent completed without a text reply.";
      state = {
        ...state,
        sessionId: detail.session.id,
        messages: [
          ...state.messages,
          { id: `user-${Date.now()}`, role: "user", content: input.message },
          { id: `assistant-${Date.now()}`, role: "assistant", content: reply },
        ],
        lastEvent: "Conversation continued in this Agent's Session",
      };
    } else if (input.action === "review") {
      if (!state.agentId || !state.scheduledTaskId) {
        throw new Error("Set up the user's Agent and weekly review first");
      }
      const detail = await client.runScheduledTask(
        state.agentId,
        state.scheduledTaskId,
      );
      const reply =
        latestAssistantText(detail) ||
        "The weekly review completed without text.";
      state = {
        ...state,
        hasReviewed: true,
        plan: adjustedPlan.map((item) => ({ ...item })),
        messages: [
          ...state.messages,
          { id: `review-${Date.now()}`, role: "assistant", content: reply },
        ],
        lastEvent: "Weekly review completed by API Claws",
      };
    }

    return NextResponse.json(writeState(state));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
