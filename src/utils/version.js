// src/utils/version.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

const versionCache = readPackageVersion();

export function getVersionInfo() {
  const sha = (process.env.GIT_SHA || "").slice(0, 12) || null;
  const run = process.env.GITHUB_RUN_NUMBER || null;
  const build = process.env.EASSIST_BUILD || (run ? `build.${run}` : null);
  return {
    version: versionCache,
    build,
    git_sha: sha,
    ci_run_number: run ? Number(run) : null,
  };
}

export default { getVersionInfo };
