import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const WF_DIR = join(ROOT, ".github", "workflows");
const PUBLISH_WORKFLOW = "publish-npm.yml";

const files = existsSync(WF_DIR) ? readdirSync(WF_DIR).filter((f) => /\.ya?ml$/.test(f)) : [];
// Strip YAML comments so descriptive prose (e.g. "...held contents:write...")
// is not mistaken for an actual permission grant or command.
const read = (f: string) =>
  readFileSync(join(WF_DIR, f), "utf8")
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|\s)#.*$/, "$1"))
    .join("\n");

describe("proof/CI workflow no-write policy", () => {
  it("has at least the CI and release-proof workflows", () => {
    expect(files).toContain("ci.yml");
    expect(files).toContain("release-proof.yml");
  });

  it("the historical branch-writing bootstrap workflow is retired", () => {
    expect(files).not.toContain("phase3-mcp-server-proof.yml");
  });

  it("no proof/CI workflow can write the repository, commit, push, or force-update", () => {
    for (const f of files) {
      const text = read(f);
      expect(/contents:\s*write/.test(text), `${f} grants contents: write`).toBe(false);
      expect(/\bgit\s+commit\b/.test(text), `${f} runs git commit`).toBe(false);
      expect(/\bgit\s+push\b/.test(text), `${f} runs git push`).toBe(false);
      expect(/--force(-with-lease)?\b/.test(text), `${f} force-updates`).toBe(false);
    }
  });

  it("only the sanctioned publish workflow may publish", () => {
    for (const f of files) {
      if (f === PUBLISH_WORKFLOW) continue;
      const text = read(f);
      expect(/\bnpm\s+publish\b/.test(text), `${f} runs npm publish`).toBe(false);
      expect(/\bmcp-publisher\s+publish\b/.test(text), `${f} publishes to MCP Registry`).toBe(false);
    }
  });

  it("the release-proof workflow runs the complete gate read-only", () => {
    const proof = read("release-proof.yml");
    expect(proof).toMatch(/permissions:\s*\n\s*contents:\s*read/);
    expect(proof).toMatch(/npm run release:full/);
    expect(proof).toMatch(/npm ci/);
  });

  it("the publish workflow stays OIDC + contents:read (no long-lived token)", () => {
    if (!files.includes(PUBLISH_WORKFLOW)) return;
    const pub = read(PUBLISH_WORKFLOW);
    expect(pub).toMatch(/id-token:\s*write/);
    expect(pub).toMatch(/contents:\s*read/);
    expect(/secrets\.[A-Za-z_]*TOKEN/.test(pub)).toBe(false);
    expect(/contents:\s*write/.test(pub)).toBe(false);
  });

  it("MCP Registry publication is forbidden in every workflow", () => {
    for (const f of files) {
      expect(/\bmcp-publisher\s+publish\b/.test(read(f)), `${f} publishes to MCP Registry`).toBe(false);
    }
  });
});

describe("sanctioned publish workflow hardening (Phase 5)", () => {
  const has = files.includes(PUBLISH_WORKFLOW);
  const pub = has ? read(PUBLISH_WORKFLOW) : "";
  const onBlock = (pub.match(/^on:\s*([\s\S]*?)^[a-z]/m) || [, pub])[1];

  it("exists and is manual-only (workflow_dispatch, no push/PR/release/schedule/tag/reusable trigger)", () => {
    expect(has, "publish-npm.yml must exist").toBe(true);
    expect(/workflow_dispatch:/.test(pub)).toBe(true);
    expect(/^\s*push:/m.test(onBlock), "has push trigger").toBe(false);
    expect(/^\s*pull_request:/m.test(onBlock), "has pull_request trigger").toBe(false);
    expect(/^\s*release:/m.test(onBlock), "has release trigger").toBe(false);
    expect(/^\s*schedule:/m.test(onBlock), "has schedule trigger").toBe(false);
    expect(/^\s*workflow_call:/m.test(onBlock), "is a reusable workflow").toBe(false);
    expect(/tags:/.test(onBlock), "has tag trigger").toBe(false);
  });

  it("publishes exactly once, next-only, never latest, from the prepared tarball", () => {
    expect((pub.match(/\bnpm\s+publish\b/g) || []).length).toBe(1);
    expect(/--tag\s+next\b/.test(pub)).toBe(true);
    expect(/--tag\s+latest\b/.test(pub), "permits latest").toBe(false);
    expect(/npm\s+publish\s+(?!--)\S/.test(pub), "publishes from source").toBe(true);
    expect(/download-artifact/.test(pub)).toBe(true);
  });

  it("binds to an exact commit and the exact Phase 4 tarball hash", () => {
    expect(/release_commit/.test(pub)).toBe(true);
    expect(/\{40\}/.test(pub)).toBe(true);
    expect(/expected_tarball_sha256/.test(pub)).toBe(true);
    expect(/sha256sum/.test(pub)).toBe(true);
  });

  it("uses Node >= 24, npm >= 11.15.0, no dependency cache, full gate", () => {
    const nodeMatch = pub.match(/NODE_VERSION:\s*"?(\d+)/);
    expect(nodeMatch && Number(nodeMatch[1]) >= 24).toBe(true);
    const npmMatch = pub.match(/NPM_VERSION:\s*"?(\d+)\.(\d+)\.(\d+)/);
    expect(!!npmMatch).toBe(true);
    if (npmMatch) {
      const [maj, min] = [Number(npmMatch[1]), Number(npmMatch[2])];
      expect(maj > 11 || (maj === 11 && min >= 15)).toBe(true);
    }
    expect(/package-manager-cache:\s*false/.test(pub)).toBe(true);
    expect(/^\s*cache:\s*['"]?(npm|yarn|pnpm)/m.test(pub), "enables dependency cache").toBe(false);
    expect(/release:full/.test(pub)).toBe(true);
  });

  it("is gated by the protected environment + kill switch and creates attestations", () => {
    expect(/environment:\s*npm-release/.test(pub)).toBe(true);
    expect(pub.includes("NPM_RELEASE_WRITE_ENABLED")).toBe(true);
    expect(/NPM_RELEASE_WRITE_ENABLED\s*==\s*'true'/.test(pub)).toBe(true);
    expect(/actions\/attest/.test(pub)).toBe(true);
    expect(/attestations:\s*write/.test(pub)).toBe(true);
    expect(/packages:\s*write/.test(pub), "grants packages: write").toBe(false);
  });
});
