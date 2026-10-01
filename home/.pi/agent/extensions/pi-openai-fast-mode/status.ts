import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { findMatchingTarget } from "./payload.js";
import { STATUS_KEY, type FastModeConfig, type ModelRef } from "./types.js";

export function updateFastStatus(
  ctx: ExtensionContext,
  config: FastModeConfig | undefined,
  model: ModelRef | undefined,
): void {
  if (ctx.mode !== "tui" || !ctx.hasUI) return;
  const visible = config?.enabled && findMatchingTarget(model, config.targets);
  ctx.ui.setWidget(
    STATUS_KEY,
    visible ? () => ({
      render(width: number): string[] {
        const text = "fast".slice(0, Math.max(0, width));
        return [text.padStart(Math.max(0, width))];
      },
      invalidate(): void {},
    }) : undefined,
    { placement: "belowEditor" },
  );
}
