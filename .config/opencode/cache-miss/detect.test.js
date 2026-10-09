import { expect, test } from "bun:test";
import { detect } from "./detect.js";

function request(id, read, input = 1000, providerID = "openai", model = "model", created = Number(id) * 1000) {
  return { id, type: "assistant", model: { providerID, id: model }, time: { created },
    tokens: { input, cache: { read, write: 0 } } };
}

test("healthy reuse and normal prompt growth do not warn", () => {
  expect(detect([request("1", 50_000)], request("2", 50_000, 5000))).toBeUndefined();
  expect(detect([request("1", 50_000)], request("2", 49_000))).toBeUndefined();
});
test("a full miss after cache activity warns, even when current is already projected", () => {
  const current = request("2", 0, 52_000);
  expect(detect([request("1", 50_000), current], current)).toContain("51,000");
});
test("first request and providers without cache reporting do not warn", () => {
  expect(detect([], request("1", 0, 50_000))).toBeUndefined();
  expect(detect([request("1", 0, 50_000)], request("2", 0, 51_000))).toBeUndefined();
  expect(detect([request("1", 50_000)], request("2", 0, 51_000, "local"))).toBeUndefined();
});
test("model switches and long gaps use observational labels", () => {
  expect(detect([request("1", 50_000)], request("2", 0, 51_000, "openai", "other"))).toContain("after model switch");
  expect(detect([request("1", 50_000)], request("2", 0, 51_000, "openai", "model", 721_000))).toContain("12m between requests");
});
test("completed compaction resets the baseline", () => {
  expect(detect([request("1", 50_000), { type: "compaction", status: "completed" }], request("2", 0, 51_000))).toBeUndefined();
});
