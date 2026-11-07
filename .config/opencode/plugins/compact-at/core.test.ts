import { expect, test } from "bun:test"
import {
  MAX_THRESHOLD,
  autoThreshold,
  contextTokens,
  formatTokens,
  parseSetting,
  readSetting,
  thresholdOf,
} from "./core.js"

test("parseSetting reads thousands, auto, off, and status", () => {
  expect(parseSetting("")).toBeUndefined()
  expect(parseSetting("   ")).toBeUndefined()
  expect(parseSetting("off")).toEqual({ mode: "off" })
  expect(parseSetting("AUTO")).toEqual({ mode: "auto" })
  expect(parseSetting("300")).toEqual({ mode: "fixed", tokens: 300_000 })
  expect(parseSetting("300k")).toEqual({ mode: "fixed", tokens: 300_000 })
  expect(parseSetting("12.5")).toEqual({ mode: "fixed", tokens: 12_500 })
  expect(parseSetting("1,5")).toEqual({ mode: "fixed", tokens: 1_500 })
  expect(parseSetting("1")).toEqual({ mode: "fixed", tokens: 1_000 })
})

test("parseSetting rejects unit mistakes instead of silently never firing", () => {
  expect(() => parseSetting("0.5")).toThrow("too small")
  expect(() => parseSetting("abc")).toThrow("is not a number")
  expect(() => parseSetting("300 tokens")).toThrow("is not a number")
  expect(() => parseSetting(String(MAX_THRESHOLD / 1000 + 1))).toThrow("counts thousands")
})

test("autoThreshold reserves the summary and a window-scaled buffer", () => {
  expect(autoThreshold(200_000, 8_000)).toBe(179_000)
  expect(autoThreshold(400_000, 8_000)).toBe(379_000)
  expect(autoThreshold(500_000, 8_000)).toBe(462_000)
  expect(autoThreshold(1_000_000, 8_000)).toBe(942_000)
})

test("autoThreshold caps the summary reserve and the buffer on small windows", () => {
  expect(autoThreshold(128_000, 32_000)).toBe(95_000)
  expect(autoThreshold(30_000, 8_000)).toBe(14_667)
  expect(autoThreshold(2_000, 100_000)).toBe(1_000)
})

test("thresholdOf only derives a number for a live mode and a known window", () => {
  expect(thresholdOf({ mode: "off" }, 200_000, 8_000)).toBeUndefined()
  expect(thresholdOf({ mode: "auto" }, 0, 8_000)).toBeUndefined()
  expect(thresholdOf({ mode: "auto" }, 200_000, 8_000)).toBe(179_000)
  expect(thresholdOf({ mode: "fixed", tokens: 300_000 }, 0, 0)).toBe(300_000)
})

test("readSetting refuses malformed stored values instead of trusting them", () => {
  expect(readSetting({ mode: "off" })).toEqual({ mode: "off" })
  expect(readSetting({ mode: "auto" })).toEqual({ mode: "auto" })
  expect(readSetting({ mode: "fixed", tokens: 300_000 })).toEqual({ mode: "fixed", tokens: 300_000 })
  expect(readSetting({ mode: "fixed", tokens: 999 })).toBeUndefined()
  expect(readSetting({ mode: "fixed", tokens: 1.5 })).toBeUndefined()
  expect(readSetting({ mode: "fixed" })).toBeUndefined()
  expect(readSetting({ mode: "nope" })).toBeUndefined()
  expect(readSetting(null)).toBeUndefined()
})

test("contextTokens counts the whole next request, including cache and reasoning", () => {
  expect(
    contextTokens({
      input: 2_158,
      output: 129,
      reasoning: 40,
      cache: { read: 83_584, write: 0 },
    }),
  ).toBe(85_911)
})

test("formatTokens keeps short values exact and abbreviates thousands", () => {
  expect(formatTokens(999)).toBe("999")
  expect(formatTokens(10_000)).toBe("10k")
  expect(formatTokens(10_500)).toBe("10.5k")
  expect(formatTokens(100_000)).toBe("100k")
  expect(formatTokens(125_500)).toBe("126k")
})
