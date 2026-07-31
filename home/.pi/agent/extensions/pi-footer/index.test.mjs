import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const extensionDirectory = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { createJiti } = require("../../npm/node_modules/jiti");
const jiti = createJiti(import.meta.url, { interopDefault: true });
const footer = await jiti.import(join(extensionDirectory, "index.ts"));

const {
  formatContextUsage,
  formatHeaderLine,
  formatStatusLine,
  formatTokenCount,
  formatTpsStatus,
  formatUsageLine,
  sanitizeDisplayText,
  stripAnsi,
  truncateDisplayText,
} = footer;

test("formats the requested footer layout", () => {
  assert.equal(formatHeaderLine({
    model: "gpt-5.6-luna",
    thinking: "max",
    cwd: "~/dotfiles",
    branch: "main",
  }), "gpt-5.6-luna max <> ~/dotfiles main");

  assert.equal(formatUsageLine({
    input: 1_234,
    output: 56_789,
    cacheRead: 2_000,
    cacheWrite: 0,
    cost: 0.1234,
    contextTokens: 10_000,
    contextWindow: 128_000,
    contextPercent: 7.8125,
    tpsStatus: "\u001b[2mTPS 12.3 TPS | AVG 10.0 | TTFT 1.0s\u001b[0m",
  }), "TPS 12.3 TPS | AVG 10.0 | TTFT 1.0s ↑1.2k ↓57k R2.0k $0.123 7.8%/128k");
});

test("sanitizes extension status values and keeps MCP first", () => {
  const statuses = new Map([
    ["goal", "\u001b[32mactive 1m\u001b[0m"],
    ["pi-tps", "TPS - | AVG - | TTFT -"],
    ["mcp", "\u001b[34m2 servers enabled\u001b[0m"],
  ]);

  assert.equal(
    stripAnsi(formatStatusLine(statuses)),
    "MCP 2 servers enabled  GOAL active 1m",
  );
  assert.equal(sanitizeDisplayText("hello\nworld\u0000"), "hello world");
  assert.equal(formatTpsStatus("TPS - | AVG - | TTFT -"), "- | AVG - | TTFT -");
  assert.equal(formatTokenCount(1_234_567), "1.2M");
  const truncated = truncateDisplayText("\u001b[31mabcdef\u001b[0m", 5, "...");
  assert.equal(stripAnsi(truncated), "ab...");
  assert.equal(truncated.endsWith("\u001b[0m..."), true);
  assert.equal(formatContextUsage({
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    cost: 0,
    contextTokens: null,
    contextWindow: 200_000,
    contextPercent: null,
  }), "?/200k");
});

test("registers a TUI footer that renders all three rows", async () => {
  const handlers = new Map();
  let footerFactory;
  const pi = {
    on(name, handler) {
      handlers.set(name, handler);
    },
  };

  footer.default(pi);
  assert.equal(typeof handlers.get("session_start"), "function");

  const context = {
    mode: "tui",
    model: { id: "model" },
    thinkingLevel: "high",
    cwd: "/home/test/repo",
    ui: {
      setFooter(factory) {
        footerFactory = factory;
      },
    },
    sessionManager: {
      getEntries: () => [{
        type: "message",
        message: {
          role: "assistant",
          usage: {
            input: 1000,
            output: 2000,
            cacheRead: 0,
            cacheWrite: 0,
            cost: { total: 0.01 },
          },
        },
      }],
    },
    getContextUsage: () => ({ tokens: 3000, contextWindow: 100000, percent: 3 }),
  };

  await handlers.get("session_start")({}, context);
  assert.equal(typeof footerFactory, "function");

  const component = footerFactory(
    { requestRender() {} },
    { fg(_color, text) { return text; } },
    {
      onBranchChange() { return () => {}; },
      getGitBranch() { return "main"; },
      getExtensionStatuses() {
        return new Map([
          ["pi-tps", "TPS - | AVG - | TTFT -"],
          ["mcp", "1 server enabled"],
        ]);
      },
    },
  );

  assert.deepEqual(component.render(120), [
    "model high <> /home/test/repo main",
    "TPS - | AVG - | TTFT - ↑1.0k ↓2.0k $0.010 3.0%/100k",
    "MCP 1 server enabled",
  ]);
  component.dispose();
});
