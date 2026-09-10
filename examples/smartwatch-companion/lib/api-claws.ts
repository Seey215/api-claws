import "server-only";

export type SessionStatus =
  | "pending"
  | "in_progress"
  | "waiting_for_input"
  | "completed"
  | "failed"
  | "cancelled";

interface Agent {
  id: string;
  name: string;
  spaceId: string;
  driveId: string | null;
}

interface SessionDetail {
  session: { id: string; status: SessionStatus };
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
  }>;
}

interface ScheduledTask {
  id: string;
  name: string;
}

const settled: SessionStatus[] = [
  "waiting_for_input",
  "completed",
  "failed",
  "cancelled",
];
const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const liveConfig = () => {
  const apiKey = process.env.BUDA_API_KEY?.trim();
  const spaceId = process.env.BUDA_SPACE_ID?.trim();
  return {
    isLive: Boolean(apiKey && spaceId),
    apiKey,
    spaceId,
    baseUrl: (
      process.env.BUDA_API_BASE_URL?.trim() || "https://buda.im/api/v1"
    ).replace(/\/$/, ""),
  };
};

export class ApiClawsClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    const config = liveConfig();
    if (!config.apiKey || !config.spaceId) {
      throw new Error("Live mode requires BUDA_API_KEY and BUDA_SPACE_ID");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
  }

  private async request<T>(
    method: string,
    route: string,
    body?: unknown,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(`${this.baseUrl}${route}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          `API Claws returned ${response.status}: ${detail || response.statusText}`,
        );
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  async ensureUserAgent(userId: string, displayName: string): Promise<Agent> {
    const { spaceId } = liveConfig();
    if (!spaceId) throw new Error("BUDA_SPACE_ID is missing");
    const name = `Stride Companion - ${userId}`;
    const { agents } = await this.request<{ agents: Agent[] }>(
      "GET",
      `/spaces/${encodeURIComponent(spaceId)}/agents`,
    );
    const existing = agents.find((agent) => agent.name === name);
    if (existing) return existing;

    return this.request<Agent>("POST", "/api-agents", {
      spaceId,
      name,
      emoji: "🏃",
      instructions: [
        `You are ${displayName}'s private running companion.`,
        "Use Drive files as the source of truth.",
        "Create safe, practical weekly plans and explain changes from recorded feedback.",
        "Do not claim to control or read a smartwatch directly; workout data comes from the companion app.",
      ].join(" "),
    });
  }

  putDriveFile(agentId: string, filePath: string, content: string) {
    return this.request(
      "PUT",
      `/api-agents/${encodeURIComponent(agentId)}/drive/files`,
      {
        path: filePath,
        content,
        mimeType: "text/markdown",
      },
    );
  }

  async runTurn(
    agentId: string,
    sessionId: string | undefined,
    message: string,
  ) {
    const route = sessionId
      ? `/api-agents/${encodeURIComponent(agentId)}/sessions/${encodeURIComponent(sessionId)}/messages`
      : `/api-agents/${encodeURIComponent(agentId)}/sessions`;
    const started = await this.request<{ session: { id: string } }>(
      "POST",
      route,
      {
        message,
        mode: "agent",
      },
    );
    return this.waitForSession(agentId, started.session.id);
  }

  async waitForSession(
    agentId: string,
    sessionId: string,
  ): Promise<SessionDetail> {
    const deadline = Date.now() + 120_000;
    let interval = 900;
    let detail: SessionDetail | undefined;
    while (Date.now() < deadline) {
      await sleep(interval);
      detail = await this.request<SessionDetail>(
        "GET",
        `/api-agents/${encodeURIComponent(agentId)}/sessions/${encodeURIComponent(sessionId)}`,
      );
      if (settled.includes(detail.session.status)) return detail;
      interval = Math.min(Math.round(interval * 1.5), 3_000);
    }
    throw new Error(
      `The Agent is still working in session ${sessionId}. Check it again later.`,
    );
  }

  async ensureWeeklyTask(agentId: string): Promise<ScheduledTask> {
    const taskName = "Review next week's training plan";
    const { tasks } = await this.request<{ tasks: ScheduledTask[] }>(
      "GET",
      `/api-agents/${encodeURIComponent(agentId)}/scheduled-tasks?limit=50`,
    );
    const existing = tasks.find((task) => task.name === taskName);
    if (existing) return existing;

    return this.request<ScheduledTask>(
      "POST",
      `/api-agents/${encodeURIComponent(agentId)}/scheduled-tasks`,
      {
        name: taskName,
        taskTemplate: {
          prompt:
            "Read profile/goal.md, activity/recent.md, and feedback/latest.md from Drive. Create a concise three-workout plan for next week. Explain one change caused by the latest feedback.",
          sessionMode: "new",
        },
        scheduleType: "interval",
        intervalMinutes: 10_080,
        timezone: "UTC",
        isEnabled: true,
      },
    );
  }

  async runScheduledTask(
    agentId: string,
    taskId: string,
  ): Promise<SessionDetail> {
    const result = await this.request<{
      success: boolean;
      sessionId: string | null;
    }>(
      "POST",
      `/api-agents/${encodeURIComponent(agentId)}/scheduled-tasks/${encodeURIComponent(taskId)}/run`,
    );
    if (!result.success || !result.sessionId)
      throw new Error("The scheduled review did not start");
    return this.waitForSession(agentId, result.sessionId);
  }
}

export const latestAssistantText = (
  detail: SessionDetail,
): string | undefined => {
  for (let index = detail.messages.length - 1; index >= 0; index -= 1) {
    const message = detail.messages[index];
    if (message?.role === "assistant" && message.content.trim())
      return message.content;
  }
  return undefined;
};
