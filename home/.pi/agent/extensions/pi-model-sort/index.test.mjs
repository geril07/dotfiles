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
const { AgentSession, ModelSelectorComponent } = await jiti.import("@earendil-works/pi-coding-agent");
const { hasExplicitThinkingArg, parseConfig, sortByLastUsed } = await jiti.import(join(directory, "sort.ts"));
const sol = { provider: "openai-codex", id: "gpt-6.1-sol" };
const luna = { provider: "openai-codex", id: "gpt-6-luna" };
const astra = { provider: "openai-codex", id: "gpt-6-astra" };
const sonnet = { provider: "claude-bridge", id: "claude-sonnet-5-5" };
const opus = { provider: "claude-bridge", id: "claude-opus-5-5" };
const models = [sol, luna, astra, sonnet, opus];
const key = (model) => `${model.provider}/${model.id}`;
const configPath = join(agentDir, "extensions", "pi-model-sort.json");
const levels = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];

async function fixture(t, { model = sol, level = "medium", argv = [], mode = "tui", messages = false, lastUsed = { [key(sol)]: 2 } } = {}) {
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify({ lastUsed, thinking: { [key(sol)]: "xhigh", [key(luna)]: "max" } }));
  const originalArgv = process.argv;
  process.argv = ["node", "pi", ...argv];
  const handlers = new Map();
  const selections = [];
  const registry = {
    getAvailable: () => [...models], getAll: () => [...models],
    find: (provider, id) => models.find((m) => m.provider === provider && m.id === id),
    hasConfiguredAuth: () => true,
  };
  const session = Object.create(AgentSession.prototype);
  session.agent = { state: { model, thinkingLevel: level } };
  session._scopedModels = models.map((model) => ({ model }));
  session._modelRuntime = { checkAuth: async () => true, getAvailableSnapshot: () => models };
  session.settingsManager = {
    getDefaultThinkingLevel: () => "medium",
    getModelThinkingLevel: (provider, id) => ({ [key(luna)]: "xhigh", [key(sonnet)]: "high" })[`${provider}/${id}`],
  };
  session.sessionManager = { appendModelChange: () => {}, appendThinkingLevelChange: () => {} };
  session.getAvailableThinkingLevels = () => levels;
  session._emit = () => {};
  const ctx = {
    get model() { return session.model; }, mode, modelRegistry: registry,
    sessionManager: { buildContextEntries: () => messages ? [{ type: "message", message: { role: "user", content: "hello", timestamp: 0 } }] : [] },
  };
  session._extensionRunner = {
    emit: async (event) => {
      if (event.type === "model_select") selections.push(event.model);
      await handlers.get(event.type)?.(event, ctx);
    },
  };
  const pi = {
    on: (name, handler) => handlers.set(name, handler),
    setThinkingLevel: () => { throw new Error("Model-sort must not set reasoning"); },
    getThinkingLevel: () => { throw new Error("Model-sort must not read reasoning"); },
    setModel: (next) => session.setModel(next),
  };
  const originalSort = ModelSelectorComponent.prototype.sortModels;
  const originalCycle = AgentSession.prototype._cycleScopedModel;
  extension(pi);
  t.after(() => {
    handlers.get("session_shutdown")({}, ctx);
    assert.equal(ModelSelectorComponent.prototype.sortModels, originalSort);
    assert.equal(AgentSession.prototype._cycleScopedModel, originalCycle);
    process.argv = originalArgv;
  });
  return {
    start: (reason = "startup") => handlers.get("session_start")({ reason }, ctx),
    select: (next) => session.setModel(next),
    cycle: () => session.cycleModel(),
    adjust: (next) => session.setThinkingLevel(next),
    selections, registry,
    level: () => session.thinkingLevel,
    config: async () => JSON.parse(await readFile(configPath, "utf8")),
    handlers,
  };
}

for (const reason of ["startup", "new"]) {
  test(`${reason} keeps reasoning untouched when already on MRU`, async (t) => {
    const h = await fixture(t, { level: "low" });
    await h.start(reason);
    assert.equal(h.level(), "low");
    assert.deepEqual(h.selections, []);
    assert.equal(h.handlers.has("thinking_level_select"), false);
  });
}

test("startup on another MRU model then selecting Sol uses native medium, not legacy memory", async (t) => {
  const h = await fixture(t, { lastUsed: { [key(sol)]: 1, [key(luna)]: 2 } });
  await h.start();
  assert.deepEqual(h.selections, [luna]);
  assert.equal(h.level(), "xhigh");
  await h.select(sol);
  assert.equal(h.level(), "medium");
  const config = await h.config();
  assert.equal("thinking" in config, false);
  assert.deepEqual(Object.keys(config.lastUsed).sort(), [key(sol), key(luna)].sort());
});

test("manual model selections use native defaults and update recency", async (t) => {
  const h = await fixture(t);
  await h.start();
  for (const [model, expected] of [[luna, "xhigh"], [astra, "medium"], [sonnet, "high"], [opus, "medium"], [sol, "medium"]]) {
    await h.select(model);
    assert.equal(h.level(), expected);
    assert.ok((await h.config()).lastUsed[key(model)] > 2);
  }
});

test("cycling uses MRU order and native defaults without updating recency", async (t) => {
  const lastUsed = { [key(sol)]: 5, [key(sonnet)]: 4, [key(luna)]: 3, [key(astra)]: 2, [key(opus)]: 1 };
  const h = await fixture(t, { lastUsed });
  await h.start();
  const before = await h.config();
  for (const [model, expected] of [[sonnet, "high"], [luna, "xhigh"], [astra, "medium"], [opus, "medium"], [sol, "medium"]]) {
    const result = await h.cycle();
    assert.deepEqual(result.model, model);
    assert.equal(result.thinkingLevel, expected);
  }
  assert.deepEqual(await h.config(), before);
});

test("manual reasoning changes do not write model-sort state or change native defaults", async (t) => {
  const h = await fixture(t);
  await h.start();
  const before = await h.config();
  h.adjust("high");
  assert.equal(h.level(), "high");
  assert.deepEqual(await h.config(), before);
  await h.select(luna);
  await h.select(sol);
  assert.equal(h.level(), "medium");
});

for (const argv of [["--model", key(luna)], ["--thinking", "high"], ["--model", `${key(luna)}:high`], ["--models", `${key(luna)}:high`]]) {
  test(`explicit CLI selection prevents startup MRU switch: ${argv.join(" ")}`, async (t) => {
    const h = await fixture(t, { model: luna, argv, level: "high" });
    await h.start();
    assert.deepEqual(h.selections, []);
    assert.equal(h.level(), "high");
    assert.ok((await h.config()).lastUsed[key(luna)] > 2);
  });
}

for (const reason of ["startup", "resume", "fork", "reload"]) {
  test(`${reason} preserves continued session model and reasoning`, async (t) => {
    const h = await fixture(t, { model: luna, level: "low", messages: true });
    await h.start(reason);
    assert.deepEqual(h.selections, []);
    assert.equal(h.level(), "low");
    const config = await h.config();
    if (reason !== "reload") assert.ok(config.lastUsed[key(luna)] > 2);
    else assert.equal(config.lastUsed[key(luna)], undefined);
  });
}

for (const mode of ["rpc", "print", "json"]) {
  test(`${mode} leaves model, reasoning and shared state unchanged`, async (t) => {
    const h = await fixture(t, { mode, model: luna, level: "high" });
    const before = await h.config();
    await h.start();
    assert.equal(h.level(), "high");
    assert.deepEqual(h.selections, []);
    assert.deepEqual(await h.config(), before);
  });
}

test("registry and picker sort by recency with current model pinned", async (t) => {
  const lastUsed = { [key(luna)]: 3, [key(sonnet)]: 2, [key(sol)]: 1 };
  const h = await fixture(t, { argv: ["--thinking", "medium"], lastUsed });
  await h.start("reload");
  assert.deepEqual(h.registry.getAvailable().slice(0, 3), [luna, sonnet, sol]);
  assert.deepEqual(h.registry.getAll(), h.registry.getAvailable());
  const items = models.map((model) => ({ ...model, model }));
  const sorted = ModelSelectorComponent.prototype.sortModels.call({ currentModel: sol }, items);
  assert.deepEqual(sorted.slice(0, 3).map((item) => item.model), [sol, luna, sonnet]);
  assert.deepEqual(sortByLastUsed(models, lastUsed, null).slice(0, 3), [luna, sonnet, sol]);
});

test("config parsing ignores obsolete reasoning memory and malformed timestamps", () => {
  assert.deepEqual(parseConfig({ lastUsed: { good: 1, bad: "2", infinite: Infinity }, thinking: { good: "xhigh" } }), { lastUsed: { good: 1 } });
  assert.deepEqual(parseConfig(null), { lastUsed: {} });
});

test("thinking CLI parsing respects suffixes and the end-of-options marker", () => {
  for (const argv of [["--thinking=medium"], ["--model=openai-codex/sol:medium"], ["--models", "luna,sol:medium"]]) {
    assert.equal(hasExplicitThinkingArg(argv), true);
  }
  for (const argv of [["--model", "sol"], ["--", "--thinking", "medium"], ["--thinking"], ["--model", "sol:unknown"]]) {
    assert.equal(hasExplicitThinkingArg(argv), false);
  }
});
