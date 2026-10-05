import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import { createJiti } from "jiti";
const directory = dirname(fileURLToPath(import.meta.url));
const agentDir = await mkdtemp(join(tmpdir(), "pi-model-sort-test-"));
const previousAgentDir = process.env.PI_CODING_AGENT_DIR;
process.env.PI_CODING_AGENT_DIR = agentDir;
after(async () => {
  if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
  else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
  await rm(agentDir, { recursive: true, force: true });
});
const jiti = createJiti(import.meta.url);
const { default: extension } = await jiti.import(join(directory, "index.ts"));
const { hasExplicitThinkingArg } = await jiti.import(join(directory, "sort.ts"));
const sol = { provider: "openai-codex", id: "gpt-6.1-sol" };
const luna = { provider: "openai-codex", id: "gpt-6-luna" };
const key = (model) => `${model.provider}/${model.id}`;
const configPath = join(agentDir, "extensions", "pi-model-sort.json");

async function fixture(t, { model = sol, level = "xhigh", argv = [], mode = "tui", messages = false, remembered = "medium" } = {}) {
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify({ lastUsed: { [key(sol)]: 2 }, thinking: remembered ? { [key(sol)]: remembered } : {} }));
  const originalArgv = process.argv;
  process.argv = ["node", "pi", ...argv];
  const handlers = new Map();
  const selections = [];
  const registry = {
    getAvailable: () => [sol, luna], getAll: () => [sol, luna],
    find: (provider, id) => [sol, luna].find((m) => m.provider === provider && m.id === id),
    hasConfiguredAuth: () => true,
  };
  const ctx = {
    model, mode, modelRegistry: registry,
    sessionManager: { buildContextEntries: () => messages ? [{ type: "message", message: { role: "user", content: "hello", timestamp: 0 } }] : [] },
  };
  const pi = {
    on: (name, handler) => handlers.set(name, handler),
    getThinkingLevel: () => level,
    setThinkingLevel: (next) => {
      if (next === level) return;
      const previousLevel = level;
      level = next;
      handlers.get("thinking_level_select")({ level, previousLevel }, ctx);
    },
    setModel: async (next) => {
      const previousModel = ctx.model;
      ctx.model = next;
      selections.push(next);
      pi.setThinkingLevel("xhigh");
      await handlers.get("model_select")({ model: next, previousModel, source: "set" }, ctx);
    },
  };
  extension(pi);
  t.after(() => {
    handlers.get("session_shutdown")({}, ctx);
    process.argv = originalArgv;
  });
  return {
    start: (reason = "startup") => handlers.get("session_start")({ reason }, ctx),
    select: pi.setModel, selections,
    level: () => level,
    config: async () => JSON.parse(await readFile(configPath, "utf8")),
  };
}

for (const reason of ["startup", "new"]) {
  test(`${reason} restores remembered reasoning when already on MRU`, async (t) => {
    const h = await fixture(t);
    await h.start(reason);
    assert.equal(h.level(), "medium");
    assert.equal(h.selections.length, 0);
  });
}

test("startup switches to MRU and restores its reasoning", async (t) => {
  const h = await fixture(t, { model: luna });
  await h.start();
  assert.deepEqual(h.selections, [sol]);
  assert.equal(h.level(), "medium");
});

test("explicit model without reasoning still uses remembered reasoning", async (t) => {
  const h = await fixture(t, { argv: ["--model", key(sol)] });
  await h.start();
  assert.equal(h.level(), "medium");
});

for (const argv of [["--thinking", "high"], ["--model", `${key(sol)}:high`], ["--models", `${key(sol)}:high`]]) {
  test(`explicit reasoning wins: ${argv.join(" ")}`, async (t) => {
    const h = await fixture(t, { argv, level: "high" });
    await h.start();
    assert.equal(h.level(), "high");
  });
}

test("--thinking does not trigger a startup MRU switch that resets CLI reasoning", async (t) => {
  const h = await fixture(t, { model: luna, level: "high", argv: ["--thinking", "high"] });
  await h.start();
  assert.equal(h.selections.length, 0);
  assert.equal(h.level(), "high");
  await h.select(sol);
  assert.equal(h.level(), "medium", "later manual switches still restore memory");
});

for (const reason of ["resume", "fork", "reload"]) {
  test(`${reason} preserves session reasoning`, async (t) => {
    const h = await fixture(t, { level: "low" });
    await h.start(reason);
    assert.equal(h.level(), "low");
  });
}

test("continued startup preserves session reasoning", async (t) => {
  const h = await fixture(t, { level: "low", messages: true });
  await h.start();
  assert.equal(h.level(), "low");
});

for (const flag of ["--session", "--session-id", "-c", "--continue", "--resume", "-r", "--fork"]) {
  test(`empty saved-session startup preserves reasoning: ${flag}`, async (t) => {
    const h = await fixture(t, { level: "low", argv: [flag, "saved-session"] });
    await h.start();
    assert.equal(h.level(), "low");
  });
}

for (const mode of ["rpc", "print", "json"]) {
  test(`${mode} leaves model, reasoning and memory unchanged`, async (t) => {
    const h = await fixture(t, { mode, model: luna });
    const before = await h.config();
    await h.start();
    assert.equal(h.level(), "xhigh");
    assert.equal(h.selections.length, 0);
    assert.deepEqual(await h.config(), before);
  });
}

test("no remembered reasoning leaves the Pi default unchanged", async (t) => {
  const h = await fixture(t, { remembered: null });
  await h.start();
  assert.equal(h.level(), "xhigh");
});

test("thinking CLI parsing respects suffixes and the end-of-options marker", () => {
  for (const argv of [["--thinking=medium"], ["--model=openai-codex/sol:medium"], ["--models", "luna,sol:medium"]]) {
    assert.equal(hasExplicitThinkingArg(argv), true);
  }
  for (const argv of [["--model", "sol"], ["--", "--thinking", "medium"], ["--thinking"], ["--model", "sol:unknown"]]) {
    assert.equal(hasExplicitThinkingArg(argv), false);
  }
});
