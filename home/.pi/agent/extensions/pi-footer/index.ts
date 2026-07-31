/**
 * Custom Pi footer.
 *
 * Layout:
 *   model thinking <> cwd branch
 *   TPS ... | token totals | cost | context
 *   MCP ... (plus other extension statuses when present)
 */

import type { ExtensionAPI, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";

const ANSI_ESCAPE = /(?:\u001B\][^\u0007]*(?:\u0007|\u001B\\)|\u001B\[[0-?]*[ -/]*[@-~])/g;

export interface FooterUsageSnapshot {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
  contextTokens: number | null;
  contextWindow: number;
  contextPercent: number | null;
  latestCacheHitRate?: number;
  tpsStatus?: string;
}

export interface FooterHeaderSnapshot {
  model: string;
  thinking: string;
  cwd: string;
  branch?: string;
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function truncateDisplayText(value: string, width: number, ellipsis = "…"): string {
  if (!Number.isFinite(width) || width <= 0) return "";
  if (stripAnsi(value).length <= width) return value;
  if (width <= ellipsis.length) return ellipsis.slice(0, width);

  const target = width - ellipsis.length;
  let visible = 0;
  let index = 0;
  let result = "";
  let hasAnsi = false;

  while (index < value.length && visible < target) {
    if (value[index] === "\u001b") {
      const match = value.slice(index).match(ANSI_ESCAPE);
      if (match?.[0]) {
        result += match[0];
        index += match[0].length;
        hasAnsi = true;
        continue;
      }
    }

    const character = Array.from(value.slice(index))[0];
    if (!character) break;
    result += character;
    index += character.length;
    visible += 1;
  }

  return `${result}${hasAnsi ? "\u001b[0m" : ""}${ellipsis}`;
}

export function stripAnsi(value: string): string {
  return value.replace(ANSI_ESCAPE, "");
}

export function sanitizeDisplayText(value: string, fallback = "-"): string {
  const clean = stripAnsi(value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean || fallback;
}

export function formatTokenCount(value: number): string {
  const count = finiteNonNegative(value);
  if (count < 1_000) return String(Math.round(count));
  if (count < 10_000) return `${(count / 1_000).toFixed(1)}k`;
  if (count < 1_000_000) return `${Math.round(count / 1_000)}k`;
  if (count < 10_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  return `${Math.round(count / 1_000_000)}M`;
}

export function formatContextUsage(snapshot: FooterUsageSnapshot): string {
  const percent = snapshot.contextPercent;
  const percentText = percent == null || !Number.isFinite(percent) ? "?" : `${percent.toFixed(1)}%`;
  const windowText = snapshot.contextWindow > 0 ? formatTokenCount(snapshot.contextWindow) : "?";
  return `${percentText}/${windowText}`;
}

export function formatTpsStatus(status: string | undefined): string {
  const clean = sanitizeDisplayText(status ?? "", "-");
  return clean.replace(/^TPS\s*/i, "") || "-";
}

export function formatUsageLine(snapshot: FooterUsageSnapshot): string {
  const stats: string[] = [];
  const tps = formatTpsStatus(snapshot.tpsStatus);
  if (tps !== "-") stats.push(`TPS ${tps}`);
  if (snapshot.input > 0) stats.push(`↑${formatTokenCount(snapshot.input)}`);
  if (snapshot.output > 0) stats.push(`↓${formatTokenCount(snapshot.output)}`);
  if (snapshot.cacheRead > 0) stats.push(`R${formatTokenCount(snapshot.cacheRead)}`);
  if (snapshot.cacheWrite > 0) stats.push(`W${formatTokenCount(snapshot.cacheWrite)}`);
  if ((snapshot.cacheRead > 0 || snapshot.cacheWrite > 0) && snapshot.latestCacheHitRate !== undefined) {
    stats.push(`CH${snapshot.latestCacheHitRate.toFixed(1)}%`);
  }
  if (finiteNonNegative(snapshot.cost) > 0) stats.push(`$${finiteNonNegative(snapshot.cost).toFixed(3)}`);
  stats.push(formatContextUsage(snapshot));
  return stats.join(" ");
}

export function formatHeaderLine(snapshot: FooterHeaderSnapshot): string {
  const model = sanitizeDisplayText(snapshot.model, "no-model");
  const thinking = sanitizeDisplayText(snapshot.thinking, "off");
  const cwd = sanitizeDisplayText(snapshot.cwd, "~");
  const branch = snapshot.branch ? ` ${sanitizeDisplayText(snapshot.branch)}` : "";
  return `${model} ${thinking} <> ${cwd}${branch}`;
}

function statusLabel(key: string): string {
  if (key === "mcp") return "MCP";
  if (key === "goal") return "GOAL";
  return key.replace(/[-_:]+/g, " ").toUpperCase();
}

function sanitizeStatusText(value: string, fallback = "-"): string {
  const clean = value.replace(/[\r\n\t]/g, " ").replace(/ +/g, " ").trim();
  return clean || fallback;
}

export function formatStatusLine(statuses: ReadonlyMap<string, string>): string {
  const entries = [...statuses.entries()]
    .filter(([key]) => key !== "pi-tps")
    .sort(([left], [right]) => {
      if (left === "mcp") return -1;
      if (right === "mcp") return 1;
      return left.localeCompare(right);
    });

  if (entries.length === 0) return "MCP -";
  return entries
    .map(([key, value]) => `${statusLabel(key)} ${sanitizeStatusText(value)}`)
    .join("  ");
}

function homeRelativePath(path: string): string {
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) return path;
  if (path === home) return "~";
  if (path.startsWith(`${home}/`)) return `~/${path.slice(home.length + 1)}`;
  if (process.platform === "win32" && path.startsWith(`${home}\\`)) {
    return `~\\${path.slice(home.length + 1)}`;
  }
  return path;
}

function renderHeader(
  snapshot: FooterHeaderSnapshot,
  width: number,
  theme: Theme,
): string {
  const raw = formatHeaderLine(snapshot);
  const fitted = truncateDisplayText(raw, width, "...");
  // Pi's native footer renders its cwd/branch row dimmed.
  return theme.fg("dim", fitted);
}

function renderUsage(
  snapshot: FooterUsageSnapshot,
  width: number,
  theme: Theme,
): string {
  const parts: string[] = [];
  const tps = sanitizeStatusText(snapshot.tpsStatus ?? "", "");
  if (tps) parts.push(tps);
  if (snapshot.input > 0) parts.push(`↑${formatTokenCount(snapshot.input)}`);
  if (snapshot.output > 0) parts.push(`↓${formatTokenCount(snapshot.output)}`);
  if (snapshot.cacheRead > 0) parts.push(`R${formatTokenCount(snapshot.cacheRead)}`);
  if (snapshot.cacheWrite > 0) parts.push(`W${formatTokenCount(snapshot.cacheWrite)}`);
  if ((snapshot.cacheRead > 0 || snapshot.cacheWrite > 0) && snapshot.latestCacheHitRate !== undefined) {
    parts.push(`CH${snapshot.latestCacheHitRate.toFixed(1)}%`);
  }
  if (finiteNonNegative(snapshot.cost) > 0) parts.push(`$${finiteNonNegative(snapshot.cost).toFixed(3)}`);

  const contextText = formatContextUsage(snapshot);
  const contextPercent = snapshot.contextPercent ?? 0;
  const contextColor = contextPercent > 90 ? "error" : contextPercent > 70 ? "warning" : "dim";
  parts.push(theme.fg(contextColor, contextText));

  const fitted = truncateDisplayText(parts.join(" "), width, "...");
  // Native Pi dims the aggregate stats while allowing context thresholds and
  // already-colored extension statuses to retain their semantic colors.
  return theme.fg("dim", fitted);
}

function renderStatuses(
  statuses: ReadonlyMap<string, string>,
  width: number,
  theme: Theme,
): string {
  const fitted = truncateDisplayText(formatStatusLine(statuses), width, "...");
  // Status values already carry their native extension colors (for example
  // MCP's accent status), so do not wrap or strip them here.
  return fitted;
}

interface UsageTotals {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
  latestCacheHitRate?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function finiteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function addUsage(totals: UsageTotals, value: unknown): void {
  if (!isRecord(value)) return;
  totals.input += finiteNumber(value.input);
  totals.output += finiteNumber(value.output);
  totals.cacheRead += finiteNumber(value.cacheRead);
  totals.cacheWrite += finiteNumber(value.cacheWrite);
  if (isRecord(value.cost)) totals.cost += finiteNumber(value.cost.total);
}

function getUsageTotals(ctx: ExtensionContext): UsageTotals {
  const totals: UsageTotals = {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    cost: 0,
  };

  for (const entry of ctx.sessionManager.getEntries() as unknown[]) {
    if (!isRecord(entry)) continue;
    if (entry.type === "message" && isRecord(entry.message)) {
      const role = entry.message.role;
      if (role === "assistant" || role === "toolResult") addUsage(totals, entry.message.usage);
      if (role === "assistant" && isRecord(entry.message.usage)) {
        const usage = entry.message.usage;
        const promptTokens =
          finiteNumber(usage.input) + finiteNumber(usage.cacheRead) + finiteNumber(usage.cacheWrite);
        totals.latestCacheHitRate = promptTokens > 0
          ? finiteNumber(usage.cacheRead) / promptTokens * 100
          : undefined;
      }
    } else if (entry.type === "compaction" || entry.type === "branch_summary") {
      addUsage(totals, entry.usage);
    }
  }

  return totals;
}

function getUsageSnapshot(ctx: ExtensionContext, tpsStatus: string | undefined): FooterUsageSnapshot {
  const totals = getUsageTotals(ctx);
  const context = ctx.getContextUsage();
  return {
    ...totals,
    contextTokens: context?.tokens ?? null,
    contextWindow: context?.contextWindow ?? 0,
    contextPercent: context?.percent ?? null,
    latestCacheHitRate: totals.latestCacheHitRate,
    tpsStatus,
  };
}

export default function piFooterExtension(pi: ExtensionAPI): void {
  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    ctx.ui.setFooter((tui, theme, footerData) => {
      const unsubscribe = footerData.onBranchChange(() => tui.requestRender());

      return {
        invalidate() {},
        dispose: unsubscribe,
        render(width: number): string[] {
          const statuses = footerData.getExtensionStatuses();
          const model = ctx.model?.id ?? "no-model";
          const thinking = ctx.thinkingLevel ?? "off";
          const branch = footerData.getGitBranch() ?? "";
          const header: FooterHeaderSnapshot = {
            model,
            thinking,
            cwd: homeRelativePath(ctx.cwd),
            branch,
          };
          const usage = getUsageSnapshot(ctx, statuses.get("pi-tps"));

          return [
            renderHeader(header, width, theme),
            renderUsage(usage, width, theme),
            renderStatuses(statuses, width, theme),
          ];
        },
      };
    });
  });
}
