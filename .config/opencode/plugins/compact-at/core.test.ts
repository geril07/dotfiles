import { expect, test } from "bun:test"
import {
  MAX_THRESHOLD,
  contextTokens,
  formatTokens,
  parseSetting,
  readSetting,
  thresholdOf,
} from "./core.js"

test("parseSetting reads thousands, off, and status", () => {
  expect(parseSetting("")).toBeUndefined()
  expect(parseSetting("   ")).toBeUndefined()
  expect(parseSetting("off")).toEqual({ mode: "off" })
  expect(parseSetting("300")).toEqual({ mode: "fixed", tokens: 300_000 })
  expect(parseSetting("300k")).toEqual({ mode: "fixed", tokens: 300_000 })
  expect(parseSetting("12.5")).toEqual({ mode: "fixed", tokens: 12_500 })
  expect(parseSetting("1,5")).toEqual({ mode: "fixed", tokens: 1_500 })
  expect(parseSetting("1")).toEqual({ mode: "fixed", tokens: 1_000 })
})

test("parseSetting rejects unit mistakes instead of silently never firing", () => {
  expect(() => parseSetting("0.5")).toThrow("too small")
  expect(() => parseSetting("abc")).toThrow("is not a number")
  expect(() => parseSetting("auto")).toThrow("is not a number")
  expect(() => parseSetting("300 tokens")).toThrow("is not a number")
  expect(() => parseSetting(String(MAX_THRESHOLD / 1000 + 1))).toThrow("counts thousands")
})

test("thresholdOf only derives a number for a live mode", () => {
  expect(thresholdOf({ mode: "off" })).toBeUndefined()
  expect(thresholdOf({ mode: "fixed", tokens: 300_000 })).toBe(300_000)
})

test("readSetting refuses malformed stored values instead of trusting them", () => {
  expect(readSetting({ mode: "off" })).toEqual({ mode: "off" })
  expect(readSetting({ mode: "fixed", tokens: 300_000 })).toEqual({ mode: "fixed", tokens: 300_000 })
  expect(readSetting({ mode: "auto" })).toBeUndefined()
  expect(readSetting({ mode: "fixed", tokens: 999 })).toBeUndefined()
  expect(readSetting({ mode: "fixed", tokens: 1.5 })).toBeUndefined()
  expect(readSetting({ mode: "fixed" })).toBeUndefined()
  expect(readSetting({ mode: "nope" })).toBeUndefined()
  expect(readSetting(null)).toBeUndefined()
})

test("contextTokens sums every reported bucket", () => {
  expect(contextTokens({ input: 10, output: 5, reasoning: 2, cache: { read: 100, write: 3 } })).toBe(120)
})

test("formatTokens keeps short counts and abbreviates large ones", () => {
  expect(formatTokens(9_999)).toBe("9999")
  expect(formatTokens(12_500)).toBe("12.5k")
  expect(formatTokens(300_000)).toBe("300k")
})
