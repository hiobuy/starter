/**
 * Deploy without baking `.env.local` secrets into the Worker bundle.
 *
 * OpenNext copies Next.js env files into `.open-next/cloudflare/next-env.mjs`
 * at build time. If `.env.local` is present, `HIOBUY_API_KEY` ends up inside
 * the Worker even when you never ran `wrangler secret put`.
 *
 * Production secrets must come from Cloudflare Secrets / Dashboard.
 */
import { spawnSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const envLocal = resolve(root, ".env.local");
const envBackup = resolve(root, ".env.local.deploy-bak");

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

let moved = false;
try {
  if (existsSync(envLocal)) {
    renameSync(envLocal, envBackup);
    moved = true;
    console.log(
      "Temporarily moved .env.local aside so secrets are not baked into the Worker.",
    );
    console.log(
      "Set production secrets with: wrangler secret put HIOBUY_API_KEY",
    );
  }

  run("pnpm", ["exec", "opennextjs-cloudflare", "build"]);
  run("pnpm", [
    "exec",
    "opennextjs-cloudflare",
    "deploy",
    "--",
    "--keep-vars",
  ]);
} finally {
  if (moved && existsSync(envBackup)) {
    renameSync(envBackup, envLocal);
    console.log("Restored .env.local");
  }
}
