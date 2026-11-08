export type Setting = { mode: "off" } | { mode: "fixed"; tokens: number }

export type Usage = {
  input: number
  output: number
  reasoning: number
  cache: { read: number; write: number }
}

/** What the RPC and the TUI exchange. Optional fields are unknown, not zero. */
export type Status = {
  setting: Setting
  tokens?: number
  failures: number
  maxFailures: number
  pending: boolean
}

/** Stop retrying a broken compaction; the next /compact-at resets this. */
export const MAX_FAILURES = 3
/** More than this is a unit mistake (see parseSetting), not a threshold. */
export const MAX_THRESHOLD = 5_000_000
export const MIN_THRESHOLD = 1000

/**
 * `off` (plugin does nothing) or thousands of tokens: `300` is 300 000 and `30` is 30 000, so the
 * common values stay short. Undefined means "show status".
 */
export function parseSetting(args: string): Setting | undefined {
  const text = args.trim().toLowerCase()
  if (!text) return undefined
  if (text === "off") return { mode: "off" }
  // A trailing `k` says the same thing; the bare number already means thousands.
  const match = /^(\d+(?:[.,]\d+)?)k?$/.exec(text)
  if (!match) {
    throw new Error(
      `/compact-at takes thousands of tokens or "off": ${JSON.stringify(args.trim())} is not a number. 300 means 300k tokens.`,
    )
  }
  const tokens = Math.round(Number(match[1].replace(",", ".")) * 1000)
  if (!Number.isSafeInteger(tokens) || tokens < MIN_THRESHOLD) {
    throw new Error(`/compact-at needs at least 1 (= ${MIN_THRESHOLD} tokens); ${text} is too small.`)
  }
  if (tokens > MAX_THRESHOLD) {
    // Catches the reflex of typing a token count: it would silently never fire.
    throw new Error(
      `/compact-at ${text} would be ${formatTokens(tokens)} tokens; the argument counts thousands, so 300 already means 300k.`,
    )
  }
  return { mode: "fixed", tokens }
}

/**
 * The absolute trigger. OpenCode's own automatic compaction covers the model window; this plugin
 * only moves the trigger earlier, so there is no window-derived mode here.
 */
export function thresholdOf(setting: Setting): number | undefined {
  return setting.mode === "fixed" ? setting.tokens : undefined
}

export function formatTokens(value: number): string {
  if (value < 10_000) return String(Math.round(value))
  const thousands = value / 1000
  return `${thousands >= 100 || Number.isInteger(thousands) ? Math.round(thousands) : Number(thousands.toFixed(1))}k`
}

/** Validate a stored or RPC-supplied setting; a malformed value is off, never a crash. */
export function readSetting(value: unknown): Setting | undefined {
  if (typeof value !== "object" || value === null) return undefined
  const data = value as Partial<Setting>
  if (data.mode === "off") return { mode: "off" }
  if (
    data.mode === "fixed" &&
    typeof data.tokens === "number" &&
    Number.isSafeInteger(data.tokens) &&
    data.tokens >= MIN_THRESHOLD
  ) {
    return { mode: "fixed", tokens: data.tokens }
  }
  return undefined
}

/**
 * Tokens the next request will carry. OpenCode reports usage per step and TokenUsage.total sums the
 * same fields, so this matches the numbers OpenCode itself surfaces (reasoning included).
 */
export function contextTokens(usage: Usage): number {
  return usage.input + usage.output + usage.reasoning + usage.cache.read + usage.cache.write
}
