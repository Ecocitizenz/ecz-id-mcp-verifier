import { describe, it, expect } from "vitest";
import {
  computeExitCode,
  EXIT_OK,
  EXIT_POLICY_REQUIRED_PROOF_MISSING,
  EXIT_MISMATCH,
  EXIT_REVOKED_SUSPENDED_EXPIRED,
  EXIT_UNSUPPORTED_OR_INVALID,
  EXIT_NETWORK_FAIL_CLOSED,
  EXIT_INTERNAL
} from "../src/exit-codes.js";

describe("computeExitCode", () => {
  it("RESOLVER_VERIFIABLE => 0 under any policy", () => {
    for (const p of ["OPEN", "PREFER", "REQUIRE"] as const) {
      expect(computeExitCode("RESOLVER_VERIFIABLE", p)).toBe(EXIT_OK);
    }
  });

  it("OPEN: missing proof => 0", () => {
    expect(computeExitCode("NO_PUBLIC_RESOLVER_PROOF_FOUND", "OPEN")).toBe(
      EXIT_OK
    );
  });

  it("PREFER: missing proof => 0 (warning only)", () => {
    expect(computeExitCode("NO_PUBLIC_RESOLVER_PROOF_FOUND", "PREFER")).toBe(
      EXIT_OK
    );
  });

  it("REQUIRE: missing proof => 1 (fail closed)", () => {
    expect(
      computeExitCode("NO_PUBLIC_RESOLVER_PROOF_FOUND", "REQUIRE")
    ).toBe(EXIT_POLICY_REQUIRED_PROOF_MISSING);
  });

  it("REQUIRE: missing proof + network failure => 5", () => {
    expect(
      computeExitCode("NO_PUBLIC_RESOLVER_PROOF_FOUND", "REQUIRE", {
        network_attempted_and_failed: true
      })
    ).toBe(EXIT_NETWORK_FAIL_CLOSED);
  });

  it("MISMATCH => 2 under any policy", () => {
    for (const p of ["OPEN", "PREFER", "REQUIRE"] as const) {
      expect(computeExitCode("MISMATCH", p)).toBe(EXIT_MISMATCH);
    }
  });

  it("REVOKED / SUSPENDED / EXPIRED => 3 under any policy", () => {
    for (const state of ["REVOKED", "SUSPENDED", "EXPIRED"] as const) {
      for (const p of ["OPEN", "PREFER", "REQUIRE"] as const) {
        expect(computeExitCode(state, p)).toBe(EXIT_REVOKED_SUSPENDED_EXPIRED);
      }
    }
  });

  it("UNSUPPORTED_TARGET => 4 under any policy", () => {
    for (const p of ["OPEN", "PREFER", "REQUIRE"] as const) {
      expect(computeExitCode("UNSUPPORTED_TARGET", p)).toBe(
        EXIT_UNSUPPORTED_OR_INVALID
      );
    }
  });

  it("exposes a distinct internal-error code", () => {
    expect(EXIT_INTERNAL).toBe(6);
    expect(EXIT_INTERNAL).not.toBe(EXIT_OK);
  });

  it("PARTIAL_PUBLIC_PROOF_FOUND behaves like missing proof under REQUIRE", () => {
    expect(computeExitCode("PARTIAL_PUBLIC_PROOF_FOUND", "REQUIRE")).toBe(
      EXIT_POLICY_REQUIRED_PROOF_MISSING
    );
    expect(computeExitCode("PARTIAL_PUBLIC_PROOF_FOUND", "OPEN")).toBe(
      EXIT_OK
    );
  });
});
