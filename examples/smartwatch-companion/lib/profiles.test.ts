import { describe, expect, it } from "vitest";
import { applyPreviewAction, createInitialState } from "./profiles";

describe("smartwatch companion preview flow", () => {
  it("keeps each user on a different Agent", () => {
    const ava = applyPreviewAction(
      createInitialState("ava", "preview"),
      "setup",
    );
    const liam = applyPreviewAction(
      createInitialState("liam", "preview"),
      "setup",
    );

    expect(ava.agentId).not.toBe(liam.agentId);
    expect(ava.sessionId).not.toBe(liam.sessionId);
  });

  it("uses synced feedback to adjust the next plan", () => {
    const setup = applyPreviewAction(
      createInitialState("ava", "preview"),
      "setup",
    );
    const synced = applyPreviewAction(setup, "sync");
    const reviewed = applyPreviewAction(synced, "review");

    expect(reviewed.feedback).toBe("Tuesday felt too hard");
    expect(reviewed.plan[0]?.title).toBe("Recovery run");
    expect(reviewed.hasReviewed).toBe(true);
  });

  it("continues messages inside the user's Agent Session", () => {
    const setup = applyPreviewAction(
      createInitialState("ava", "preview"),
      "setup",
    );
    const messaged = applyPreviewAction(setup, "message", "Why this plan?");

    expect(messaged.sessionId).toBe(setup.sessionId);
    expect(messaged.messages.at(-2)?.content).toBe("Why this plan?");
  });
});
