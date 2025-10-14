// src/utils/version.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

function readPackageVersion() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const pkgPath = path.resolve(__dirname, "../../package.json");
    const txt = fs.readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(txt);
    return String(pkg.version || "0.0.0");
  } catch {
    return "0.0.0";
  }
}

function detectGitSha() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const repoRoot = path.resolve(__dirname, "../..");
    const raw = execSync("git rev-parse HEAD", { cwd: repoRoot, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    return raw ? raw.slice(0, 40) : null;
  } catch {
    try {
      // Fallback: read .git/HEAD and resolve ref
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const repoRoot = path.resolve(__dirname, "../..");
      const headPath = path.join(repoRoot, ".git/HEAD");
      const head = fs.readFileSync(headPath, "utf8").trim();
      if (head.startsWith("ref:")) {
        const ref = head.split(" ")[1];
        const refPath = path.join(repoRoot, ".git", ref);
        const sha = fs.readFileSync(refPath, "utf8").trim();
        return sha ? sha.slice(0, 40) : null;
      }
      return head ? head.slice(0, 40) : null;
    } catch {
      return null;
    }
  }
}

const versionCache = readPackageVersion();
const shaCache = (() => {
  const envSha = (process.env.GIT_SHA || "").trim();
  if (envSha) return envSha.slice(0, 40);
  return detectGitSha();
})();

export function getVersionInfo() {
  const sha = shaCache ? shaCache.slice(0, 12) : null;
  const run = process.env.GITHUB_RUN_NUMBER || null;
  const build = process.env.EASSIST_BUILD || (run ? `build.${run}` : null);
  return {
    version: versionCache,
    build,
    git_sha: sha,
    ci_run_number: run ? Number(run) : null,
  };
}
