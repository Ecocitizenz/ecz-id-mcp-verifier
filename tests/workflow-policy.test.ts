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
});
