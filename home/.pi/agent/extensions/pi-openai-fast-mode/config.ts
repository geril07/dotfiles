import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir, withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { isRecord, isSupportedProvider } from "./payload.js";
import type { FastModeConfig, FastTarget } from "./types.js";

function isMissing(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}

export function getUserConfigPath(agentDir = getAgentDir()): string {
  return join(agentDir, "extensions", "pi-openai-fast-mode.json");
}

export function parseConfig(raw: unknown): FastModeConfig {
  if (!isRecord(raw)) throw new Error("config must be an object");
  if (typeof raw.enabled !== "boolean") throw new Error("enabled must be a boolean");
  if (!Array.isArray(raw.targets)) throw new Error("targets must be an array");

  const seen = new Set<string>();
  const targets = raw.targets.map((target: unknown, index: number): FastTarget => {
    const label = `targets[${index}]`;
    if (!isRecord(target)) throw new Error(`${label} must be an object`);
    if (typeof target.provider !== "string" || !isSupportedProvider(target.provider)) {
      throw new Error(`${label}.provider must be openai or openai-codex`);
    }
    if (typeof target.model !== "string" || !target.model.trim()) {
      throw new Error(`${label}.model must be a non-empty string`);
    }
    if (target.serviceTier !== undefined &&
        (typeof target.serviceTier !== "string" || !target.serviceTier.trim())) {
      throw new Error(`${label}.serviceTier must be a non-empty string`);
    }
    const key = `${target.provider}\u0000${target.model}`;
    if (seen.has(key)) throw new Error(`${label} duplicates ${target.provider}/${target.model}`);
    seen.add(key);
    return {
      provider: target.provider,
      model: target.model,
      ...(typeof target.serviceTier === "string" ? { serviceTier: target.serviceTier } : {}),
    };
  });
  return { enabled: raw.enabled, targets };
}

async function readDocument(configPath: string): Promise<Record<string, unknown>> {
  try {
    let json: string;
    try {
      json = await fs.readFile(configPath, "utf8");
    } catch (error) {
      if (isMissing(error)) return { enabled: false, targets: [] };
      throw error;
    }
    const raw: unknown = JSON.parse(json);
    parseConfig(raw);
    return raw as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Fast Mode config ${configPath}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
}

export async function loadConfig(configPath: string): Promise<FastModeConfig> {
  return parseConfig(await readDocument(configPath));
}

export async function saveEnabled(configPath: string, enabled: boolean): Promise<void> {
  await withFileMutationQueue(configPath, async () => {
    // Read the current document, not the session snapshot, to retain manual edits.
    const raw = await readDocument(configPath);
    let writePath = configPath;
    let mode = 0o600;
    try {
      writePath = await fs.realpath(configPath);
      mode = (await fs.stat(writePath)).mode & 0o777;
    } catch (error) {
      if (!isMissing(error)) throw error;
      const entry = await fs.lstat(configPath).catch((error: unknown) => {
        if (isMissing(error)) return undefined;
        throw error;
      });
      if (entry?.isSymbolicLink()) throw new Error(`Fast Mode config is a broken symlink: ${configPath}`);
    }
    await fs.mkdir(dirname(writePath), { recursive: true });
    const temporaryPath = `${writePath}.${randomUUID()}.tmp`;
    try {
      // Atomic replacement keeps new headless sessions from reading partial JSON.
      await fs.writeFile(temporaryPath, `${JSON.stringify({ ...raw, enabled }, null, 2)}\n`, { flag: "wx", mode });
      await fs.rename(temporaryPath, writePath);
    } finally {
      await fs.rm(temporaryPath, { force: true });
    }
  });
}
