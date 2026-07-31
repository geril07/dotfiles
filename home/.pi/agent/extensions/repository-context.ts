import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const CONFIG_FILENAME = "repository-context.json";
const GLOB_CHARACTERS = ["*", "?", "[", "]", "{", "}"];

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
  if (value.startsWith("~/") || value.startsWith("~\\")) {
    return path.join(homedir(), value.slice(2));
  }
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
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function parseConfig(
  value: unknown,
  filepath: string,
): RepositoryContextConfig {
  if (!isRecord(value)) {
    throw new Error(`${filepath} must contain a JSON object`);
  }

  const mappings = value.mappings ?? [];
  if (!Array.isArray(mappings)) {
    throw new Error(`${filepath}.mappings must be an array`);
  }

  return {
    mappings: mappings.map((item, index) => {
      if (!isRecord(item)) {
        throw new Error(`${filepath}.mappings[${index}] must be an object`);
      }

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
  try {
    const content = await readFile(filepath, "utf8");
    return parseConfig(JSON.parse(content) as unknown, filepath);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return { mappings: [] } satisfies RepositoryContextConfig;
    }
    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function hasGlobPattern(value: string) {
  return GLOB_CHARACTERS.some((character) => value.includes(character));
}

/**
 * Bun.Glob used by the OpenCode plugin includes dot files. Node's
 * path.matchesGlob follows the usual hidden-file exclusion, so use a small
 * compatible matcher here to retain the existing `dot: true` behavior.
 */
function globToRegExp(pattern: string) {
  let index = 0;

  const escape = (value: string) =>
    value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");

  const parseSequence = (stopAt?: Set<string>): string => {
    let result = "";

    while (index < pattern.length) {
      const character = pattern[index];
      if (stopAt?.has(character)) break;

      if (character === "*") {
        const isDoubleStar = pattern[index + 1] === "*";
        index += isDoubleStar ? 2 : 1;

        if (isDoubleStar) {
          if (pattern[index] === "/") {
            index += 1;
            result += "(?:.*/)?";
          } else {
            result += ".*";
          }
        } else {
          result += "[^/]*";
        }
        continue;
      }

      if (character === "?") {
        index += 1;
        result += "[^/]";
        continue;
      }

      if (character === "[") {
        const closing = pattern.indexOf("]", index + 1);
        if (closing === -1) {
          index += 1;
          result += "\\[";
          continue;
        }

        let contents = pattern.slice(index + 1, closing);
        if (contents.startsWith("!")) contents = `^${contents.slice(1)}`;
        result += `[${contents}]`;
        index = closing + 1;
        continue;
      }

      if (character === "{") {
        index += 1;
        const alternatives: string[] = [];
        const stops = new Set([",", "}"]);

        while (index < pattern.length) {
          alternatives.push(parseSequence(stops));
          if (pattern[index] === ",") {
            index += 1;
            continue;
          }
          if (pattern[index] === "}") {
            index += 1;
            result += `(?:${alternatives.join("|")})`;
            break;
          }

          result += `\\{${alternatives.join(",")}`;
          break;
        }
        continue;
      }

      index += 1;
      result += escape(character);
    }

    return result;
  };

  return new RegExp(`^${parseSequence()}$`);
}

function matchesGlob(pattern: string, value: string) {
  return globToRegExp(slash(pattern)).test(slash(value));
}

function matches(selectors: string[], worktree: string) {
  return selectors.some((selector) => matchesGlob(selector, worktree));
}

function globRoot(pattern: string) {
  const firstGlob = GLOB_CHARACTERS.reduce((first, character) => {
    const index = pattern.indexOf(character);
    return index === -1 ? first : Math.min(first, index);
  }, pattern.length);

  const prefix = pattern.slice(0, firstGlob);
  const separator = Math.max(prefix.lastIndexOf("/"), prefix.lastIndexOf("\\"));
  if (separator === -1) return path.parse(pattern).root || path.dirname(pattern);

  return prefix.slice(0, separator) || path.parse(pattern).root;
}

async function scanFiles(root: string) {
  const files: string[] = [];

  async function visit(directory: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const filepath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await visit(filepath);
        continue;
      }

      if (!entry.isFile() && !entry.isSymbolicLink()) continue;
      const info = await stat(filepath).catch(() => undefined);
      if (info?.isFile()) files.push(absolute(filepath));
    }
  }

  await visit(root);
  return files;
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

  const root = globRoot(absolutePattern);
  const candidates = await scanFiles(root);
  return candidates.filter((filepath) =>
    matchesGlob(absolutePattern, filepath),
  ).sort();
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
  const content = await readFile(filepath, "utf8").catch(() => undefined);
  return content === undefined ? undefined : { path: filepath, content };
}

function render(files: InstructionFile[]) {
  return files
    .map((file) => `Instructions from: ${file.path}\n${file.content}`)
    .join("\n\n");
}

export default async function repositoryContextExtension(pi: ExtensionAPI) {
  const filepath = globalConfigPath();
  const configDirectory = path.dirname(filepath);
  let config: RepositoryContextConfig;

  try {
    config = await loadConfig(filepath);
  } catch (error) {
    config = { mappings: [] };
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[repository-context] Failed to load ${filepath}: ${message}`);
  }

  pi.on("before_agent_start", async (event, ctx) => {
    try {
      const paths = await resolveInstructionPaths(
        config,
        absolute(ctx.cwd),
        configDirectory,
      );
      const files = (await Promise.all(paths.map(readInstruction))).filter(
        (file): file is InstructionFile => file !== undefined,
      );

      if (files.length === 0) return;

      return {
        systemPrompt: `${event.systemPrompt}\n\n${render(files)}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[repository-context] Failed to resolve context: ${message}`);
    }
  });
}
