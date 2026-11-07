import { describe, it, expect } from "vitest";
import {
  parseEczId,
  isValidEczId,
  isValidParentEczId,
  isValidChildEczId,
  isPublicPassportCode,
  isRecognisedPassportCode,
  backendSemanticKeyFor,
  PUBLIC_PASSPORT_CODES,
  PUBLIC_TO_BACKEND_SEMANTIC_KEY,
  PUBLIC_PASSPORT_DISPLAY_NAME,
  BACKEND_SEMANTIC_KEYS,
  OBSOLETE_PASSPORT_CODES,
  CURRENT_PASSPORT_FAMILY_DEFINITIONS,
} from "../src/ecz-id.js";

const PARENT = "ECZ-GB-A93K7Q";
const CURRENT = [
  "AGENT_PASSPORT",
  "MCP_PASSPORT",
  "PLUGIN_PASSPORT",
  "API_PASSPORT",
  "IOT_DEVICE",
  "SDK_PASSPORT",
  "SERVICE_WORKLOAD_PASSPORT",
] as const;

describe("ECZ-ID parser: current seven-family contract", () => {
  it("locks exactly seven current child type codes and no eighth", () => {
    expect([...PUBLIC_PASSPORT_CODES]).toEqual(CURRENT);
    expect(PUBLIC_PASSPORT_CODES).toHaveLength(7);
    expect(CURRENT_PASSPORT_FAMILY_DEFINITIONS).toHaveLength(7);
  });
  it("accepts every current family child ID", () => {
    for (const code of CURRENT) {
      const id = `${PARENT}::${code}-4F9Q2A`;
      const parsed = parseEczId(id);
      expect(parsed.valid, id).toBe(true);
      expect(parsed.kind).toBe("child");
      expect(parsed.passportCode).toBe(code);
      expect(parsed.instanceSuffix).toBe("4F9Q2A");
      expect(parsed.family).toBeTruthy();
      expect(parsed.contractToken).toBeTruthy();
      expect(isValidChildEczId(id)).toBe(true);
      expect(isPublicPassportCode(code)).toBe(true);
      expect(PUBLIC_PASSPORT_DISPLAY_NAME[code]).toBeTruthy();
      expect(PUBLIC_TO_BACKEND_SEMANTIC_KEY[code]).toBe(code);
      expect(backendSemanticKeyFor(code)).toBe(code);
    }
  });
  it("keeps parent syntax valid", () => {
    expect(isValidParentEczId(PARENT)).toBe(true);
    expect(parseEczId(PARENT)).toMatchObject({
      valid: true,
      kind: "parent",
      parent: PARENT,
    });
  });
});

describe("legacy catalogue-era codes are not current child family IDs", () => {
  it("rejects every historical catalogue code", () => {
    expect(OBSOLETE_PASSPORT_CODES.length).toBeGreaterThan(7);
    for (const code of OBSOLETE_PASSPORT_CODES) {
      expect(isPublicPassportCode(code)).toBe(false);
      expect(isValidEczId(`${PARENT}::${code}-4F9Q2A`)).toBe(false);
    }
  });
  it("does not accept historical examples as current", () => {
    for (const id of [
      `${PARENT}::AGENT-4F9Q2A`,
      `${PARENT}::API-4F9Q2A`,
      `${PARENT}::IOT-4F9Q2A`,
      `${PARENT}::SSCM-4F9Q2A`,
    ])
      expect(parseEczId(id).reason).toBe("passport_code_unknown");
  });
});

describe("invalid identifiers remain rejected", () => {
  for (const id of [
    "ECZ-GB-EXAMPLE",
    "ECZ-gb-ABC123",
    "ECZ-GB-ABC12!",
    `${PARENT}::AGENT_PASSPORT-7F2A`,
    `${PARENT}::AGENT_PASSPORT-abc123`,
    `${PARENT}::UNKNOWN_PASSPORT-ABC123`,
    `${PARENT}::AGENT_PASSPORT::X-ABC123`,
    ` ${PARENT}`,
    "not-an-ecz-id",
    "",
  ]) {
    it(`rejects ${JSON.stringify(id)}`, () => {
      expect(isValidEczId(id)).toBe(false);
      expect(parseEczId(id).reason).not.toBeNull();
    });
  }
});

describe("back-compatible exports describe the current contract", () => {
  it("isRecognisedPassportCode is current-family recognition", () => {
    expect(isRecognisedPassportCode("AGENT_PASSPORT")).toBe(true);
    expect(isRecognisedPassportCode("AGENT")).toBe(false);
    expect(isRecognisedPassportCode("agent_passport")).toBe(false);
  });
  it("backend semantic key alias no longer invents a second taxonomy", () => {
    expect([...BACKEND_SEMANTIC_KEYS]).toEqual(CURRENT);
    expect(backendSemanticKeyFor("MCP_PASSPORT")).toBe("MCP_PASSPORT");
    expect(backendSemanticKeyFor("UNKNOWN")).toBeUndefined();
  });
});
