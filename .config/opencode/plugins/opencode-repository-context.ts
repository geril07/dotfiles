import type { Plugin } from "@opencode-ai/plugin";
import { homedir } from "node:os";
import path from "node:path";
import { stat } from "node:fs/promises";

// Keep the standalone plugin independent of the optional @types/bun package.
declare const Bun: {
  file(path: string): {
    exists(): Promise<boolean>;
    json(): Promise<unknown>;
    text(): Promise<string>;
  };
  Glob: new (pattern: string) => {
    match(path: string): boolean;
    scan(options: {
      cwd: string;
      absolute: boolean;
      dot: boolean;
      onlyFiles: boolean;
    }): AsyncIterable<string>;
  };
};

const CONFIG_FILENAME = "repository-context.json";

type Mapping = {
  selector: string[];
  instructions: string[];
};

type RepositoryContextConfig = {
  mappings: Mapping[];
};

type InstructionFile = {
  path: string;
  content: string;
};

function globalConfigPath() {
  const directory =
    process.env.OPENCODE_CONFIG_DIR ??
    path.join(
      process.env.XDG_CONFIG_HOME ?? path.join(homedir(), ".config"),
      "opencode",
    );
  return path.join(directory, CONFIG_FILENAME);
}

function expandHome(value: string) {
  if (value === "~") return homedir();
  if (value.startsWith("~/") || value.startsWith("~\\"))
    return path.join(homedir(), value.slice(2));
  return value;
}

function slash(value: string) {
  return value.replaceAll("\\", "/");
}

function absolute(value: string) {
  return slash(path.resolve(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim() === "")
    throw new Error(`${label} must be a non-empty string`);
  return value;
}

function parseConfig(
  value: unknown,
  filepath: string,
): RepositoryContextConfig {
  if (!isRecord(value))
    throw new Error(`${filepath} must contain a JSON object`);

  const mappings = value.mappings ?? [];
  if (!Array.isArray(mappings))
    throw new Error(`${filepath}.mappings must be an array`);

  return {
    mappings: mappings.map((item, index) => {
      if (!isRecord(item))
        throw new Error(`${filepath}.mappings[${index}] must be an object`);

      const selectors = (
        Array.isArray(item.selector) ? item.selector : [item.selector]
      ).map((value, selectorIndex) => {
        const selector = expandHome(
          requireString(
            value,
            `${filepath}.mappings[${index}].selector[${selectorIndex}]`,
          ),
        );
        if (!path.isAbsolute(selector)) {
          throw new Error(
            `${filepath}.mappings[${index}].selector[${selectorIndex}] must be an absolute path or start with ~/`,
          );
        }
        return absolute(selector);
      });

      if (!Array.isArray(item.instructions)) {
        throw new Error(
          `${filepath}.mappings[${index}].instructions must be an array`,
        );
      }

      return {
        selector: selectors,
        instructions: item.instructions.map((source, sourceIndex) =>
          requireString(
            source,
            `${filepath}.mappings[${index}].instructions[${sourceIndex}]`,
          ),
        ),
      };
    }),
  };
}

async function loadConfig(filepath: string) {
  const file = Bun.file(filepath);
  if (!(await file.exists()))
    return { mappings: [] } satisfies RepositoryContextConfig;
  return parseConfig(await file.json(), filepath);
}

function matches(selectors: string[], worktree: string) {
  return selectors.some((selector) => new Bun.Glob(selector).match(worktree));
}

function hasGlobPattern(value: string) {
  return ["*", "?", "[", "]", "{", "}"].some((character) =>
    value.includes(character),
  );
}

async function expandInstructionPattern(
  pattern: string,
  configDirectory: string,
) {
  const resolved = expandHome(pattern);
  const absolutePattern = path.isAbsolute(resolved)
    ? resolved
    : path.resolve(configDirectory, resolved);

  if (!hasGlobPattern(absolutePattern)) {
    const info = await stat(absolutePattern).catch(() => undefined);
    return info?.isFile() ? [absolute(absolutePattern)] : [];
  }

  const files: string[] = [];
  for await (const item of new Bun.Glob(slash(absolutePattern)).scan({
    cwd: configDirectory,
    absolute: true,
    dot: true,
    onlyFiles: true,
  })) {
    files.push(absolute(item));
  }
  return files.toSorted();
}

async function resolveInstructionPaths(
  config: RepositoryContextConfig,
  worktree: string,
  configDirectory: string,
) {
  const paths: string[] = [];
  const seen = new Set<string>();

  for (const mapping of config.mappings) {
    if (!matches(mapping.selector, worktree)) continue;

    for (const pattern of mapping.instructions) {
      for (const filepath of await expandInstructionPattern(
        pattern,
        configDirectory,
      )) {
        if (seen.has(filepath)) continue;
        seen.add(filepath);
        paths.push(filepath);
      }
    }
  }

  return paths;
}

async function readInstruction(
  filepath: string,
): Promise<InstructionFile | undefined> {
  const file = Bun.file(filepath);
  if (!(await file.exists())) return undefined;
  const content = await file.text().catch(() => undefined);
  return content === undefined ? undefined : { path: filepath, content };
}

function render(files: InstructionFile[]) {
  return files
    .map((file) => `Instructions from: ${file.path}\n${file.content}`)
    .join("\n\n");
}

const RepositoryContextPlugin: Plugin = async ({ worktree }) => {
  const filepath = globalConfigPath();
  const config = await loadConfig(filepath);
  const currentWorktree = absolute(worktree);

  const configDirectory = path.dirname(filepath);

  return {
    "experimental.chat.system.transform": async (_input, output) => {
      const paths = await resolveInstructionPaths(
        config,
        currentWorktree,
        configDirectory,
      );
      const files = (await Promise.all(paths.map(readInstruction))).filter(
        (file): file is InstructionFile => file !== undefined,
      );
      if (files.length > 0) output.system.push(render(files));
    },
  };
};

export default RepositoryContextPlugin;
