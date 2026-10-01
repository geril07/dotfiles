import assert from "node:assert/strict";
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createJiti } from "jiti";
import { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } from "@earendil-works/pi-coding-agent";

const directory = dirname(fileURLToPath(import.meta.url));
const jiti = createJiti(import.meta.url);
const { createPiFastModeExtension } = await jiti.import(join(directory, "index.ts"));
const { getUserConfigPath, loadConfig, parseConfig, saveEnabled } = await jiti.import(join(directory, "config.ts"));
const { getFastModePayload } = await jiti.import(join(directory, "payload.ts"));
const model = { provider: "openai-codex", id: "gpt-6.1-sol" };
const target = { provider: model.provider, model: model.id };

async function fixture(t, config = { enabled: false, targets: [target] }) {
  const agentDir = await mkdtemp(join(tmpdir(), "pi-fast-mode-test-"));
  t.after(() => rm(agentDir, { recursive: true, force: true }));
  const path = getUserConfigPath(agentDir);
  if (config !== undefined) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(config, null, 2)}\n`);
  }
  return { agentDir, path };
}

function harness(agentDir, { mode = "tui", fast = false, currentModel = model } = {}) {
  const handlers = new Map();
  const commands = new Map();
  const widgets = [];
  const errors = [];
  createPiFastModeExtension({ agentDir })({
    registerFlag() {},
    getFlag: () => fast,
    registerCommand: (name, command) => commands.set(name, command),
    on: (event, handler) => handlers.set(event, handler),
  });
  const ctx = {
    cwd: process.cwd(),
    model: currentModel,
    mode,
    hasUI: mode === "tui" || mode === "rpc",
    ui: {
      notify: (message, type) => errors.push({ message, type }),
      setWidget: (...args) => {
        assert.equal(mode, "tui", "headless sessions must not render a TUI widget");
        widgets.push(args);
      },
    },
  };
  return {
    ctx, widgets, errors,
    start: (reason = "startup") => handlers.get("session_start")({ reason }, ctx),
    shutdown: () => handlers.get("session_shutdown")({}, ctx),
    command: (args = "") => commands.get("fast").handler(args, ctx),
    select: (selected) => {
      ctx.model = selected;
      return handlers.get("model_select")({ model: selected }, ctx);
    },
    request: (payload = { model: ctx.model?.id, input: "hello" }) => handlers.get("before_provider_request")({ payload }, ctx),
    indicator: (width = 8) => widgets.at(-1)?.[1]?.().render(width),
  };
}

async function document(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

test("startup and shutdown retain manual targets, tiers, extra fields, and file bytes", async (t) => {
  const config = { enabled: true, targets: [{ ...target, serviceTier: "fast", note: "manual" }], note: "keep me" };
  const { agentDir, path } = await fixture(t, config);
  const bytes = await readFile(path, "utf8");
  const before = await stat(path);
  const session = harness(agentDir);
  await session.start();
  const payload = { model: model.id, service_tier: "auto", input: [] };
  assert.deepEqual(session.request(payload), { ...payload, service_tier: "fast" });
  assert.equal(payload.service_tier, "auto");
  assert.deepEqual(session.indicator(), ["    fast"]);
  assert.deepEqual(session.indicator(2), ["fa"]);
  assert.deepEqual(session.indicator(0), [""]);
  await session.shutdown();
  assert.equal(session.indicator(), undefined);
  assert.equal(await readFile(path, "utf8"), bytes);
  assert.equal((await stat(path)).mtimeMs, before.mtimeMs);
});

test("checked-in targets enable the new GPT-6 models for both configured providers", async () => {
  const config = parseConfig(JSON.parse(await readFile(join(directory, "../pi-openai-fast-mode.json"), "utf8")));
  for (const provider of ["openai", "openai-codex"]) {
    for (const id of ["gpt-6-astra", "gpt-6-luna", "gpt-6-sol", "gpt-6.1-sol"]) {
      const payload = { model: id };
      assert.deepEqual(getFastModePayload({ ...config, enabled: true }, { provider, id }, payload), { ...payload, service_tier: "priority" });
    }
  }
});

test("only the exact provider/model pair is changed, and model switches update the indicator", async (t) => {
  const { agentDir } = await fixture(t, { enabled: true, targets: [target] });
  const session = harness(agentDir);
  await session.start();
  assert.deepEqual(session.request(), { model: model.id, input: "hello", service_tier: "priority" });
  for (const selected of [
    { provider: "openai", id: model.id },
    { provider: "openai-codex", id: `${model.id}-other` },
    { provider: "antigravity", id: model.id },
    undefined,
  ]) {
    session.select(selected);
    assert.equal(session.request(), undefined);
    assert.equal(session.indicator(), undefined);
  }
  session.select(model);
  assert.deepEqual(session.indicator(), ["    fast"]);
  for (const payload of [null, [], "not a payload"]) assert.equal(session.request(payload), undefined);
});

test("manual edits survive /fast but change the running target list only after reload", async (t) => {
  const { agentDir, path } = await fixture(t);
  const session = harness(agentDir);
  await session.start();
  const edited = { enabled: false, targets: [{ ...target, serviceTier: "flex", note: "custom" }], other: { keep: true } };
  await writeFile(path, JSON.stringify(edited));
  await session.command("on");
  assert.deepEqual(await document(path), { ...edited, enabled: true });
  assert.equal(session.request().service_tier, "priority");
  await session.start("reload");
  assert.equal(session.request().service_tier, "flex");
  await session.command("off");
  assert.deepEqual(await document(path), edited);
  assert.equal(session.request(), undefined);
  await session.command("toggle");
  assert.equal((await document(path)).enabled, true);
  await session.command();
  assert.equal((await document(path)).enabled, false);
  assert.deepEqual((await document(path)).targets, edited.targets);
});

test("existing children retain their snapshot; new children read the saved toggle; exit cannot revert it", async (t) => {
  const { agentDir, path } = await fixture(t);
  const parent = harness(agentDir);
  const oldChild = harness(agentDir, { mode: "print" });
  await parent.start();
  await oldChild.start();
  await parent.command("on");
  const newChild = harness(agentDir, { mode: "print" });
  await newChild.start();
  assert.equal(oldChild.request(), undefined);
  assert.equal(newChild.request().service_tier, "priority");
  await oldChild.shutdown();
  assert.equal((await document(path)).enabled, true);
  await parent.command("off");
  assert.equal(newChild.request().service_tier, "priority");
  await newChild.shutdown();
  assert.equal((await document(path)).enabled, false);
});

test("headless sessions never save commands or render widgets", async (t) => {
  const { agentDir, path } = await fixture(t);
  const bytes = await readFile(path, "utf8");
  for (const mode of ["print", "json", "rpc"]) {
    const session = harness(agentDir, { mode });
    await session.start();
    await session.command("on");
    assert.equal(session.request().service_tier, "priority");
    await session.command("off");
    assert.equal(session.request(), undefined);
    await session.shutdown();
    assert.deepEqual(session.widgets, []);
    assert.equal(await readFile(path, "utf8"), bytes);
  }
});

test("--fast overrides the session toggle without writing the file in TUI or print mode", async (t) => {
  const { agentDir, path } = await fixture(t);
  const bytes = await readFile(path, "utf8");
  for (const mode of ["tui", "print"]) {
    const session = harness(agentDir, { mode, fast: true });
    await session.start();
    assert.equal(session.request().service_tier, "priority");
    await session.shutdown();
    assert.equal(await readFile(path, "utf8"), bytes);
  }
});

test("missing config is not created by startup, --fast, or shutdown", async (t) => {
  const { agentDir, path } = await fixture(t);
  await rm(path);
  const session = harness(agentDir, { fast: true });
  await session.start();
  assert.equal(session.request(), undefined);
  await session.shutdown();
  await assert.rejects(readFile(path), { code: "ENOENT" });
  await session.command("off");
  assert.deepEqual(await document(path), { enabled: false, targets: [] });
});

test("an empty target list remains empty across toggles", async (t) => {
  const { agentDir, path } = await fixture(t, { enabled: true, targets: [] });
  const session = harness(agentDir);
  await session.start();
  assert.equal(session.request(), undefined);
  await session.command("off");
  await session.command("on");
  assert.deepEqual(await document(path), { enabled: true, targets: [] });
  assert.equal(session.request(), undefined);
});

test("invalid config is reported with its path and is never repaired or overwritten", async (t) => {
  const { agentDir, path } = await fixture(t);
  const session = harness(agentDir);
  const invalid = [
    "{broken",
    "null",
    JSON.stringify({ enabled: "yes", targets: [target] }),
    JSON.stringify({ enabled: true, targets: "all" }),
    JSON.stringify({ enabled: true, targets: [null] }),
    JSON.stringify({ enabled: true, targets: [{ provider: "other", model: model.id }] }),
    JSON.stringify({ enabled: true, targets: [{ ...target, model: "" }] }),
    JSON.stringify({ enabled: true, targets: [{ ...target, serviceTier: "" }] }),
    JSON.stringify({ enabled: true, targets: [target, target] }),
  ];
  for (const bytes of invalid) {
    await writeFile(path, bytes);
    await assert.rejects(session.start(), (error) => error.message.includes(path));
    assert.equal(session.request(), undefined);
    await session.command("on");
    await session.shutdown();
    assert.equal(await readFile(path, "utf8"), bytes);
  }
});

test("a failed reload clears the old enabled state and indicator", async (t) => {
  const { agentDir, path } = await fixture(t, { enabled: true, targets: [target] });
  const session = harness(agentDir);
  await session.start();
  assert.equal(session.request().service_tier, "priority");
  await writeFile(path, "{broken");
  await assert.rejects(session.start("reload"));
  assert.equal(session.request(), undefined);
  assert.equal(session.indicator(), undefined);
});

test("a failed save does not change the current session or overwrite invalid edits", async (t) => {
  const { agentDir, path } = await fixture(t);
  const session = harness(agentDir);
  await session.start();
  await writeFile(path, "{broken");
  await session.command("on");
  assert.equal(session.request(), undefined);
  assert.equal(session.errors.at(-1).type, "error");
  assert.ok(session.errors.at(-1).message.includes(path));
  assert.equal(await readFile(path, "utf8"), "{broken");
});

test("invalid command arguments do not change session state or file contents", async (t) => {
  const { agentDir, path } = await fixture(t);
  const session = harness(agentDir);
  await session.start();
  const bytes = await readFile(path, "utf8");
  await session.command("status");
  assert.deepEqual(session.errors, [{ message: "Usage: /fast [on|off|toggle]", type: "error" }]);
  assert.equal(session.request(), undefined);
  assert.equal(await readFile(path, "utf8"), bytes);
});

test("saving through a config symlink retains the link, target permissions, and custom fields", async (t) => {
  const { agentDir, path } = await fixture(t);
  const actualPath = join(agentDir, "manual.json");
  const config = { enabled: false, targets: [{ ...target, serviceTier: "fast" }], note: "keep" };
  await writeFile(actualPath, JSON.stringify(config));
  await chmod(actualPath, 0o640);
  await rm(path);
  await symlink(actualPath, path);
  await saveEnabled(path, true);
  assert.equal((await lstat(path)).isSymbolicLink(), true);
  assert.equal((await stat(actualPath)).mode & 0o777, 0o640);
  assert.deepEqual(await document(actualPath), { ...config, enabled: true });
  assert.deepEqual(await readdir(dirname(path)), ["pi-openai-fast-mode.json"]);
});

test("a dangling config symlink is not replaced by a toggle", async (t) => {
  const { path } = await fixture(t);
  await rm(path);
  await symlink(join(dirname(path), "missing.json"), path);
  await assert.rejects(saveEnabled(path, true), /broken symlink/);
  assert.equal((await lstat(path)).isSymbolicLink(), true);
});

test("Pi SDK discovers the local extension once and applies its headless request hook", async (t) => {
  const { agentDir, path } = await fixture(t, { enabled: true, targets: [target] });
  const previousAgentDir = process.env.PI_CODING_AGENT_DIR;
  process.env.PI_CODING_AGENT_DIR = agentDir;
  t.after(() => {
    if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
  });
  await symlink(directory, join(agentDir, "extensions", "pi-openai-fast-mode"), "dir");
  const bytes = await readFile(path, "utf8");
  const settingsManager = SettingsManager.inMemory({ defaultProjectTrust: "never" });
  const loader = new DefaultResourceLoader({
    cwd: agentDir, agentDir, settingsManager,
    noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true,
  });
  await loader.reload();
  const extensions = loader.getExtensions();
  assert.deepEqual(extensions.errors, []);
  assert.equal(extensions.extensions.length, 1);
  assert.deepEqual([...extensions.extensions[0].commands.keys()], ["fast"]);
  const modelRuntime = await ModelRuntime.create({
    authPath: join(agentDir, "auth.json"), modelsPath: null,
    modelsStorePath: join(agentDir, "models-store.json"), refreshOnCreate: false,
  });
  const selected = {
    ...model, name: "Manual test model", api: "openai-codex-responses",
    baseUrl: "https://chatgpt.com/backend-api/codex", reasoning: true, input: ["text"],
    contextWindow: 100000, maxTokens: 1000,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  };
  const { session } = await createAgentSession({
    cwd: agentDir, agentDir, settingsManager, resourceLoader: loader, modelRuntime,
    model: selected, sessionManager: SessionManager.inMemory(agentDir), tools: [],
  });
  t.after(() => session.dispose());
  const errors = [];
  await session.bindExtensions({ mode: "print", onError: (error) => errors.push(error) });
  assert.deepEqual(errors, []);
  const payload = { model: model.id, input: [] };
  assert.deepEqual(await session.extensionRunner.emitBeforeProviderRequest(payload), { ...payload, service_tier: "priority" });
  await session.prompt("/fast off");
  assert.deepEqual(await session.extensionRunner.emitBeforeProviderRequest(payload), payload);
  await session.extensionRunner.emit({ type: "session_shutdown", reason: "quit" });
  assert.equal(await readFile(path, "utf8"), bytes);
});
