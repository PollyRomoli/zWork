import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export interface UpdateCardState {
  latestVersion: string;
  releaseUrl: string;
  source: "updater" | "github";
}

const releaseRepo = "https://api.github.com/repos/Ryz3nPlayZ/zWork/releases/latest";
const releasePage = "https://github.com/Ryz3nPlayZ/zWork/releases/latest";

function normalizeVersion(value: string): string {
  return value.replace(/^v/i, "").trim();
}

function parseVersion(value: string): number[] {
  return normalizeVersion(value)
    .split(".")
    .map((part) => Number.parseInt(part.replace(/[^\d].*$/, ""), 10) || 0);
}

function compareVersions(a: number[], b: number[]): number {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

async function checkTauriUpdater(currentVersionParts: number[]): Promise<UpdateCardState | null> {
  try {
    const update = await check({ timeout: 15000 });
    if (!update) return null;

    const latestVersion = normalizeVersion(update.version);
    if (!latestVersion) return null;
    if (compareVersions(parseVersion(latestVersion), currentVersionParts) <= 0) return null;

    return {
      latestVersion,
      releaseUrl: releasePage,
      source: "updater",
    };
  } catch {
    return null;
  }
}

async function checkGithubRelease(currentVersionParts: number[]): Promise<UpdateCardState | null> {
  try {
    const response = await fetch(releaseRepo, {
      headers: { accept: "application/vnd.github+json" },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as { tag_name?: string; html_url?: string };
    const latestVersion = normalizeVersion(data.tag_name || "");
    if (!latestVersion) return null;
    if (compareVersions(parseVersion(latestVersion), currentVersionParts) <= 0) return null;

    return {
      latestVersion,
      releaseUrl: data.html_url || releasePage,
      source: "github",
    };
  } catch {
    return null;
  }
}

export async function detectUpdate(currentVersion: string): Promise<UpdateCardState | null> {
  const currentVersionParts = parseVersion(currentVersion);
  return (await checkTauriUpdater(currentVersionParts)) || (await checkGithubRelease(currentVersionParts));
}

export async function installUpdate(): Promise<boolean> {
  try {
    const update = await check({ timeout: 15000 });
    if (!update) return false;

    await update.downloadAndInstall(() => {});
    await relaunch();
    return true;
  } catch {
    return false;
  }
}
