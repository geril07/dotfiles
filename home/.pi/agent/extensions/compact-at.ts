import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

/**
 * Per-session absolute auto-compaction threshold.
 *
 * Pi core compacts when `contextTokens > contextWindow - compaction.reserveTokens`, and that reserve
 * lives in settings files (global or project), so it cannot differ between sessions. This extension
 * adds a session-scoped absolute number instead: `/compact-at 300` compacts once the session holds
 * 300 000 tokens, on every model, until the session ends. The argument counts thousands.
 *
 * The value is a session entry, so it survives /reload, resume and forks (a fork reads its own branch).
 * The extension only fires when the session is idle - pi aborts the running turn before compacting, so
 * a mid-run trigger would kill autonomous work. A number above pi's own threshold is pointless: the
 * core check runs first mid-run, and that is reported by `/compact-at`.
 */
const ENTRY = "compact-at";
/** Stop retrying a broken compaction; the next command resets this. */
const MAX_FAILURES = 3;
/** pi core's default `compaction.reserveTokens`; used only to explain which threshold fires first. */
const NATIVE_RESERVE = 16384;
/** Room a native summary needs, capped the way Claude Code caps its own reserve. */
const SUMMARY_RESERVE = 20_000;
const MIN_THRESHOLD = 1000;
/** More than this is a unit mistake (see parseSetting), not a threshold. */
const MAX_THRESHOLD = 5_000_000;

export type Setting = { mode: "off" } | { mode: "auto" } | { mode: "fixed"; tokens: number };

/**
 * `off` (extension does nothing), `auto` (window-derived), or thousands of tokens: `300` is 300 000 and
 * `30` is 30 000, so the common values stay short. Returns undefined for "show status".
 */
export function parseSetting(args: string): Setting | undefined {
	const text = args.trim().toLowerCase();
	if (!text) return undefined;
	if (text === "off") return { mode: "off" };
	if (text === "auto") return { mode: "auto" };
	// A trailing `k` says the same thing; the bare number already means thousands.
	const match = /^(\d+(?:[.,]\d+)?)k?$/.exec(text);
	if (!match) {
		throw new Error(`/compact-at takes thousands of tokens, "auto" or "off": ${JSON.stringify(args.trim())} is not a number. 300 means 300k tokens.`);
	}
	const tokens = Math.round(Number(match[1].replace(",", ".")) * 1000);
	if (!Number.isSafeInteger(tokens) || tokens < MIN_THRESHOLD) {
		throw new Error(`/compact-at needs at least 1 (= ${MIN_THRESHOLD} tokens); ${text} is too small.`);
	}
	if (tokens > MAX_THRESHOLD) {
		// Catches the reflex of typing a token count: it would silently never fire.
		throw new Error(`/compact-at ${text} would be ${formatTokens(tokens)} tokens; the argument counts thousands, so 300 already means 300k.`);
	}
	return { mode: "fixed", tokens };
}

/**
 * Claude Code's rule (src/services/compact/autoCompact.ts): reserve room for the summary, then a buffer
 * that grows with the window, because one turn can add proportionally more tokens on a bigger model.
 */
export function autoThreshold(contextWindow: number, maxOutputTokens: number): number {
	const reserved = Math.min(maxOutputTokens > 0 ? maxOutputTokens : SUMMARY_RESERVE, SUMMARY_RESERVE);
	const effective = Math.max(0, contextWindow - reserved);
	const tier = effective >= 800_000 ? 50_000 : effective >= 400_000 ? 30_000 : 13_000;
	// A fixed buffer larger than a third of a small window leaves no usable context; cap it there.
	const buffer = Math.min(tier, Math.floor(effective / 3));
	return Math.max(MIN_THRESHOLD, effective - buffer);
}

export function thresholdOf(setting: Setting, contextWindow: number, maxOutputTokens: number): number | undefined {
	if (setting.mode === "off") return undefined;
	return setting.mode === "auto" ? autoThreshold(contextWindow, maxOutputTokens) : setting.tokens;
}

export function nativeThreshold(contextWindow: number): number {
	return contextWindow - NATIVE_RESERVE;
}

export function formatTokens(value: number): string {
	if (value < 10_000) return String(Math.round(value));
	const thousands = value / 1000;
	return `${thousands >= 100 || Number.isInteger(thousands) ? Math.round(thousands) : Number(thousands.toFixed(1))}k`;
}

/** The newest setting on the current branch; a fork or /reload re-reads it from the session, not from memory. */
export function settingFrom(entries: readonly { type: string; customType?: string; data?: unknown }[]): Setting {
	const last = [...entries].reverse().find((entry) => entry.type === "custom" && entry.customType === ENTRY);
	const data = last?.data as Partial<Setting> | undefined;
	if (data?.mode === "off" || data?.mode === "auto") return { mode: data.mode };
	if (data?.mode === "fixed" && typeof data.tokens === "number" && Number.isSafeInteger(data.tokens) && data.tokens >= MIN_THRESHOLD) {
		return { mode: "fixed", tokens: data.tokens };
	}
	return { mode: "off" };
}

export default function compactAt(pi: ExtensionAPI): void {
	let setting: Setting = { mode: "off" };
	let failures = 0;
	/** Token count of a compaction that pi refused as unnecessary; retry only after the context grows. */
	let refusedAt: number | null = null;
	let pending = false;

	const live = (ctx: ExtensionContext) => {
		const usage = ctx.getContextUsage();
		if (!usage || typeof usage.tokens !== "number" || usage.tokens <= 0) return undefined;
		return { tokens: usage.tokens, contextWindow: usage.contextWindow };
	};
	const maxOutput = (ctx: ExtensionContext) => ctx.model?.maxTokens ?? 0;

	const describe = (ctx: ExtensionContext): string => {
		const usage = live(ctx);
		const window = usage?.contextWindow ?? ctx.model?.contextWindow ?? 0;
		const model = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "no model";
		const lines = [
			setting.mode === "off"
				? "compact-at: off (pi's own threshold still applies)"
				: setting.mode === "auto"
					? "compact-at: auto (window-derived, Claude Code rule)"
					: `compact-at: ${formatTokens(setting.tokens)} tokens in this session`,
			`model: ${model}${window > 0 ? `, window ${formatTokens(window)}` : ""}`,
			usage
				? `now: ${formatTokens(usage.tokens)} (${Math.round((usage.tokens / usage.contextWindow) * 100)}%)`
				: "now: unknown (usage is measured again after the next reply)",
		];
		// A declared window can be smaller than what the provider really serves (codex/luna: 272k declared,
		// sessions ran at 505k). Once that is observed, a "native fires first" claim would be a lie.
		const overrun = usage !== undefined && usage.tokens > usage.contextWindow;
		if (window > 0 && overrun) {
			lines.push(`native: unknown - the declared window ${formatTokens(window)} is already below what this model served`);
		} else if (window > 0) {
			const threshold = thresholdOf(setting, window, maxOutput(ctx));
			const native = nativeThreshold(window);
			lines.push(
				threshold === undefined
					? `native: ${formatTokens(native)}`
					: `threshold: ${formatTokens(threshold)} · native: ${formatTokens(native)}${native <= threshold ? " (native fires first)" : ""}`,
			);
		}
		if (failures > 0) lines.push(`compaction failures in a row: ${failures}/${MAX_FAILURES}`);
		return lines.join("\n");
	};

	const maybeCompact = (ctx: ExtensionContext) => {
		if (pending) return;
		const usage = live(ctx);
		if (!usage) return;
		const threshold = thresholdOf(setting, usage.contextWindow, maxOutput(ctx));
		if (threshold === undefined || usage.tokens < threshold) return;
		if (refusedAt !== null && usage.tokens <= refusedAt) return;
		// Compacting aborts the turn (session.compact() starts with abort()), so never do it mid-run.
		if (!ctx.isIdle()) return;
		pending = true;
		const at = usage.tokens;
		ctx.compact({
			onComplete: () => {
				pending = false;
				failures = 0;
				refusedAt = null;
				ctx.ui.notify(`Compacted at ${formatTokens(at)} tokens.`, "info");
			},
			onError: (error) => {
				pending = false;
				const text = error instanceof Error ? error.message : String(error);
				if (/Nothing to compact|Already compacted/i.test(text)) {
					// Not a failure: the estimate is over the threshold but the branch has nothing to cut yet.
					refusedAt = at;
					return;
				}
				failures += 1;
				ctx.ui.notify(
					failures >= MAX_FAILURES
						? `compact-at: giving up after ${failures} failures (${text}). Run /compact-at again to retry.`
						: `compact-at: compaction failed (${text}).`,
					"error",
				);
			},
		});
	};

	const load = (ctx: ExtensionContext) => {
		setting = settingFrom(ctx.sessionManager.getBranch());
		failures = 0;
		refusedAt = null;
	};

	pi.on("session_start", (_event, ctx) => {
		load(ctx);
		maybeCompact(ctx);
	});
	pi.on("session_tree", (_event, ctx) => load(ctx));
	pi.on("session_compact", (_event, ctx) => {
		pending = false;
		failures = 0;
		refusedAt = null;
	});
	pi.on("agent_settled", (_event, ctx) => {
		maybeCompact(ctx);
	});

	pi.registerCommand("compact-at", {
		description: "Show or set this session's auto-compaction threshold in thousands of tokens: /compact-at <thousands>|auto|off",
		handler: async (args, ctx) => {
			const next = parseSetting(args);
			if (next) {
				setting = next;
				failures = 0;
				refusedAt = null;
				pi.appendEntry(ENTRY, next);
			}
			ctx.ui.notify(describe(ctx), "info");
			maybeCompact(ctx);
		},
	});
}
