import { Plugin } from "@opencode/plugin";

// /compactq admits the manual compaction with queue delivery, so the runner picks it up at the
// idle boundary after the agent's final answer instead of steering it into the next step. The
// built-in /compact keeps steering, so both gestures stay available.
export default Plugin.define({
  id: "geril.compact-queue",
  async setup(ctx) {
    await ctx.command.transform((editor) => {
      editor.add({
        name: "compactq",
        description: "compact at the end of the turn instead of the next step",
        execute: async ({ sessionID }) => {
          await ctx.session.compact({ sessionID, delivery: "queue" });
        },
      });
    });
  },
});
