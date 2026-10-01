import type { ExtensionContext, ExtensionFactory } from "@earendil-works/pi-coding-agent";
import { getFastCommandCompletions, parseFastCommand } from "./commands.js";
import { getUserConfigPath, loadConfig, saveEnabled } from "./config.js";
import { getFastModePayload, toModelRef } from "./payload.js";
import { updateFastStatus } from "./status.js";
import type { FastModeConfig } from "./types.js";

function reportError(ctx: ExtensionContext, error: unknown): void {
  if (!ctx.hasUI) throw error;
  ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
}

export function createPiFastModeExtension(
  options: { agentDir?: string } = {},
): ExtensionFactory {
  return (pi) => {
    const configPath = getUserConfigPath(options.agentDir);
    let config: FastModeConfig | undefined;

    pi.registerFlag("fast", {
      description: "Enable Fast Mode for this session without changing config",
      type: "boolean",
      default: false,
    });

    pi.registerCommand("fast", {
      description: "Toggle Fast Mode. Usage: /fast [on|off|toggle]",
      getArgumentCompletions: getFastCommandCompletions,
      handler: async (args, ctx) => {
        try {
          if (!config) throw new Error(`Fast Mode config was not loaded; fix ${configPath} and run /reload`);
          const enabled = parseFastCommand(args, config.enabled);
          if (ctx.mode === "tui") await saveEnabled(configPath, enabled);
          config = { ...config, enabled };
          updateFastStatus(ctx, config, toModelRef(ctx.model));
        } catch (error) {
          reportError(ctx, error);
        }
      },
    });

    pi.on("session_start", async (_event, ctx) => {
      config = undefined;
      try {
        const loaded = await loadConfig(configPath);
        config = pi.getFlag("fast") === true ? { ...loaded, enabled: true } : loaded;
      } finally {
        updateFastStatus(ctx, config, toModelRef(ctx.model));
      }
    });

    pi.on("model_select", (event, ctx) => {
      updateFastStatus(ctx, config, toModelRef(event.model));
    });

    pi.on("before_provider_request", (event, ctx) => {
      if (!config) return undefined;
      return getFastModePayload(config, toModelRef(ctx.model), event.payload);
    });

    pi.on("session_shutdown", (_event, ctx) => {
      updateFastStatus(ctx, undefined, undefined);
    });
  };
}

export default createPiFastModeExtension();
