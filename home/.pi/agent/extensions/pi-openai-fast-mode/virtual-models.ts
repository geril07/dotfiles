import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { SUPPORTED_PROVIDERS, type ModelRef } from "./types.js";

const FAST_MODELS = [
  { id: "gpt-6.1-sol-fast", model: "gpt-6.1-sol" },
  { id: "gpt-6.1-terra-fast", model: "gpt-6.1-terra" },
  { id: "gpt-6-luna-fast", model: "gpt-6-luna" },
] as const;

export function isFastVirtualModel(model: ModelRef | undefined): boolean {
  return model !== undefined &&
    SUPPORTED_PROVIDERS.some((provider) => provider === model.provider) &&
    FAST_MODELS.some((alias) => alias.id === model.id);
}

export function registerFastModels(pi: ExtensionAPI): void {
  for (const provider of SUPPORTED_PROVIDERS) {
    for (const alias of FAST_MODELS) {
      pi.registerVirtualModel({
        provider,
        id: alias.id,
        name: alias.id,
        thinkingLevels: ["off", "minimal", "low", "medium", "high", "xhigh", "max"],
        route(request, ctx) {
          const model = ctx.modelRegistry.find(provider, alias.model);
          if (!model) throw new Error(`Fast Mode model not found: ${provider}/${alias.model}`);
          return { model, thinkingLevel: request.thinkingLevel };
        },
      });
    }
  }
}
