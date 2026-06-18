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
  BACKEND_SEMANTIC_KEYS
} from "../src/ecz-id.js";

// ISSUE/TASK — exact ECZ-ID format + Passport Number SSOT alignment.
// Parent:  ECZ-CC-XXXXXX  (CC=[A-Z]{2}, XXXXXX=6 uppercase Base36)
// Child:   ECZ-CC-XXXXXX::PASSPORT_CODE-YYYYYY (PASSPORT_CODE = locked PUBLIC code)
const PARENT = "ECZ-GB-A93K7Q";

describe("ECZ-ID parser: valid parent identifiers", () => {
  for (const id of [PARENT, "ECZ-CC-ABC123", "ECZ-AG-XYZ987", "ECZ-US-000000", "ECZ-ZZ-ZZZZZZ"]) {
    it(`accepts parent ${id}`, () => {
      const p = parseEczId(id);
      expect(p.valid).toBe(true);
      expect(p.kind).toBe("parent");
      expect(p.parent).toBe(id);
      expect(isValidParentEczId(id)).toBe(true);
      expect(isValidChildEczId(id)).toBe(false);
    });
  }
});

describe("ECZ-ID parser: valid child identifiers use PUBLIC passport-number codes", () => {
  it("accepts the SSOT public-code examples", () => {
    const cases: Array<[string, string, string]> = [
      [`${PARENT}::AGENT-4F9Q2A`, "AGENT", "4F9Q2A"],
      [`${PARENT}::SSCM-M29F8Q`, "SSCM", "M29F8Q"],
      [`${PARENT}::D1-DRONE-7A9F2Q`, "D1-DRONE", "7A9F2Q"]
    ];
    for (const [id, code, suffix] of cases) {
      const p = parseEczId(id);
      expect(p.valid, id).toBe(true);
      expect(p.kind).toBe("child");
      expect(p.parent).toBe(PARENT);
      expect(p.passportCode).toBe(code);
      expect(p.instanceSuffix).toBe(suffix);
    }
  });

  it("accepts EVERY locked public passport-number code", () => {
    for (const code of PUBLIC_PASSPORT_CODES) {
      const id = `${PARENT}::${code}-4F9Q2A`;
      const p = parseEczId(id);
      expect(p.valid, `expected ${id} valid`).toBe(true);
      expect(p.passportCode).toBe(code);
      expect(isValidChildEczId(id)).toBe(true);
    }
  });

  it("splits a hyphenated code off the FINAL hyphen (no first-hyphen split)", () => {
    const p = parseEczId(`${PARENT}::D1-DRONE-7A9F2Q`);
    expect(p.passportCode).toBe("D1-DRONE"); // NOT "D1"
    expect(p.instanceSuffix).toBe("7A9F2Q"); // NOT "DRONE-7A9F2Q"
    const r = parseEczId(`${PARENT}::ROBOT-IND-4F9Q2A`);
    expect(r.passportCode).toBe("ROBOT-IND");
    expect(r.instanceSuffix).toBe("4F9Q2A");
  });
});

describe("ECZ-ID parser: backend semantic keys are NOT public child codes", () => {
  // These represent the same products but must never be accepted as PUBLIC IDs.
  const rejected = [
    `${PARENT}::AGENT_CREDENTIAL-M4X9P2`,
    `${PARENT}::SOFTWARE_SUPPLY_CHAIN-M29F8Q`,
    `${PARENT}::DRONE_D1-7A9F2Q`,
    `${PARENT}::API_PASSPORT-P7K2Q9`,
    `${PARENT}::AI_MODEL-P7K2Q9`,
    `${PARENT}::CYBER_RESILIENCE-P7K2Q9`
  ];
  for (const id of rejected) {
    it(`rejects backend-only key ${id}`, () => {
      expect(isValidEczId(id)).toBe(false);
      expect(parseEczId(id).reason).toBe("passport_code_unknown");
    });
  }
  it("backend semantic keys are not public codes", () => {
    for (const k of BACKEND_SEMANTIC_KEYS) {
      expect(isPublicPassportCode(k)).toBe(false);
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

describe("ECZ-ID: public passport-code registry & backend mapping", () => {
  it("locks exactly the 22 SSOT public codes (unique)", () => {
    expect(PUBLIC_PASSPORT_CODES.length).toBe(22);
    expect(new Set(PUBLIC_PASSPORT_CODES).size).toBe(22);
  });
  it("recognises public codes; rejects unknown + backend keys", () => {
    expect(isPublicPassportCode("AGENT")).toBe(true);
    expect(isPublicPassportCode("SSCM")).toBe(true);
    expect(isPublicPassportCode("D1-DRONE")).toBe(true);
    expect(isRecognisedPassportCode("AGENT")).toBe(true); // back-compat alias
    expect(isPublicPassportCode("UNKNOWN")).toBe(false);
    expect(isPublicPassportCode("AGENT_CREDENTIAL")).toBe(false);
    expect(isPublicPassportCode("agent")).toBe(false); // case-sensitive
  });
  it("maps public code -> backend semantic key without affecting validity", () => {
    expect(backendSemanticKeyFor("AGENT")).toBe("AGENT_CREDENTIAL");
    expect(backendSemanticKeyFor("SSCM")).toBe("SOFTWARE_SUPPLY_CHAIN");
    expect(backendSemanticKeyFor("D1-DRONE")).toBe("DRONE_D1");
    expect(backendSemanticKeyFor("UNKNOWN")).toBeUndefined();
    // every public code maps to a backend key
    for (const code of PUBLIC_PASSPORT_CODES) {
      expect(typeof PUBLIC_TO_BACKEND_SEMANTIC_KEY[code]).toBe("string");
    }
  });
});
