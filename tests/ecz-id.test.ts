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
  OBSOLETE_PASSPORT_CODES
} from "../src/ecz-id.js";

// Phase 1 Registry Completion — complete 33-code public passport registry.
const PARENT = "ECZ-GB-A93K7Q";

describe("ECZ-ID parser: valid parent identifiers", () => {
  for (const id of [PARENT, "ECZ-CC-ABC123", "ECZ-AG-XYZ987", "ECZ-US-000000"]) {
    it(`accepts parent ${id}`, () => {
      const p = parseEczId(id);
      expect(p.valid).toBe(true);
      expect(p.kind).toBe("parent");
      expect(isValidParentEczId(id)).toBe(true);
    });
  }
});

describe("ECZ-ID: complete 33-code public registry", () => {
  it("locks exactly 33 unique public codes", () => {
    expect(PUBLIC_PASSPORT_CODES.length).toBe(33);
    expect(new Set(PUBLIC_PASSPORT_CODES).size).toBe(33);
  });
  it("contains all CEO-locked codes incl. the final 11", () => {
    const expected = [
      "AGENT", "CYBER", "API", "AI", "DATASET", "IOT", "SSCM", "PRODUCT",
      "CUSTODY", "RISKPOL", "ROBOT-IND", "ROBOT-PUB", "ROBOT-DOM", "ROBOTAXI",
      "AUTO-CAR", "AUTO-TRUCK", "XHAUL", "HV-CARGO", "D1-DRONE", "D2-DRONE",
      "D3-DRONE", "D4-DRONE", "INTERMODAL", "IND-SITE", "CRITICAL-INFRA",
      "FUNDS-FLOW", "MARINE-VESSEL", "CARGO-CONTAINER", "AIRCRAFT",
      "AVIATION-COMP", "SAFE-HARBOUR", "ID-CONTINUITY", "LIC-INFRA"
    ];
    expect([...PUBLIC_PASSPORT_CODES]).toEqual(expected);
  });
  it("accepts EVERY one of the 33 public codes as a child ID", () => {
    for (const code of PUBLIC_PASSPORT_CODES) {
      const id = `${PARENT}::${code}-4F9Q2A`;
      const p = parseEczId(id);
      expect(p.valid, `expected ${id} valid`).toBe(true);
      expect(p.kind).toBe("child");
      expect(p.passportCode).toBe(code);
      expect(p.instanceSuffix).toBe("4F9Q2A");
      expect(isPublicPassportCode(code)).toBe(true);
    }
  });
  it("every public code has a display name and a backend semantic key", () => {
    for (const code of PUBLIC_PASSPORT_CODES) {
      expect(typeof PUBLIC_PASSPORT_DISPLAY_NAME[code]).toBe("string");
      expect(typeof PUBLIC_TO_BACKEND_SEMANTIC_KEY[code]).toBe("string");
      expect(backendSemanticKeyFor(code)).toBe(PUBLIC_TO_BACKEND_SEMANTIC_KEY[code]);
    }
  });
});

describe("ECZ-ID parser: hyphenated codes split off the FINAL hyphen", () => {
  const hyphenated: Array<[string, string]> = [
    ["ROBOT-IND", "4F9Q2A"], ["AUTO-CAR", "4F9Q2A"], ["AUTO-TRUCK", "4F9Q2A"],
    ["HV-CARGO", "4F9Q2A"], ["D1-DRONE", "7A9F2Q"], ["CRITICAL-INFRA", "M29F8Q"],
    ["FUNDS-FLOW", "M29F8Q"], ["MARINE-VESSEL", "M29F8Q"], ["CARGO-CONTAINER", "M29F8Q"],
    ["AVIATION-COMP", "M29F8Q"], ["SAFE-HARBOUR", "M29F8Q"], ["ID-CONTINUITY", "M29F8Q"],
    ["LIC-INFRA", "M29F8Q"], ["IND-SITE", "M29F8Q"]
  ];
  for (const [code, suffix] of hyphenated) {
    it(`${code} parses correctly`, () => {
      const p = parseEczId(`${PARENT}::${code}-${suffix}`);
      expect(p.passportCode).toBe(code);
      expect(p.instanceSuffix).toBe(suffix);
    });
  }
});

describe("ECZ-ID parser: backend semantic keys are NOT public codes", () => {
  it("rejects every distinct backend semantic key inside an ID", () => {
    for (const key of BACKEND_SEMANTIC_KEYS) {
      const id = `${PARENT}::${key}-4F9Q2A`;
      expect(isPublicPassportCode(key), `${key} must not be public`).toBe(false);
      expect(isValidEczId(id), `${id} must be invalid`).toBe(false);
    }
  });
  it("rejects the headline backend keys explicitly", () => {
    for (const id of [
      `${PARENT}::AGENT_CREDENTIAL-M4X9P2`,
      `${PARENT}::SOFTWARE_SUPPLY_CHAIN-M29F8Q`,
      `${PARENT}::DRONE_D1-7A9F2Q`,
      `${PARENT}::IROBOT-4F9Q2A`,
      `${PARENT}::AUTOCAR-4F9Q2A`,
      `${PARENT}::D1-7A9F2Q`,
      `${PARENT}::LICENSED_OPERATOR-4F9Q2A`
    ]) {
      expect(parseEczId(id).reason).toBe("passport_code_unknown");
    }
  });
});

describe("ECZ-ID parser: obsolete earlier-taxonomy codes are rejected", () => {
  it("rejects every obsolete final-11 code for new identifiers", () => {
    for (const code of OBSOLETE_PASSPORT_CODES) {
      expect(isPublicPassportCode(code), `${code} must not be current`).toBe(false);
      expect(isValidEczId(`${PARENT}::${code}-4F9Q2A`)).toBe(false);
    }
  });
});

describe("ECZ-ID parser: invalid identifiers (mandatory rejections)", () => {
  const invalid: Array<[string, string]> = [
    ["ECZ-GB-EXAMPLE", "7-char identity suffix"],
    ["ECZ-GB-ABC12", "5-char identity suffix"],
    ["ECZ-GB-ABC1234", "7-char identity suffix"],
    ["ECZ-gb-ABC123", "lowercase country"],
    ["ECZ-GB-ABC12!", "non-Base36 char"],
    ["ECZ-API-AB12", "3-letter country + 4-char suffix"],
    [`${PARENT}::UNKNOWN-ABC123`, "passport code not in registry"],
    [`${PARENT}::SSCM-ABC12`, "5-char instance suffix"],
    [`${PARENT}::SSCM-ABC1234`, "7-char instance suffix"],
    [`${PARENT}::AGENT-7F2A`, "4-char instance suffix"],
    [`${PARENT}::AGENT-abc123`, "lowercase instance suffix"],
    [`${PARENT}::AGENT`, "no instance suffix"],
    [`${PARENT}::-ABC123`, "empty passport code"],
    [`${PARENT}::AGENT::X-ABC123`, "multiple separators"],
    [` ${PARENT}`, "leading whitespace"],
    ["not-an-ecz-id", "free text"],
    ["", "empty"]
  ];
  for (const [id, why] of invalid) {
    it(`rejects ${JSON.stringify(id)} (${why})`, () => {
      expect(isValidEczId(id)).toBe(false);
      expect(parseEczId(id).reason).not.toBeNull();
    });
  }
});

describe("ECZ-ID: public codes vs backend keys", () => {
  it("SSOT public-code examples are accepted", () => {
    for (const id of [`${PARENT}::AGENT-4F9Q2A`, `${PARENT}::SSCM-M29F8Q`, `${PARENT}::D1-DRONE-7A9F2Q`]) {
      expect(isValidChildEczId(id)).toBe(true);
    }
  });
  it("back-compat isRecognisedPassportCode == isPublicPassportCode", () => {
    expect(isRecognisedPassportCode("AGENT")).toBe(true);
    expect(isRecognisedPassportCode("AGENT_CREDENTIAL")).toBe(false);
    expect(isRecognisedPassportCode("agent")).toBe(false);
  });
  it("backend mapping examples", () => {
    expect(backendSemanticKeyFor("AGENT")).toBe("AGENT_CREDENTIAL");
    expect(backendSemanticKeyFor("LIC-INFRA")).toBe("LICENSED_OPERATOR");
    expect(backendSemanticKeyFor("D1-DRONE")).toBe("D1");
    expect(backendSemanticKeyFor("UNKNOWN")).toBeUndefined();
  });
});
