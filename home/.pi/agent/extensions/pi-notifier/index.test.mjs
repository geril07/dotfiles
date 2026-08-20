import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const extensionDirectory = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { createJiti } = require("../../npm/node_modules/jiti");
const jiti = createJiti(import.meta.url, { interopDefault: true });
const notifier = await jiti.import(join(extensionDirectory, "index.ts"));

const {
  NOTIFIER_EVENTS,
  classifyAgentOutcome,
  extractAgentName,
  formatGhosttyNotificationSequence,
  interpolateMessage,
  parseNotifierConfig,
  sanitizeText,
} = notifier;

await test("the checked-in config parses with every notifier event", async () => {
  const config = parseNotifierConfig(
    JSON.parse(
      await (await import("node:fs/promises")).readFile(
        join(extensionDirectory, "../../pi-notifier.json"),
        "utf8",
      ),
    ),
  );

  assert.deepEqual(Object.keys(config.events).sort(), [...NOTIFIER_EVENTS].sort());
  assert.equal(config.events.complete.notification, true);
  assert.equal(config.events.subagent_complete.notification, false);
  assert.equal(config.events.user_cancelled.sound, false);
});

test("partial and legacy event config keeps safe defaults", () => {
  const config = parseNotifierConfig({
    sound: false,
    events: {
      complete: { notification: true },
      error: false,
    },
    volumes: { complete: 2, error: -1 },
  });

  assert.equal(config.events.complete.sound, false);
  assert.equal(config.events.complete.notification, true);
  assert.equal(config.events.error.sound, false);
  assert.equal(config.events.error.notification, false);
  assert.equal(config.volumes.complete, 1);
  assert.equal(config.volumes.error, 0);
});

test("message interpolation removes empty trailing session separators", () => {
  assert.equal(
    interpolateMessage("Session has finished: {sessionTitle}", {
      sessionTitle: "",
    }),
    "Session has finished",
  );
  assert.equal(
    interpolateMessage("{event} {turn} {projectName}", {
      turn: 7,
      projectName: "dotfiles",
    }),
    "{event} 7 dotfiles",
  );
});

test("notification text strips control characters and truncates long prompts", () => {
  assert.equal(sanitizeText("hello\nworld\u0000"), "hello world");
  assert.equal(sanitizeText("123456789", 6), "12345…");
});

test("agent completion maps Pi stop reasons to notifier events", () => {
  assert.deepEqual(
    classifyAgentOutcome([
      { role: "assistant", stopReason: "error", errorMessage: "provider\nfailed" },
    ]),
    { outcome: "error", errorMessage: "provider failed" },
  );
  assert.deepEqual(
    classifyAgentOutcome([{ role: "assistant", stopReason: "aborted" }]),
    { outcome: "user_cancelled", errorMessage: undefined },
  );
  assert.deepEqual(
    classifyAgentOutcome([{ role: "assistant", stopReason: "stop" }]),
    { outcome: "complete" },
  );
});

test("subagent names and Ghostty OSC notifications are safely formatted", () => {
  assert.equal(
    extractAgentName("ignored", { PI_SUBAGENT_CHILD_AGENT: "code-reviewer" }),
    "code-reviewer",
  );
  const sequence = formatGhosttyNotificationSequence("Pi;\n", "done\u001b", {
    TMUX: "1",
  });
  assert.equal(sequence.includes(";\n"), false);
  assert.equal(sequence.startsWith("\u001bPtmux;"), true);
});

test("extension registers the Pi lifecycle hooks", async () => {
  const configDir = await mkdtemp(join(tmpdir(), "pi-notifier-test-"));
  const configPath = join(configDir, "config.json");
  const statePath = join(configDir, "state.json");
  await writeFile(
    configPath,
    JSON.stringify({
      enabled: true,
      suppressWhenFocused: false,
      sound: false,
      notification: false,
      bell: false,
      events: { complete: false },
    }),
  );

  const previousConfig = process.env.PI_NOTIFIER_CONFIG_PATH;
  const previousState = process.env.PI_NOTIFIER_STATE_PATH;
  process.env.PI_NOTIFIER_CONFIG_PATH = configPath;
  process.env.PI_NOTIFIER_STATE_PATH = statePath;

  try {
    const handlers = new Map();
    notifier.default({
      on(name, handler) {
        handlers.set(name, handler);
      },
    });
    for (const name of [
      "session_start",
      "input",
      "agent_start",
      "agent_end",
      "agent_settled",
      "session_shutdown",
      "tool_execution_start",
    ]) {
      assert.equal(typeof handlers.get(name), "function", name);
    }

    const context = {
      cwd: process.cwd(),
      sessionManager: {
        getSessionName: () => undefined,
        getBranch: () => [],
      },
    };
    await handlers.get("agent_start")({}, context);
    await handlers.get("agent_end")({
      messages: [{ role: "assistant", stopReason: "stop" }],
    }, context);
    await handlers.get("agent_settled")({}, context);
    assert.equal(JSON.parse(await (await import("node:fs/promises")).readFile(statePath, "utf8")).turn, 1);
  } finally {
    if (previousConfig === undefined) delete process.env.PI_NOTIFIER_CONFIG_PATH;
    else process.env.PI_NOTIFIER_CONFIG_PATH = previousConfig;
    if (previousState === undefined) delete process.env.PI_NOTIFIER_STATE_PATH;
    else process.env.PI_NOTIFIER_STATE_PATH = previousState;
  }
});
