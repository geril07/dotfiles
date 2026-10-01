export const STATUS_KEY = "pi-openai-fast-mode";
export const DEFAULT_SERVICE_TIER = "priority";
export const SUPPORTED_PROVIDERS = ["openai", "openai-codex"] as const;

export type FastTarget = {
  provider: string;
  model: string;
  serviceTier?: string;
};

export type FastModeConfig = {
  enabled: boolean;
  targets: FastTarget[];
};

export type ModelRef = {
  provider: string;
  id: string;
};
