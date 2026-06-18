import { describe, it, expect } from "vitest";
import {
  parseEczId,
  isValidEczId,
  isValidParentEczId,
  isValidChildEczId,
  isRecognisedPassportCode,
  CANONICAL_PASSPORT_CODES,
  RECOGNISED_PASSPORT_CODES
} from "../src/ecz-id.js";

// ISSUE 1 — exact ECZ-ID format validation.
// Locked parent:  ECZ-CC-XXXXXX  (CC=[A-Z]{2}, XXXXXX=6 uppercase Base36)
// Locked child:   ECZ-CC-XXXXXX::PASSPORT_CODE-YYYYYY (YYYYYY=6 Base36)

describe("ECZ-ID parser: valid parent identifiers", () => {
  const valid = ["ECZ-GB-A93K7Q", "ECZ-CC-ABC123", "ECZ-AG-XYZ987", "ECZ-US-000000", "ECZ-ZZ-ZZZZZZ"];
  for (const id of valid) {
    it(`accepts parent ${id}`, () => {
      const p = parseEczId(id);
      expect(p.valid).toBe(true);
      expect(p.kind).toBe("parent");
      expect(p.parent).toBe(id);
      expect(p.parentSuffix).toMatch(/^[0-9A-Z]{6}$/);
      expect(isValidParentEczId(id)).toBe(true);
      expect(isValidChildEczId(id)).toBe(false);
    });
  }
});

describe("ECZ-ID parser: valid child passport-instance identifiers", () => {
  // The Phase-1 directive's blessed examples (AGENT / SSCM / D1-DRONE) plus the
  // canonical SSOT spellings. D1-DRONE proves the hyphen-safe suffix split.
  const cases: Array<[string, string, string]> = [
    ["ECZ-GB-A93K7Q::AGENT-4F9Q2A", "AGENT", "4F9Q2A"],
    ["ECZ-GB-A93K7Q::SSCM-M29F8Q", "SSCM", "M29F8Q"],
    ["ECZ-GB-A93K7Q::D1-DRONE-7A9F2Q", "D1-DRONE", "7A9F2Q"],
    ["ECZ-GB-A93K7Q::AGENT_CREDENTIAL-M4X9P2", "AGENT_CREDENTIAL", "M4X9P2"],
    ["ECZ-GB-A93K7Q::SOFTWARE_SUPPLY_CHAIN-M29F8Q", "SOFTWARE_SUPPLY_CHAIN", "M29F8Q"],
    ["ECZ-GB-A93K7Q::DRONE_D1-7A9F2Q", "DRONE_D1", "7A9F2Q"],
    ["ECZ-GB-A93K7Q::API_PASSPORT-P7K2Q9", "API_PASSPORT", "P7K2Q9"]
  ];
  for (const [id, code, suffix] of cases) {
    it(`accepts child ${id}`, () => {
      const p = parseEczId(id);
      expect(p.valid).toBe(true);
      expect(p.kind).toBe("child");
      expect(p.parent).toBe("ECZ-GB-A93K7Q");
      expect(p.passportCode).toBe(code);
      expect(p.instanceSuffix).toBe(suffix);
      expect(isValidChildEczId(id)).toBe(true);
      expect(isValidParentEczId(id)).toBe(false);
    });
  }
});

describe("ECZ-ID parser: hyphen-safe suffix split (no simplistic first-hyphen split)", () => {
  it("splits a hyphenated passport code off the FINAL hyphen", () => {
    const p = parseEczId("ECZ-GB-A93K7Q::D1-DRONE-7A9F2Q");
    expect(p.passportCode).toBe("D1-DRONE"); // NOT "D1"
    expect(p.instanceSuffix).toBe("7A9F2Q"); // NOT "DRONE-7A9F2Q"
  });
});

describe("ECZ-ID parser: invalid identifiers (mandatory rejections)", () => {
  const invalid: Array<[string, string]> = [
    ["ECZ-GB-EXAMPLE", "7-char identity suffix"],
    ["ECZ-GB-ABC12", "5-char identity suffix"],
    ["ECZ-GB-ABC1234", "7-char identity suffix"],
    ["ECZ-gb-ABC123", "lowercase country"],
    ["ECZ-GB-ABC12!", "non-Base36 char"],
    ["ECZ-GB-abc123", "lowercase suffix"],
    ["ECZ-G-ABC123", "1-letter country"],
    ["ECZ-GBR-ABC123", "3-letter country"],
    ["ECZ-API-AB12", "3-letter country + 4-char suffix"],
    ["ECZ-GB-ABC123::UNKNOWN-ABC123", "passport code not in registry"],
    ["ECZ-GB-ABC123::SSCM-ABC12", "5-char instance suffix"],
    ["ECZ-GB-ABC123::SSCM-ABC1234", "7-char instance suffix"],
    ["ECZ-GB-ABC123::AGENT_CREDENTIAL-7F2A", "4-char instance suffix"],
    ["ECZ-GB-ABC123::AGENT-abc123", "lowercase instance suffix"],
    ["ECZ-GB-ABC123::AGENT", "no instance suffix"],
    ["ECZ-GB-ABC123::-ABC123", "empty passport code"],
    ["ECZ-GB-ABC123::AGENT::X-ABC123", "multiple separators"],
    [" ECZ-GB-ABC123", "leading whitespace"],
    ["ECZ-GB-ABC123 ", "trailing whitespace"],
    ["not-an-ecz-id", "free text"],
    ["ECZ-GB", "incomplete"],
    ["https://example.com", "url"],
    ["", "empty"]
  ];
  for (const [id, why] of invalid) {
    it(`rejects ${JSON.stringify(id)} (${why})`, () => {
      expect(isValidEczId(id)).toBe(false);
      expect(parseEczId(id).valid).toBe(false);
      expect(parseEczId(id).reason).not.toBeNull();
    });
  }
});

describe("ECZ-ID parser: passport-code registry", () => {
  it("carries the 33 canonical SSOT codes", () => {
    expect(CANONICAL_PASSPORT_CODES.length).toBe(33);
    expect(new Set(CANONICAL_PASSPORT_CODES).size).toBe(33);
  });
  it("recognises canonical codes and rejects unknown ones", () => {
    expect(isRecognisedPassportCode("AGENT_CREDENTIAL")).toBe(true);
    expect(isRecognisedPassportCode("SOFTWARE_SUPPLY_CHAIN")).toBe(true);
    expect(isRecognisedPassportCode("DRONE_D1")).toBe(true);
    expect(isRecognisedPassportCode("UNKNOWN")).toBe(false);
    expect(isRecognisedPassportCode("agent_credential")).toBe(false);
  });
  it("recognises the Phase-1 blessed short forms", () => {
    for (const c of ["AGENT", "SSCM", "D1-DRONE"]) {
      expect(RECOGNISED_PASSPORT_CODES.has(c)).toBe(true);
    }
  });
});
