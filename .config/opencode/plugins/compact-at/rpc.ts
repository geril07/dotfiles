import { Rpc } from "@opencode/plugin/rpc"

// The server half owns the setting. Plugin storage is not reachable over HTTP, and instruction
// entries would be injected into the model prompt, so RPC is the bridge the TUI talks to.

const setting = {
  type: "object",
  properties: {
    mode: { type: "string", enum: ["off", "auto", "fixed"] },
    tokens: { type: "number" },
  },
  required: ["mode"],
  additionalProperties: false,
} as const

const status = {
  type: "object",
  properties: {
    setting,
    tokens: { type: "number" },
    contextWindow: { type: "number" },
    threshold: { type: "number" },
    model: { type: "string" },
    failures: { type: "number" },
    maxFailures: { type: "number" },
    pending: { type: "boolean" },
  },
  required: ["setting", "failures", "maxFailures", "pending"],
  additionalProperties: false,
} as const

export const CompactAt = Rpc.define({
  id: "compact-at",
  methods: {
    status: {
      input: {
        type: "object",
        properties: { sessionID: { type: "string" } },
        required: ["sessionID"],
        additionalProperties: false,
      },
      output: status,
    },
    set: {
      input: {
        type: "object",
        properties: {
          sessionID: { type: "string" },
          setting,
        },
        required: ["sessionID", "setting"],
        additionalProperties: false,
      },
      output: status,
      errors: {
        invalid: {
          type: "object",
          properties: { message: { type: "string" } },
          required: ["message"],
          additionalProperties: false,
        },
      },
    },
    compactNow: {
      input: {
        type: "object",
        properties: { sessionID: { type: "string" } },
        required: ["sessionID"],
        additionalProperties: false,
      },
      output: status,
    },
  },
  events: {
    changed: {
      schema: {
        type: "object",
        properties: { sessionID: { type: "string" } },
        required: ["sessionID"],
        additionalProperties: false,
      },
    },
    compacted: {
      schema: {
        type: "object",
        properties: {
          sessionID: { type: "string" },
          tokens: { type: "number" },
        },
        required: ["sessionID", "tokens"],
        additionalProperties: false,
      },
    },
    failed: {
      schema: {
        type: "object",
        properties: {
          sessionID: { type: "string" },
          message: { type: "string" },
          failures: { type: "number" },
          givingUp: { type: "boolean" },
        },
        required: ["sessionID", "message", "failures", "givingUp"],
        additionalProperties: false,
      },
    },
  },
})
