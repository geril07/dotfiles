import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Plugin } from "@opencode/plugin";

const execFileAsync = promisify(execFile);

export default Plugin.define({
  id: "rtk",
  async setup(ctx) {
    try {
      await execFileAsync("which", ["rtk"], { timeout: 1_000 });
    } catch {
      console.warn("[rtk] rtk binary not found in PATH — plugin disabled");
      return;
    }

    await ctx.shell.hook("create.before", async (event) => {
      if (!event.command) return;

      try {
        const result = await execFileAsync("rtk", ["rewrite", event.command], {
          timeout: 5_000,
          maxBuffer: 1_048_576,
        });
        const rewritten = result.stdout.trim();
        if (rewritten && rewritten !== event.command) {
          event.command = rewritten;
        }
      } catch {
        // A rewrite failure must not block the original command.
      }
    });
  },
});
