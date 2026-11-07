// Seven-family acquisition/guidance routing.
// Family routing is guidance only: it never proves ownership, authority,
// current state, safety, compliance, certification, or approval.
import { CURRENT_PASSPORT_FAMILY_DEFINITIONS, parseEczId } from "./ecz-id.js";
import { DEVELOPER_GATEWAY, TRUSTOPS_START } from "./constants.js";
export const PASSPORT_FAMILY_INPUTS = [
    "auto", "agent", "mcp", "plugin", "api", "iot", "sdk", "service_workload"
];
const QUICKSTART_PATH = {
    agent: "/quickstarts/agent/",
    mcp: "/quickstarts/mcp/",
    plugin: "/quickstarts/plugin/",
    api: "/quickstarts/api/",
    iot: "/quickstarts/iot/",
    sdk: "/quickstarts/sdk/",
    service_workload: "/quickstarts/service-workload/"
};
export const FREE_PASSPORT_PATH = "/get-started/free-passport/";
export const RESOLVE_ECZ_ID_PATH = "/get-started/resolve-an-ecz-id/";
export function normalizePassportFamilyInput(value) {
    if (typeof value !== "string")
        return undefined;
    const normalized = value
        .trim()
        .toLowerCase()
        .replaceAll("&", " ")
        .replaceAll("-", " ")
        .split(" ")
        .filter(Boolean)
        .join("_");
    const alias = normalized === "service" || normalized === "workload" || normalized === "svc"
        ? "service_workload"
        : normalized;
    return PASSPORT_FAMILY_INPUTS.includes(alias)
        ? alias
        : undefined;
}
export function passportFamilyDefinition(family) {
    return CURRENT_PASSPORT_FAMILY_DEFINITIONS.find((entry) => entry.family === family);
}
export function passportQuickstartUrl(family, developerBase = DEVELOPER_GATEWAY) {
    return developerBase.replace(/[/]+$/, "") + QUICKSTART_PATH[family];
}
export function freePassportUrl(developerBase = DEVELOPER_GATEWAY) {
    return developerBase.replace(/[/]+$/, "") + FREE_PASSPORT_PATH;
}
export function resolveEczIdGuideUrl(developerBase = DEVELOPER_GATEWAY) {
    return developerBase.replace(/[/]+$/, "") + RESOLVE_ECZ_ID_PATH;
}
export function resolvePassportFamily(input) {
    const developerBase = input.developer_base ?? DEVELOPER_GATEWAY;
    const acquisition = (input.trustops_base ?? TRUSTOPS_START).replace(/[/]+$/, "");
    const explicit = normalizePassportFamilyInput(input.explicit ?? "auto");
    let family = null;
    let source = "none";
    let subjectNote = null;
    if (explicit && explicit !== "auto") {
        family = explicit;
        source = "explicit";
    }
    else if (input.target_type === "ecz_id") {
        const parsed = parseEczId(input.target);
        if (parsed.valid && parsed.kind === "child" && parsed.family) {
            family = parsed.family;
            source = "child_ecz_id";
        }
    }
    else if (input.target_type === "mcp_server") {
        family = "mcp";
        source = "target_shape";
    }
    else if (input.target_type === "agent_manifest") {
        family = "agent";
        source = "target_shape";
    }
    else if (input.target_type === "api_url") {
        family = "api";
        source = "target_shape";
    }
    else if (input.target_type === "container_image") {
        family = "service_workload";
        source = "target_shape";
        subjectNote = "The container image is a locator for guidance; an image, pod, replica, process, or region is not itself a Service & Workload Passport.";
    }
    if (!family) {
        return {
            family: null,
            source,
            type_code: null,
            contract_token: null,
            display_name: null,
            guidance_url: input.target_type === "ecz_id"
                ? resolveEczIdGuideUrl(developerBase)
                : freePassportUrl(developerBase),
            acquisition_url: acquisition,
            subject_note: subjectNote
        };
    }
    const definition = passportFamilyDefinition(family);
    return {
        family,
        source,
        type_code: definition.typeCode,
        contract_token: definition.contractToken,
        display_name: definition.displayName,
        guidance_url: passportQuickstartUrl(family, developerBase),
        acquisition_url: acquisition,
        subject_note: subjectNote
    };
}
