"use client";

import {
  Activity,
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  Cloud,
  Database,
  Footprints,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
  Watch,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import type { DemoAction, DemoState, DemoUserId } from "@/lib/types";

const users: Array<{ id: DemoUserId; name: string; initials: string }> = [
  { id: "ava", name: "Ava", initials: "AC" },
  { id: "liam", name: "Liam", initials: "LP" },
];

const getState = async (userId: DemoUserId): Promise<DemoState> => {
  const response = await fetch(`/api/demo?userId=${userId}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Could not load the demo");
  return response.json() as Promise<DemoState>;
};

export default function Home() {
  const [userId, setUserId] = useState<DemoUserId>("ava");
  const [state, setState] = useState<DemoState>();
  const [pending, setPending] = useState<DemoAction["action"]>();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setState(await getState(userId));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load the demo",
      );
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: DemoAction["action"], text?: string) => {
    setPending(action);
    setError("");
    try {
      const body =
        action === "message"
          ? { action, userId, message: text ?? "" }
          : { action, userId };
      const response = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as DemoState | { error: string };
      if (!response.ok || "error" in result)
        throw new Error("error" in result ? result.error : "The action failed");
      setState(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The action failed");
    } finally {
      setPending(undefined);
    }
  };

  const submitMessage = (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim() || pending) return;
    const nextMessage = message;
    setMessage("");
    void run("message", nextMessage);
  };

  if (!state)
    return (
      <main className="loading-screen">
        <LoaderCircle className="spin" />
        <span>{error || "Loading companion"}</span>
      </main>
    );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Footprints size={20} />
          </span>
          <div>
            <strong>Stride</strong>
            <span>companion</span>
          </div>
        </div>
        <div className="topbar-actions">
          <span className={`mode-badge ${state.mode}`}>
            <span className="status-dot" />
            {state.mode === "live" ? "API Claws live" : "Preview data"}
          </span>
          <div className="user-switch" aria-label="Demo user">
            {users.map((user) => (
              <button
                className={user.id === userId ? "active" : ""}
                key={user.id}
                onClick={() => setUserId(user.id)}
                type="button"
              >
                <span>{user.initials}</span>
                {user.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="workspace">
        <aside className="device-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Connected device</span>
              <h1>Orbit One</h1>
            </div>
            <span className="connected">
              <Check size={13} /> Synced
            </span>
          </div>
          <div
            className="watch-stage"
            aria-label="Smartwatch showing the latest workout"
          >
            <div className="watch-crown" />
            <div className="watch-strap top" />
            <div className="watch-body">
              <div className="watch-screen">
                <span className="watch-time">10:09</span>
                <div className="run-ring">
                  <Activity size={22} />
                  <strong>{state.distanceKm.toFixed(1)}</strong>
                  <span>KM</span>
                </div>
                <span className="watch-label">LATEST RUN</span>
              </div>
            </div>
            <div className="watch-strap bottom" />
          </div>
          <div className="device-stats">
            <div>
              <span>Battery</span>
              <strong>82%</strong>
            </div>
            <div>
              <span>Last sync</span>
              <strong>{state.isSynced ? "Just now" : "Yesterday"}</strong>
            </div>
          </div>
          <p className="device-note">
            <Watch size={15} /> Device sync belongs to the app. API Claws starts
            on the server.
          </p>
        </aside>

        <section className="main-panel">
          <div className="welcome-row">
            <div>
              <span className="eyebrow">
                {state.profile.name}'s training workspace
              </span>
              <h2>Good morning, {state.profile.name.split(" ")[0]}</h2>
              <p>
                Your companion is building toward{" "}
                <strong>{state.profile.goal}</strong>.
              </p>
            </div>
            <div className="welcome-actions">
              <button
                className="text-button"
                disabled={Boolean(pending)}
                type="button"
                onClick={() => void run("reset")}
              >
                Reset demo
              </button>
              <button
                className="icon-button"
                type="button"
                title="Reload demo state"
                onClick={() => void load()}
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
          <div className="goal-strip">
            <div className="goal-icon">
              <Sparkles size={19} />
            </div>
            <div>
              <span>Current goal</span>
              <strong>{state.profile.goal}</strong>
            </div>
            <div className="goal-meta">
              <CalendarDays size={16} /> {state.profile.targetDate}
            </div>
            <div className="goal-meta">
              <Footprints size={16} /> {state.profile.weeklyTarget}
            </div>
          </div>

          <div className="content-grid">
            <section className="plan-section">
              <div className="panel-title">
                <div>
                  <span className="eyebrow">Next week</span>
                  <h3>
                    {state.hasReviewed ? "Plan adjusted" : "Training plan"}
                  </h3>
                </div>
                {state.hasReviewed && (
                  <span className="adjusted">
                    <Sparkles size={13} /> Adapted
                  </span>
                )}
              </div>
              <div className="plan-list">
                {state.plan.map((item) => (
                  <article className="plan-item" key={item.day}>
                    <time>{item.day}</time>
                    <span className={`level ${item.level}`} />
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <ArrowRight size={16} />
                  </article>
                ))}
              </div>
              {state.feedback && (
                <div className="feedback">
                  <MessageCircle size={16} />
                  <div>
                    <span>Latest feedback</span>
                    <strong>“{state.feedback}”</strong>
                  </div>
                </div>
              )}
            </section>

            <section className="agent-section">
              <div className="panel-title">
                <div>
                  <span className="eyebrow">Powered by API Claws</span>
                  <h3>Training Agent</h3>
                </div>
                <span className="agent-avatar">
                  <Bot size={18} />
                </span>
              </div>
              <div className="messages" aria-live="polite">
                {state.messages.slice(-4).map((item) => (
                  <p className={`message ${item.role}`} key={item.id}>
                    {item.content}
                  </p>
                ))}
              </div>
              <form className="composer" onSubmit={submitMessage}>
                <input
                  aria-label="Message your training Agent"
                  disabled={!state.isReady || Boolean(pending)}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={
                    state.isReady
                      ? "Ask about your plan"
                      : "Set up the Agent first"
                  }
                  value={message}
                />
                <button
                  disabled={
                    !state.isReady || !message.trim() || Boolean(pending)
                  }
                  title="Send message"
                  type="submit"
                >
                  <Send size={17} />
                </button>
              </form>
            </section>
          </div>
        </section>

        <aside className="harness-panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">Live harness</span>
              <h3>What API Claws owns</h3>
            </div>
            <Cloud size={20} />
          </div>
          <div className="harness-stack">
            <HarnessRow
              done={state.isReady}
              icon={<Bot size={17} />}
              label="Agent"
              note="One per user"
            />
            <HarnessRow
              done={state.isReady}
              icon={<Database size={17} />}
              label="Drive"
              note="Isolated memory"
            />
            <HarnessRow
              done={Boolean(state.sessionId)}
              icon={<MessageCircle size={17} />}
              label="Session"
              note="Conversation context"
            />
            <HarnessRow
              done={state.isReady}
              icon={<CalendarDays size={17} />}
              label="Weekly review"
              note="Scheduled in cloud"
            />
            <HarnessRow
              done={state.isReady}
              icon={<LockKeyhole size={17} />}
              label="API key"
              note="Server-side only"
            />
          </div>
          <div className="event-log">
            <span>Latest event</span>
            <strong>{state.lastEvent}</strong>
          </div>
          {error && <p className="error-message">{error}</p>}
          <div className="action-stack">
            <ActionButton
              disabled={state.isReady}
              loading={pending === "setup"}
              onClick={() => void run("setup")}
            >
              <Bot size={16} /> Set up private Agent
            </ActionButton>
            <ActionButton
              disabled={!state.isReady || state.isSynced}
              loading={pending === "sync"}
              onClick={() => void run("sync")}
            >
              <Database size={16} /> Sync latest workout
            </ActionButton>
            <ActionButton
              disabled={!state.isSynced || state.hasReviewed}
              loading={pending === "review"}
              onClick={() => void run("review")}
            >
              <Sparkles size={16} /> Run weekly review
            </ActionButton>
          </div>
          <div className="flow-note">
            <span>Existing product</span>
            <strong>Watch ↔ App</strong>
            <ArrowRight size={14} />
            <span>Agent layer</span>
            <strong>Server → API Claws</strong>
          </div>
        </aside>
      </section>
    </main>
  );
}

function HarnessRow({
  done,
  icon,
  label,
  note,
}: {
  done: boolean;
  icon: ReactNode;
  label: string;
  note: string;
}) {
  return (
    <div className={done ? "done" : ""}>
      {icon}
      <span>
        <strong>{label}</strong>
        <small>{note}</small>
      </span>
      {done && <Check size={15} />}
    </div>
  );
}

function ActionButton({
  children,
  disabled,
  loading,
  onClick,
}: {
  children: ReactNode;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button disabled={disabled || loading} onClick={onClick} type="button">
      {loading ? <LoaderCircle className="spin" size={16} /> : children}
    </button>
  );
}
