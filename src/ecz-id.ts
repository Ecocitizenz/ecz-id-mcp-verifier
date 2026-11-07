// ECZ-ID identifier grammar aligned to the live seven-family Core contract.
// This module validates syntax only. It does not establish ownership, authority,
// safety, compliance, certification, approval, or current Resolver state.

export const BASE36_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ" as const;

export const CURRENT_PASSPORT_FAMILY_DEFINITIONS = [
  {
    family: "agent",
    typeCode: "AGENT_PASSPORT",
    contractToken: "agent",
    displayName: "Agent",
  },
  {
    family: "mcp",
    typeCode: "MCP_PASSPORT",
    contractToken: "mcp",
    displayName: "MCP",
  },
  {
    family: "plugin",
    typeCode: "PLUGIN_PASSPORT",
    contractToken: "plugin",
    displayName: "Plugin",
  },
  {
    family: "api",
    typeCode: "API_PASSPORT",
    contractToken: "api",
    displayName: "API",
  },
  {
    family: "iot",
    typeCode: "IOT_DEVICE",
    contractToken: "iot",
    displayName: "IoT",
  },
  {
    family: "sdk",
    typeCode: "SDK_PASSPORT",
    contractToken: "sdk",
    displayName: "SDK",
  },
  {
    family: "service_workload",
    typeCode: "SERVICE_WORKLOAD_PASSPORT",
    contractToken: "svc",
    displayName: "Service & Workload",
  },
] as const;

export type CurrentPassportFamily =
  (typeof CURRENT_PASSPORT_FAMILY_DEFINITIONS)[number]["family"];
export type PublicPassportCode =
  (typeof CURRENT_PASSPORT_FAMILY_DEFINITIONS)[number]["typeCode"];
export type BackendSemanticKey = PublicPassportCode;

export const CURRENT_PASSPORT_TYPE_CODES =
  CURRENT_PASSPORT_FAMILY_DEFINITIONS.map(
    (entry) => entry.typeCode,
  ) as readonly PublicPassportCode[];

// Back-compatible export name retained for consumers. The value is now the
// CURRENT seven-family type-code set, not the historical catalogue-era set.
export const PUBLIC_PASSPORT_CODES = CURRENT_PASSPORT_TYPE_CODES;

export const PUBLIC_PASSPORT_DISPLAY_NAME = Object.fromEntries(
  CURRENT_PASSPORT_FAMILY_DEFINITIONS.map((entry) => [
    entry.typeCode,
    entry.displayName,
  ]),
) as Record<PublicPassportCode, string>;

// Back-compatible mapping retained without inventing a second public/backend
// taxonomy: current Core type codes map to themselves.
export const PUBLIC_TO_BACKEND_SEMANTIC_KEY = Object.fromEntries(
  CURRENT_PASSPORT_FAMILY_DEFINITIONS.map((entry) => [
    entry.typeCode,
    entry.typeCode,
  ]),
) as Record<PublicPassportCode, BackendSemanticKey>;
export const BACKEND_SEMANTIC_KEYS = CURRENT_PASSPORT_TYPE_CODES;

// Historical catalogue-era codes. They may appear in old documentation or
// records, but they are NOT accepted as current seven-family child identifiers.
export const LEGACY_CATALOGUE_PASSPORT_CODES = [
  "AGENT",
  "CYBER",
  "API",
  "AI",
  "DATASET",
  "IOT",
  "SSCM",
  "PRODUCT",
  "CUSTODY",
  "RISKPOL",
  "ROBOT-IND",
  "ROBOT-PUB",
  "ROBOT-DOM",
  "ROBOTAXI",
  "AUTO-CAR",
  "AUTO-TRUCK",
  "XHAUL",
  "HV-CARGO",
  "D1-DRONE",
  "D2-DRONE",
  "D3-DRONE",
  "D4-DRONE",
  "INTERMODAL",
  "IND-SITE",
  "CRITICAL-INFRA",
  "FUNDS-FLOW",
  "MARINE-VESSEL",
  "CARGO-CONTAINER",
  "AIRCRAFT",
  "AVIATION-COMP",
  "SAFE-HARBOUR",
  "ID-CONTINUITY",
  "LIC-INFRA",
] as const;
export const OBSOLETE_PASSPORT_CODES = LEGACY_CATALOGUE_PASSPORT_CODES;

export type EczIdKind = "parent" | "child" | "invalid";

export interface ParsedEczId {
  raw: string;
  valid: boolean;
  kind: EczIdKind;
  parent: string | null;
  countryCode: string | null;
  identitySuffix: string | null;
  passportCode: PublicPassportCode | null;
  instanceSuffix: string | null;
  family: CurrentPassportFamily | null;
  contractToken: string | null;
  reason: string | null;
}

const PARENT_RE = /^ECZ-([A-Z]{2})-([0-9A-Z]{6})$/;
const CHILD_RE = /^(.+)::([A-Z0-9_]+)-([0-9A-Z]{6})$/;

function invalid(raw: string, reason: string): ParsedEczId {
  return {
    raw,
    valid: false,
    kind: "invalid",
    parent: null,
    countryCode: null,
    identitySuffix: null,
    passportCode: null,
    instanceSuffix: null,
    family: null,
    contractToken: null,
    reason,
  };
}

export function isPublicPassportCode(
  value: unknown,
): value is PublicPassportCode {
  return (
    typeof value === "string" &&
    (CURRENT_PASSPORT_TYPE_CODES as readonly string[]).includes(value)
  );
}

/** Back-compatible alias. Current recognition is the exact seven-family set. */
export function isRecognisedPassportCode(
  value: unknown,
): value is PublicPassportCode {
  return isPublicPassportCode(value);
}

export function backendSemanticKeyFor(
  code: unknown,
): BackendSemanticKey | undefined {
  return isPublicPassportCode(code) ? code : undefined;
}

export function familyDefinitionForCode(code: unknown) {
  return CURRENT_PASSPORT_FAMILY_DEFINITIONS.find(
    (entry) => entry.typeCode === code,
  );
}

export function parseEczId(value: unknown): ParsedEczId {
  if (typeof value !== "string" || value.length === 0)
    return invalid(String(value ?? ""), "empty_or_non_string");
  const raw = value;
  if (raw !== raw.trim()) return invalid(raw, "surrounding_whitespace");

  const parentMatch = PARENT_RE.exec(raw);
  if (parentMatch) {
    return {
      raw,
      valid: true,
      kind: "parent",
      parent: raw,
      countryCode: parentMatch[1]!,
      identitySuffix: parentMatch[2]!,
      passportCode: null,
      instanceSuffix: null,
      family: null,
      contractToken: null,
      reason: null,
    };
  }

  if (!raw.includes("::")) return invalid(raw, "parent_shape_invalid");
  if (raw.split("::").length !== 2)
    return invalid(raw, "multiple_child_separators");

  const childMatch = CHILD_RE.exec(raw);
  if (!childMatch) return invalid(raw, "child_shape_invalid");
  const parentRaw = childMatch[1]!;
  const codeRaw = childMatch[2]!;
  const instanceSuffix = childMatch[3]!;
  const parent = PARENT_RE.exec(parentRaw);
  if (!parent) return invalid(raw, "parent_shape_invalid");
  if (!isPublicPassportCode(codeRaw))
    return invalid(raw, "passport_code_unknown");
  const definition = familyDefinitionForCode(codeRaw)!;

  return {
    raw,
    valid: true,
    kind: "child",
    parent: parentRaw,
    countryCode: parent[1]!,
    identitySuffix: parent[2]!,
    passportCode: codeRaw,
    instanceSuffix,
    family: definition.family,
    contractToken: definition.contractToken,
    reason: null,
  };
}

export function isValidEczId(value: unknown): boolean {
  return parseEczId(value).valid;
}
export function isValidParentEczId(value: unknown): boolean {
  const parsed = parseEczId(value);
  return parsed.valid && parsed.kind === "parent";
}
export function isValidChildEczId(value: unknown): boolean {
  const parsed = parseEczId(value);
  return parsed.valid && parsed.kind === "child";
}
