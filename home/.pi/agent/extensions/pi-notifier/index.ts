import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import {
  execFile,
  execFileSync,
  spawn,
  type ChildProcess,
} from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

/**
 * A Pi port of @mohak34/opencode-notifier.
 *
 * Pi does not expose OpenCode's event bus, so this extension maps the useful
 * events onto Pi lifecycle events:
 *
 * - session_start (startup) -> client_connected; new/fork -> session_started
 * - input -> user_message
 * - agent_settled -> complete/subagent_complete/error/user_cancelled
 * - tool_execution_start -> question/permission/plan_exit for matching tools
 *
 * Permission prompts and plan mode are not built into Pi. Their events are
 * therefore emitted only when an extension provides a matching tool.
 */

export const NOTIFIER_EVENTS = [
  "permission",
  "complete",
  "subagent_complete",
  "error",
  "question",
  "interrupted",
  "user_cancelled",
  "plan_exit",
  "session_started",
  "user_message",
  "client_connected",
] as const;

export type NotifierEvent = (typeof NOTIFIER_EVENTS)[number];
export type NotificationSystem =
  | "auto"
  | "osascript"
  | "node-notifier"
  | "ghostty";

export interface EventConfig {
  sound: boolean;
  notification: boolean;
  command: boolean;
  bell: boolean;
}

export interface NotifierConfig {
  enabled: boolean;
  sound: boolean;
  notification: boolean;
  bell: boolean;
  timeout: number;
  showProjectName: boolean;
  showFullPath: boolean;
  showSessionTitle: boolean;
  showIcon: boolean;
  customIconPath: string | null;
  suppressWhenFocused: boolean;
  notificationSystem: NotificationSystem;
  suppressGhosttySound: boolean;
  linux: {
    grouping: boolean;
  };
  minDuration: number;
  command: {
    enabled: boolean;
    path: string;
    args?: string[];
    minDuration: number;
  };
  events: Record<NotifierEvent, EventConfig>;
  messages: Record<NotifierEvent, string>;
  sounds: Record<NotifierEvent, string | null>;
  volumes: Record<NotifierEvent, number>;
}

const DEFAULT_EVENT_CONFIG: EventConfig = {
  sound: true,
  notification: true,
  command: true,
  bell: false,
};

const DEFAULT_MESSAGES: Record<NotifierEvent, string> = {
  permission: "Session needs permission: {sessionTitle}",
  complete: "Session has finished: {sessionTitle}",
  subagent_complete: "Subagent task completed: {sessionTitle}",
  error: "Session encountered an error: {sessionTitle}",
  question: "Session has a question: {sessionTitle}",
  interrupted: "Session was interrupted: {sessionTitle}",
  user_cancelled: "Session was cancelled by user: {sessionTitle}",
  plan_exit: "Plan ready for review: {sessionTitle}",
  session_started: "Session started: {sessionTitle}",
  user_message: "User sent a message: {sessionTitle}",
  client_connected: "Pi connected",
};

const DEFAULT_SOUNDS: Record<NotifierEvent, string | null> = {
  permission: null,
  complete: null,
  subagent_complete: null,
  error: null,
  question: null,
  interrupted: null,
  user_cancelled: null,
  plan_exit: null,
  session_started: null,
  user_message: null,
  client_connected: null,
};

const DEFAULT_VOLUMES: Record<NotifierEvent, number> = {
  permission: 1,
  complete: 1,
  subagent_complete: 1,
  error: 1,
  question: 1,
  interrupted: 1,
  user_cancelled: 1,
  plan_exit: 1,
  session_started: 1,
  user_message: 1,
  client_connected: 1,
};

function defaultEvents(global: EventConfig): Record<NotifierEvent, EventConfig> {
  return {
    permission: { ...global },
    complete: { ...global },
    subagent_complete: {
      ...global,
      sound: false,
      notification: false,
    },
    error: { ...global },
    question: { ...global },
    interrupted: { ...global },
    user_cancelled: {
      ...global,
      sound: false,
      notification: false,
    },
    plan_exit: { ...global },
    session_started: { ...global, notification: false },
    user_message: { ...global, notification: false },
    client_connected: { ...global, notification: false },
  };
}

const DEFAULT_CONFIG: NotifierConfig = {
  enabled: true,
  sound: true,
  notification: true,
  bell: false,
  timeout: 5,
  showProjectName: true,
  showFullPath: false,
  showSessionTitle: true,
  showIcon: true,
  customIconPath: null,
  suppressWhenFocused: true,
  notificationSystem: "auto",
  suppressGhosttySound: false,
  linux: {
    grouping: false,
  },
  minDuration: 0,
  command: {
    enabled: false,
    path: "",
    args: ["--event", "{event}", "--message", "{message}"],
    minDuration: 0,
  },
  events: defaultEvents(DEFAULT_EVENT_CONFIG),
  messages: { ...DEFAULT_MESSAGES },
  sounds: { ...DEFAULT_SOUNDS },
  volumes: { ...DEFAULT_VOLUMES },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function finiteNumberOr(value: unknown, fallback: number, minimum?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  if (minimum !== undefined && value < minimum) return fallback;
  return value;
}

function parseVolume(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function parseNullableString(value: unknown, fallback: string | null): string | null {
  if (value === null) return null;
  return typeof value === "string" ? value : fallback;
}

function parseEventConfig(value: unknown, fallback: EventConfig): EventConfig {
  if (typeof value === "boolean") {
    return {
      sound: value,
      notification: value,
      command: value,
      bell: fallback.bell,
    };
  }

  if (!isRecord(value)) return { ...fallback };

  return {
    sound: booleanOr(value.sound, fallback.sound),
    notification: booleanOr(value.notification, fallback.notification),
    command: booleanOr(value.command, fallback.command),
    bell: booleanOr(value.bell, fallback.bell),
  };
}

function cloneConfig(config: NotifierConfig): NotifierConfig {
  return {
    ...config,
    linux: { ...config.linux },
    command: {
      ...config.command,
      args: config.command.args ? [...config.command.args] : undefined,
    },
    events: Object.fromEntries(
      NOTIFIER_EVENTS.map((event) => [event, { ...config.events[event] }]),
    ) as Record<NotifierEvent, EventConfig>,
    messages: { ...config.messages },
    sounds: { ...config.sounds },
    volumes: { ...config.volumes },
  };
}

function expandHome(value: string): string {
  if (value === "~") return homedir();
  if (value.startsWith("~/") || value.startsWith("~\\")) {
    return join(homedir(), value.slice(2));
  }
  return value;
}

function resolveConfiguredPath(value: string, baseDirectory = homedir()): string {
  const expanded = expandHome(value);
  return isAbsolute(expanded) ? expanded : resolve(baseDirectory, expanded);
}

export function getAgentDirectory(env: NodeJS.ProcessEnv = process.env): string {
  return resolveConfiguredPath(
    env.PI_CODING_AGENT_DIR || join("~", ".pi", "agent"),
  );
}

export function getConfigCandidates(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  if (env.PI_NOTIFIER_CONFIG_PATH) {
    return [resolveConfiguredPath(env.PI_NOTIFIER_CONFIG_PATH)];
  }

  const xdgConfig = resolveConfiguredPath(
    env.XDG_CONFIG_HOME || join("~", ".config"),
  );
  const agentDirectory = getAgentDirectory(env);

  return [
    join(agentDirectory, "pi-notifier.json"),
    join(xdgConfig, "pi", "pi-notifier.json"),
    // Keep the existing OpenCode config usable as a compatibility fallback.
    join(xdgConfig, "opencode", "opencode-notifier.json"),
  ];
}

export function getConfigPath(env: NodeJS.ProcessEnv = process.env): string {
  const candidates = getConfigCandidates(env);
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

export function getStatePath(env: NodeJS.ProcessEnv = process.env): string {
  if (env.PI_NOTIFIER_STATE_PATH) {
    return resolveConfiguredPath(env.PI_NOTIFIER_STATE_PATH);
  }
  return join(getAgentDirectory(env), "pi-notifier-state.json");
}

export function parseNotifierConfig(value: unknown): NotifierConfig {
  if (!isRecord(value)) {
    throw new Error("Notifier config must contain a JSON object");
  }

  const globalSound = booleanOr(value.sound, DEFAULT_CONFIG.sound);
  const globalNotification = booleanOr(
    value.notification,
    DEFAULT_CONFIG.notification,
  );
  const globalBell = booleanOr(value.bell, DEFAULT_CONFIG.bell);
  const globalEvent: EventConfig = {
    sound: globalSound,
    notification: globalNotification,
    command: true,
    bell: globalBell,
  };
  const defaults = defaultEvents(globalEvent);
  const configuredEvents = isRecord(value.events) ? value.events : {};
  const configuredMessages = isRecord(value.messages) ? value.messages : {};
  const configuredSounds = isRecord(value.sounds) ? value.sounds : {};
  const configuredVolumes = isRecord(value.volumes) ? value.volumes : {};

  const events = {} as Record<NotifierEvent, EventConfig>;
  const messages = {} as Record<NotifierEvent, string>;
  const sounds = {} as Record<NotifierEvent, string | null>;
  const volumes = {} as Record<NotifierEvent, number>;

  for (const event of NOTIFIER_EVENTS) {
    // Root-level event keys are accepted for compatibility with older configs.
    const configuredEvent =
      configuredEvents[event] ?? value[event] ?? undefined;
    events[event] = parseEventConfig(configuredEvent, defaults[event]);

    const configuredMessage = configuredMessages[event];
    messages[event] =
      typeof configuredMessage === "string"
        ? configuredMessage
        : DEFAULT_MESSAGES[event];

    sounds[event] = parseNullableString(
      configuredSounds[event],
      DEFAULT_SOUNDS[event],
    );
    volumes[event] = parseVolume(
      configuredVolumes[event],
      DEFAULT_VOLUMES[event],
    );
  }

  const configuredCommand = isRecord(value.command) ? value.command : {};
  const configuredArgs = Array.isArray(configuredCommand.args)
    ? configuredCommand.args.filter(
        (argument): argument is string => typeof argument === "string",
      )
    : undefined;
  const configuredLinux = isRecord(value.linux) ? value.linux : {};
  const configuredSystem = value.notificationSystem;
  const notificationSystem: NotificationSystem =
    configuredSystem === "ghostty"
      ? "ghostty"
      : configuredSystem === "osascript"
        ? "osascript"
        : configuredSystem === "node-notifier"
          ? "node-notifier"
          : "auto";

  return {
    enabled: booleanOr(value.enabled, DEFAULT_CONFIG.enabled),
    sound: globalSound,
    notification: globalNotification,
    bell: globalBell,
    timeout: finiteNumberOr(value.timeout, DEFAULT_CONFIG.timeout, 0.001),
    showProjectName: booleanOr(
      value.showProjectName,
      DEFAULT_CONFIG.showProjectName,
    ),
    showFullPath: booleanOr(value.showFullPath, DEFAULT_CONFIG.showFullPath),
    showSessionTitle: booleanOr(
      value.showSessionTitle,
      DEFAULT_CONFIG.showSessionTitle,
    ),
    showIcon: booleanOr(value.showIcon, DEFAULT_CONFIG.showIcon),
    customIconPath: parseNullableString(
      value.customIconPath,
      DEFAULT_CONFIG.customIconPath,
    ),
    suppressWhenFocused: booleanOr(
      value.suppressWhenFocused,
      DEFAULT_CONFIG.suppressWhenFocused,
    ),
    notificationSystem,
    suppressGhosttySound: booleanOr(
      value.suppressGhosttySound,
      DEFAULT_CONFIG.suppressGhosttySound,
    ),
    linux: {
      grouping: booleanOr(
        configuredLinux.grouping,
        DEFAULT_CONFIG.linux.grouping,
      ),
    },
    minDuration: finiteNumberOr(
      value.minDuration,
      DEFAULT_CONFIG.minDuration,
      0,
    ),
    command: {
      enabled: booleanOr(
        configuredCommand.enabled,
        DEFAULT_CONFIG.command.enabled,
      ),
      path:
        typeof configuredCommand.path === "string"
          ? configuredCommand.path
          : DEFAULT_CONFIG.command.path,
      args: configuredArgs ?? DEFAULT_CONFIG.command.args,
      minDuration: finiteNumberOr(
        configuredCommand.minDuration,
        DEFAULT_CONFIG.command.minDuration,
        0,
      ),
    },
    events,
    messages,
    sounds,
    volumes,
  };
}

export function loadConfig(
  filepath = getConfigPath(),
): NotifierConfig {
  if (!existsSync(filepath)) return cloneConfig(DEFAULT_CONFIG);

  try {
    return parseNotifierConfig(
      JSON.parse(readFileSync(filepath, "utf8")) as unknown,
    );
  } catch (error) {
    console.error(
      `[pi-notifier] Failed to load ${filepath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return cloneConfig(DEFAULT_CONFIG);
  }
}

export function sanitizeText(value: string, maxLength = 500): string {
  const normalized = value
    .replace(/[\u0000-\u001f\u007f\u0080-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
    : normalized;
}

export interface MessageContext {
  sessionTitle?: string | null;
  agentName?: string | null;
  projectName?: string | null;
  timestamp?: string | null;
  turn?: number | null;
}

export function interpolateMessage(
  message: string,
  context: MessageContext,
): string {
  const values: Record<string, string> = {
    sessionTitle: context.sessionTitle ?? "",
    agentName: context.agentName ?? "",
    projectName: context.projectName ?? "",
    timestamp: context.timestamp ?? "",
    turn: context.turn == null ? "" : String(context.turn),
  };

  let result = message;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{${key}}`, value);
  }

  // Match OpenCode notifier behavior when {sessionTitle} is intentionally
  // hidden: "Session has finished: " becomes "Session has finished".
  return result
    .replace(/\s*[:\-|]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function formatTimestamp(date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function summarizePrompt(prompt: string | undefined): string {
  return prompt ? sanitizeText(prompt, 120) : "";
}

function textFromMessage(message: unknown): string {
  if (!isRecord(message)) return "";
  const content = message.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .filter(isRecord)
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join(" ");
}

function titleFromContext(
  ctx: ExtensionContext,
  fallbackPrompt: string | undefined,
): string {
  const named = ctx.sessionManager.getSessionName();
  if (named) return sanitizeText(named, 160);

  const branch = ctx.sessionManager.getBranch();
  for (let index = branch.length - 1; index >= 0; index -= 1) {
    const entry = branch[index] as unknown;
    if (!isRecord(entry) || entry.type !== "message") continue;
    const message = entry.message;
    if (isRecord(message) && message.role === "user") {
      const title = summarizePrompt(textFromMessage(message));
      if (title) return title;
    }
  }

  return summarizePrompt(fallbackPrompt);
}

export function projectNameFor(cwd: string, config: NotifierConfig): string {
  return config.showFullPath ? cwd : basename(cwd);
}

export function notificationTitle(
  projectName: string,
  config: NotifierConfig,
): string {
  const safeProjectName = sanitizeText(projectName, 300);
  return config.showProjectName && safeProjectName
    ? `Pi (${safeProjectName})`
    : "Pi";
}

export function extractAgentName(
  sessionTitle: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const childAgent = env.PI_SUBAGENT_CHILD_AGENT;
  if (childAgent) return sanitizeText(childAgent, 80);

  const match = sessionTitle.match(/\s*\(@([^\s)]+)\s+subagent\)\s*$/);
  return match ? match[1] : "";
}

export type AgentOutcome =
  | "complete"
  | "error"
  | "user_cancelled"
  | undefined;

export interface AgentOutcomeResult {
  outcome: AgentOutcome;
  errorMessage?: string;
}

export function classifyAgentOutcome(
  messages: unknown[],
): AgentOutcomeResult {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!isRecord(message) || message.role !== "assistant") continue;

    if (message.stopReason === "error") {
      return {
        outcome: "error",
        errorMessage:
          typeof message.errorMessage === "string"
            ? sanitizeText(message.errorMessage, 300)
            : undefined,
      };
    }
    if (message.stopReason === "aborted") {
      return {
        outcome: "user_cancelled",
        errorMessage:
          typeof message.errorMessage === "string"
            ? sanitizeText(message.errorMessage, 300)
            : undefined,
      };
    }
    return { outcome: "complete" };
  }

  return { outcome: undefined };
}

function runSync(
  command: string,
  args: string[],
  timeout = 500,
): string | null {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      timeout,
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    }).trim();
  } catch {
    return null;
  }
}

function activeWindowId(env: NodeJS.ProcessEnv = process.env): string | null {
  if (process.platform === "linux") {
    if (env.HYPRLAND_INSTANCE_SIGNATURE) {
      const output = runSync("hyprctl", ["activewindow", "-j"]);
      if (!output) return null;
      try {
        const data = JSON.parse(output) as { address?: unknown };
        return typeof data.address === "string" ? data.address : null;
      } catch {
        return null;
      }
    }

    if (env.NIRI_SOCKET) {
      const output = runSync("niri", ["msg", "--json", "focused-window"]);
      if (!output) return null;
      try {
        const data = JSON.parse(output) as { id?: unknown };
        return typeof data.id === "number" ? String(data.id) : null;
      } catch {
        return null;
      }
    }

    if (env.SWAYSOCK) {
      const output = runSync("swaymsg", ["-t", "get_tree"], 1000);
      if (!output) return null;
      try {
        return findFocusedSwayNode(JSON.parse(output) as unknown);
      } catch {
        return null;
      }
    }

    if (env.DISPLAY) return runSync("xdotool", ["getactivewindow"]);
    return null;
  }

  if (process.platform === "win32") {
    const script =
      "$type=Add-Type -Name FocusHelper -Namespace PiNotifier -MemberDefinition '[DllImport(\"user32.dll\")] public static extern IntPtr GetForegroundWindow();' -PassThru; $type::GetForegroundWindow()";
    return (
      runSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], 1000) ??
      runSync("pwsh", ["-NoProfile", "-NonInteractive", "-Command", script], 1000)
    );
  }

  return null;
}

function findFocusedSwayNode(value: unknown): string | null {
  if (!isRecord(value)) return null;
  if (value.focused === true && typeof value.id === "number") {
    return String(value.id);
  }

  for (const key of ["nodes", "floating_nodes"]) {
    const children = value[key];
    if (!Array.isArray(children)) continue;
    for (const child of children) {
      const result = findFocusedSwayNode(child);
      if (result) return result;
    }
  }

  return null;
}

function frontmostMacApp(env: NodeJS.ProcessEnv = process.env): string | null {
  if (process.platform !== "darwin") return null;
  const detected = runSync("osascript", [
    "-e",
    "tell application \"System Events\" to return name of first application process whose frontmost is true",
  ]);
  return detected || env.TERM_PROGRAM || null;
}

const TERMINAL_APPS = new Set([
  "terminal",
  "iterm2",
  "ghostty",
  "wezterm",
  "wezterm-gui",
  "alacritty",
  "kitty",
  "hyper",
  "warp",
  "tabby",
  "rio",
  "visual studio code",
  "code",
  "code insiders",
  "foot",
  "konsole",
  "gnome-terminal",
  "xterm",
  "tmux",
]);

function normalizeAppName(value: string): string {
  return value.trim().toLowerCase().replace(/\.app$/i, "").replace(/\s+/g, " ");
}

function tmuxPaneFocused(env: NodeJS.ProcessEnv = process.env): boolean {
  if (!env.TMUX) return true;
  const args = ["display-message"];
  if (env.TMUX_PANE) args.push("-t", env.TMUX_PANE);
  args.push("-p", "#{session_attached} #{window_active} #{pane_active}");
  const status = runSync("tmux", args);
  if (!status) return false;
  const [attached, windowActive, paneActive] = status.split(/\s+/);
  return Number(attached) > 0 && windowActive === "1" && paneActive === "1";
}

function weztermPaneFocused(env: NodeJS.ProcessEnv = process.env): boolean {
  if (!env.WEZTERM_PANE) return true;
  const output = runSync(
    "wezterm",
    ["cli", "list-clients", "--format", "json"],
    1000,
  );
  if (!output) return false;

  try {
    const clients = JSON.parse(output) as unknown;
    if (!Array.isArray(clients)) return false;
    return clients.some(
      (client) =>
        isRecord(client) &&
        String(client.focused_pane_id) === env.WEZTERM_PANE,
    );
  } catch {
    return false;
  }
}

export interface FocusSnapshot {
  windowId: string | null;
  macApp: string | null;
}

export function captureFocusSnapshot(
  env: NodeJS.ProcessEnv = process.env,
): FocusSnapshot {
  return {
    windowId: activeWindowId(env),
    macApp: frontmostMacApp(env),
  };
}

export function isTerminalFocused(
  snapshot: FocusSnapshot,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (process.platform === "darwin") {
    if (!tmuxPaneFocused(env) || !weztermPaneFocused(env)) return false;
    const app = normalizeAppName(frontmostMacApp(env) ?? "");
    return app.length > 0 && TERMINAL_APPS.has(app);
  }

  if (process.platform === "linux") {
    if (!tmuxPaneFocused(env) || !weztermPaneFocused(env)) return false;
    if (!snapshot.windowId) return false; // fail open when focus is unknowable
    return activeWindowId(env) === snapshot.windowId;
  }

  if (process.platform === "win32") {
    if (!snapshot.windowId) return false;
    return activeWindowId(env) === snapshot.windowId;
  }

  return false;
}

function sanitizeGhosttyField(value: string): string {
  return value.replace(/[;\u0007\u001b\n\r]/g, "");
}

export function formatGhosttyNotificationSequence(
  title: string,
  message: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const payload = `\u001b]9;${sanitizeGhosttyField(title)}: ${sanitizeGhosttyField(message)}\u0007`;
  if (env.TMUX) return `\u001bPtmux;\u001b${payload}\u001b\\`;
  return payload;
}

const NOTIFICATION_DEBOUNCE_MS = 1000;
const SOUND_DEBOUNCE_MS = 1000;
let lastLinuxNotificationId: number | null = null;
const lastNotificationAt = new Map<string, number>();
const lastSoundAt = new Map<string, number>();

function isDebounced(
  store: Map<string, number>,
  key: string,
  interval: number,
): boolean {
  const now = Date.now();
  const previous = store.get(key);
  if (previous !== undefined && now - previous < interval) return true;
  store.set(key, now);
  return false;
}

function iconPath(config: NotifierConfig): string | undefined {
  if (!config.showIcon) return undefined;
  const configured = config.customIconPath || process.env.PI_NOTIFIER_ICON_PATH;
  if (!configured) return undefined;
  const path = resolveConfiguredPath(configured, getAgentDirectory());
  return existsSync(path) ? path : undefined;
}

function sendLinuxNotification(
  title: string,
  message: string,
  timeout: number,
  icon: string | undefined,
  grouping: boolean,
): Promise<void> {
  if (!process.env.DBUS_SESSION_BUS_ADDRESS) return Promise.resolve();

  const baseArgs = ["--app-name", "Pi"];
  if (icon) baseArgs.push("--icon", icon);
  baseArgs.push("--expire-time", String(Math.round(timeout * 1000)));

  const invoke = (useGrouping: boolean): Promise<void> =>
    new Promise((resolvePromise) => {
      const args = [...baseArgs];
      if (useGrouping && lastLinuxNotificationId !== null) {
        args.push("--replace-id", String(lastLinuxNotificationId));
      }
      if (useGrouping) args.push("--print-id");
      args.push("--", title, message);

      execFile("notify-send", args, { encoding: "utf8", timeout: 1500 }, (error, stdout) => {
        const output = typeof stdout === "string" ? stdout.trim() : "";
        if (!error && useGrouping && /^\d+$/.test(output)) {
          lastLinuxNotificationId = Number(output);
        }
        if (error && useGrouping) {
          // notify-send versions before 0.8 do not understand replacement.
          void invoke(false).then(resolvePromise);
          return;
        }
        resolvePromise();
      });
    });

  return invoke(grouping);
}

function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function sendMacNotification(title: string, message: string): Promise<void> {
  const script = `display notification "${escapeAppleScriptString(
    message,
  )}" with title "${escapeAppleScriptString(title)}"`;
  return new Promise((resolvePromise) => {
    execFile("osascript", ["-e", script], { timeout: 1500 }, () => resolvePromise());
  });
}

function sendWindowsNotification(title: string, message: string): Promise<void> {
  return new Promise((resolvePromise) => {
    execFile("msg.exe", ["*", `${title}: ${message}`], { timeout: 1500 }, () =>
      resolvePromise(),
    );
  });
}

export function sendNotification(
  title: string,
  message: string,
  config: NotifierConfig,
): Promise<void> {
  if (isDebounced(lastNotificationAt, message, NOTIFICATION_DEBOUNCE_MS)) {
    return Promise.resolve();
  }

  if (config.notificationSystem === "ghostty") {
    // OSC 9 must never be written into Pi's JSON/RPC stdout stream.
    if (!process.stdout.isTTY) return Promise.resolve();
    return new Promise((resolvePromise) => {
      process.stdout.write(
        formatGhosttyNotificationSequence(title, message),
        () => resolvePromise(),
      );
    });
  }

  if (process.platform === "darwin") {
    return sendMacNotification(title, message);
  }
  if (process.platform === "win32") {
    return sendWindowsNotification(title, message);
  }
  if (process.platform === "linux" || process.platform.match(/BSD$/)) {
    return sendLinuxNotification(
      title,
      message,
      config.timeout,
      iconPath(config),
      config.linux.grouping,
    );
  }

  return Promise.resolve();
}

function bundledSoundPath(event: NotifierEvent): string | undefined {
  const directory = dirname(fileURLToPath(import.meta.url));
  const candidate = join(directory, "sounds", `${event}.wav`);
  return existsSync(candidate) ? candidate : undefined;
}

function soundPath(
  event: NotifierEvent,
  configuredPath: string | null,
): string | undefined {
  if (configuredPath) {
    const custom = resolveConfiguredPath(configuredPath, getAgentDirectory());
    if (existsSync(custom)) return custom;
  }
  return bundledSoundPath(event);
}

interface SoundPlayer {
  command: string;
  args: (path: string, volume: number) => string[];
}

function soundPlayers(): SoundPlayer[] {
  if (process.platform === "darwin") {
    return [
      {
        command: "afplay",
        args: (path, volume) => ["-v", String(volume), path],
      },
    ];
  }
  if (process.platform === "win32") {
    return [
      {
        command: "powershell",
        args: (path) => [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          "& { (New-Object Media.SoundPlayer $args[0]).PlaySync() }",
          path,
        ],
      },
    ];
  }
  if (process.platform === "linux") {
    return [
      {
        command: "paplay",
        args: (path, volume) => [`--volume=${Math.round(volume * 65536)}`, path],
      },
      {
        command: "aplay",
        args: (path) => [path],
      },
      {
        command: "mpv",
        args: (path, volume) => [
          "--no-video",
          "--no-terminal",
          "--script-opts=autoload-disabled=yes",
          `--volume=${Math.round(volume * 100)}`,
          path,
        ],
      },
      {
        command: "ffplay",
        args: (path, volume) => [
          "-nodisp",
          "-autoexit",
          "-loglevel",
          "quiet",
          "-volume",
          String(Math.round(volume * 100)),
          path,
        ],
      },
    ];
  }
  return [];
}

function startSoundPlayer(
  players: SoundPlayer[],
  index: number,
  path: string,
  volume: number,
  done: () => void,
): void {
  if (index >= players.length) {
    done();
    return;
  }

  let child: ChildProcess;
  try {
    child = spawn(players[index].command, players[index].args(path, volume), {
      stdio: "ignore",
      detached: true,
      windowsHide: true,
    });
  } catch {
    startSoundPlayer(players, index + 1, path, volume, done);
    return;
  }

  let started = false;
  let advanced = false;
  const advance = () => {
    if (advanced) return;
    advanced = true;
    startSoundPlayer(players, index + 1, path, volume, done);
  };

  child.once("spawn", () => {
    started = true;
    child.unref();
    done();
  });
  child.once("error", () => {
    if (!started) advance();
  });
  child.once("close", (code) => {
    if (code !== 0) advance();
  });
}

export function playSound(
  event: NotifierEvent,
  config: NotifierConfig,
): Promise<void> {
  if (isDebounced(lastSoundAt, event, SOUND_DEBOUNCE_MS)) {
    return Promise.resolve();
  }

  const path = soundPath(event, config.sounds[event]);
  if (!path) return Promise.resolve();

  const players = soundPlayers();
  const volume = Math.max(0, Math.min(1, config.volumes[event]));
  return new Promise((resolvePromise) => {
    startSoundPlayer(players, 0, path, volume, resolvePromise);
  });
}

function substituteTokens(
  value: string,
  event: NotifierEvent,
  message: string,
  context: MessageContext,
): string {
  return value
    .replaceAll("{event}", event)
    .replaceAll("{message}", message)
    .replaceAll("{sessionTitle}", context.sessionTitle ?? "")
    .replaceAll("{agentName}", context.agentName ?? "")
    .replaceAll("{projectName}", context.projectName ?? "")
    .replaceAll("{timestamp}", context.timestamp ?? "")
    .replaceAll("{turn}", context.turn == null ? "" : String(context.turn));
}

function runCustomCommand(
  config: NotifierConfig,
  event: NotifierEvent,
  message: string,
  context: MessageContext,
): void {
  if (!config.command.enabled || !config.command.path) return;

  const command = substituteTokens(config.command.path, event, message, context);
  const args = (config.command.args ?? []).map((argument) =>
    substituteTokens(argument, event, message, context),
  );

  try {
    const child = spawn(command, args, {
      stdio: "ignore",
      detached: true,
      windowsHide: true,
    });
    child.on("error", () => {});
    child.unref();
  } catch {
    // Notification integrations must never interrupt the agent.
  }
}

let turnCount: number | undefined;

function loadTurnCount(filepath: string): number {
  try {
    const value = JSON.parse(readFileSync(filepath, "utf8")) as unknown;
    if (isRecord(value) && typeof value.turn === "number" && Number.isFinite(value.turn)) {
      return Math.max(0, value.turn);
    }
  } catch {
    // Missing or malformed state starts a fresh counter.
  }
  return 0;
}

function nextTurnCount(filepath: string): number {
  if (turnCount === undefined) turnCount = loadTurnCount(filepath);
  turnCount += 1;

  try {
    mkdirSync(dirname(filepath), { recursive: true });
    writeFileSync(filepath, JSON.stringify({ turn: turnCount }), "utf8");
  } catch {
    // Persistence is best effort; notifications still work without it.
  }

  return turnCount;
}

export interface DispatchOptions {
  sessionTitle?: string;
  elapsedSeconds?: number;
  errorMessage?: string;
  focusSnapshot?: FocusSnapshot;
  statePath?: string;
}

export async function dispatchNotification(
  event: NotifierEvent,
  config: NotifierConfig,
  ctx: ExtensionContext,
  options: DispatchOptions = {},
): Promise<void> {
  if (!config.enabled) return;
  if (
    config.suppressWhenFocused &&
    options.focusSnapshot &&
    isTerminalFocused(options.focusSnapshot)
  ) {
    return;
  }

  if (
    (event === "complete" || event === "subagent_complete") &&
    options.elapsedSeconds !== undefined &&
    options.elapsedSeconds < config.minDuration
  ) {
    return;
  }

  const title = options.sessionTitle ?? titleFromContext(ctx, undefined);
  const project = sanitizeText(projectNameFor(ctx.cwd, config), 300);
  const agentName = extractAgentName(title);
  const timestamp = formatTimestamp();
  const turn = nextTurnCount(options.statePath ?? getStatePath());
  const messageContext: MessageContext = {
    sessionTitle: config.showSessionTitle ? title : "",
    agentName,
    projectName: project,
    timestamp,
    turn,
  };
  const message = sanitizeText(
    interpolateMessage(config.messages[event], messageContext),
  );
  const notificationTitle = notificationTitleFor(config, project);
  const eventConfig = config.events[event];
  const tasks: Promise<unknown>[] = [];

  if (eventConfig.notification) {
    tasks.push(sendNotification(notificationTitle, message, config));
  }

  const customSound = config.sounds[event];
  const suppressDefaultGhosttySound =
    process.platform === "darwin" &&
    config.notificationSystem === "ghostty" &&
    eventConfig.notification &&
    config.suppressGhosttySound &&
    customSound === null;
  if (eventConfig.sound && !suppressDefaultGhosttySound) {
    tasks.push(playSound(event, config));
  }

  if (eventConfig.bell && process.stdout.isTTY) {
    tasks.push(
      new Promise<void>((resolvePromise) => {
        process.stdout.write("\u0007", () => resolvePromise());
      }),
    );
  }

  const commandMinDuration = config.command.minDuration;
  const skipCommand =
    !eventConfig.command ||
    (commandMinDuration > 0 &&
      options.elapsedSeconds !== undefined &&
      options.elapsedSeconds < commandMinDuration);
  if (!skipCommand) {
    runCustomCommand(config, event, message, {
      ...messageContext,
      sessionTitle: title,
    });
  }

  await Promise.allSettled(tasks);
}

function notificationTitleFor(config: NotifierConfig, project: string): string {
  return notificationTitle(project, config);
}

const TOOL_EVENT_NAMES: Record<string, NotifierEvent> = {
  question: "question",
  ask_question: "question",
  request_question: "question",
  permission: "permission",
  ask_permission: "permission",
  request_permission: "permission",
  plan_exit: "plan_exit",
};

function isSubagentProcess(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PI_SUBAGENT_CHILD === "1" || Boolean(env.PI_SUBAGENT_CHILD_AGENT);
}

export default function piNotifier(pi: ExtensionAPI): void {
  const focusSnapshot = captureFocusSnapshot();
  const childProcess = isSubagentProcess();

  let sessionTitle = "";
  let lastPrompt = "";
  let runStartedAt: number | undefined;
  let runNumber = 0;
  let settledRunNumber = -1;
  let outcome: AgentOutcome;
  let outcomeError: string | undefined;

  const currentTitle = (ctx: ExtensionContext): string =>
    sessionTitle || titleFromContext(ctx, lastPrompt);

  const dispatch = async (
    event: NotifierEvent,
    ctx: ExtensionContext,
    options: Omit<DispatchOptions, "focusSnapshot"> = {},
  ): Promise<void> => {
    await dispatchNotification(event, loadConfig(), ctx, {
      ...options,
      sessionTitle: options.sessionTitle ?? currentTitle(ctx),
      focusSnapshot,
      statePath: getStatePath(),
    });
  };

  pi.on("session_start", async (event, ctx) => {
    sessionTitle = titleFromContext(ctx, lastPrompt);
    if (childProcess) return;
    if (event.reason === "startup") {
      await dispatch("client_connected", ctx);
    } else if (event.reason === "new" || event.reason === "fork") {
      await dispatch("session_started", ctx);
    }
  });

  pi.on("input", async (event, ctx) => {
    if (event.source === "extension") return;
    lastPrompt = event.text;
    if (!sessionTitle) sessionTitle = summarizePrompt(lastPrompt);
    if (!childProcess) await dispatch("user_message", ctx);
  });

  pi.on("agent_start", () => {
    runNumber += 1;
    runStartedAt = Date.now();
    outcome = undefined;
    outcomeError = undefined;
  });

  pi.on("agent_end", (event) => {
    const result = classifyAgentOutcome(event.messages as unknown[]);
    if (result.outcome !== undefined) {
      outcome = result.outcome;
      outcomeError = result.errorMessage;
    }
  });

  pi.on("agent_settled", async (_event, ctx) => {
    if (settledRunNumber === runNumber) return;
    settledRunNumber = runNumber;

    const elapsedSeconds =
      runStartedAt === undefined
        ? undefined
        : Math.max(0, (Date.now() - runStartedAt) / 1000);
    const event: NotifierEvent =
      outcome === "error"
        ? "error"
        : outcome === "user_cancelled"
          ? "user_cancelled"
          : childProcess
            ? "subagent_complete"
            : "complete";

    await dispatch(event, ctx, {
      elapsedSeconds,
      errorMessage: outcomeError,
    });
    runStartedAt = undefined;
  });

  pi.on("session_shutdown", async (event, ctx) => {
    if (
      event.reason === "quit" &&
      runStartedAt !== undefined &&
      settledRunNumber !== runNumber &&
      outcome === undefined
    ) {
      settledRunNumber = runNumber;
      outcome = "user_cancelled";
      await dispatch("user_cancelled", ctx, {
        elapsedSeconds: Math.max(0, (Date.now() - runStartedAt) / 1000),
      });
      runStartedAt = undefined;
    }
  });

  pi.on("tool_execution_start", async (event, ctx) => {
    const eventName = TOOL_EVENT_NAMES[event.toolName];
    if (eventName) await dispatch(eventName, ctx);
  });
}
