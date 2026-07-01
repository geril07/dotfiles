import { spawn } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const childSessions = new Set();

const resolveStateScript = () => {
  if (process.env.TMUX_OPENCODE_OVERVIEW_STATE) {
    return process.env.TMUX_OPENCODE_OVERVIEW_STATE;
  }

  let dir = dirname(realpathSync(fileURLToPath(import.meta.url)));
  for (let i = 0; i < 6; i += 1) {
    const candidate = resolve(dir, "scripts/state.sh");
    if (existsSync(candidate)) return candidate;

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
};

const STATE_SCRIPT = resolveStateScript();

const pickFirstString = (value, keys) => {
  for (const key of keys) {
    const candidate = value?.[key];
    if (typeof candidate === "string" && candidate) return candidate;
  }
  return "";
};

const sessionIDFromProperties = (properties) =>
  pickFirstString(properties, ["sessionID", "sessionId", "session_id"]);

const report = (state, reason = "", sessionID = "", tool = "") => {
  if (!STATE_SCRIPT || !process.env.TMUX_PANE) return;

  try {
    const child = spawn(
      "bash",
      [STATE_SCRIPT, state, reason, sessionID, tool],
      {
        stdio: "ignore",
        detached: true,
      },
    );
    child.on("error", () => {});
    child.unref();
  } catch {
    // OpenCode should keep running if the tmux helper is missing or broken.
  }
};

const statusToState = (status) => {
  const type = typeof status === "string" ? status : status?.type;
  switch (type) {
    case "idle":
      return ["idle", "done"];
    case "busy":
      return ["working", "busy"];
    case "retry":
      return ["working", "retry"];
    default:
      return ["unknown", "status"];
  }
};

export const TmuxOpenCodeSessionOverview = async () => ({
  event: async ({ event }) => {
    if (!event?.type) return;

    const props = event.properties ?? {};
    const sessionID = sessionIDFromProperties(props);
    const info = props.info;

    if (info?.id && info.parentID) {
      childSessions.add(info.id);
    }

    if (sessionID && childSessions.has(sessionID)) {
      switch (event.type) {
        case "permission.asked":
          report("waiting", "permission");
          break;
        case "question.asked":
          report("waiting", "question");
          break;
        case "permission.replied":
        case "question.replied":
        case "question.rejected":
          report("working", "child");
          break;
        default:
          break;
      }
      return;
    }

    switch (event.type) {
      case "session.created":
      case "session.updated":
        report("session", "", sessionID);
        break;
      case "session.status": {
        const [state, reason] = statusToState(props.status);
        report(state, reason, sessionID);
        break;
      }
      case "session.idle":
        report("idle", "done", sessionID);
        break;
      case "permission.asked":
        report("waiting", "permission", sessionID);
        break;
      case "question.asked":
        report("waiting", "question", sessionID);
        break;
      case "permission.replied":
      case "question.replied":
      case "question.rejected":
      case "session.compacted":
        report("working", "busy", sessionID);
        break;
      case "session.error":
        report("unknown", "error", sessionID);
        break;
      default:
        break;
    }
  },
});
