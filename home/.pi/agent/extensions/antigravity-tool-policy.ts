import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const disabledTools = new Set(["google_search", "generate_image"]);
const withoutDisabledTools = (names: string[]) =>
  names.filter((name) => !disabledTools.has(name));

export default function antigravityToolPolicy(pi: ExtensionAPI) {
  const deactivate = () => {
    const active = pi.getActiveTools();
    const allowed = withoutDisabledTools(active);
    if (allowed.length !== active.length) pi.setActiveTools(allowed);
  };

  pi.on("session_start", deactivate);
  pi.on("session_tree", deactivate);
  pi.on("before_agent_start", (event) => {
    event.systemPromptOptions.selectedTools = withoutDisabledTools(
      event.systemPromptOptions.selectedTools,
    );
  });
  pi.on("tool_call", (event) => {
    if (disabledTools.has(event.toolName)) {
      return { block: true, reason: `${event.toolName} is disabled by local policy.` };
    }
  });
}
