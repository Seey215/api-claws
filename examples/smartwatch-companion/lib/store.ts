import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { DemoState, DemoUserId } from "./types";

const dataDirectory = path.join(process.cwd(), ".data");
const dataFile = path.join(dataDirectory, "smartwatch-demo.json");

type StoredStates = Partial<Record<DemoUserId, DemoState>>;

const readAll = (): StoredStates => {
  if (!existsSync(dataFile)) return {};
  try {
    return JSON.parse(readFileSync(dataFile, "utf8")) as StoredStates;
  } catch {
    return {};
  }
};

export const readState = (userId: DemoUserId): DemoState | undefined =>
  readAll()[userId];

export const writeState = (state: DemoState): DemoState => {
  mkdirSync(dataDirectory, { recursive: true });
  const all = readAll();
  all[state.profile.id] = state;
  writeFileSync(dataFile, `${JSON.stringify(all, null, 2)}\n`, "utf8");
  return state;
};
