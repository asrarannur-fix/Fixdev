import fs from "node:fs/promises";
import path from "node:path";
import { storageRoot } from "../lib/storage.js";

export interface DiskCheck {
  path: string;
  status: "ok" | "warning" | "critical" | "unavailable";
  usedBytes?: number;
  totalBytes?: number;
  freeBytes?: number;
  usedPercent?: number;
  thresholdPercent: number;
  error?: string;
}

function percent(name: string, fallback: number) {
  const value = Number(process.env[name] || fallback);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : fallback;
}

export function diskPaths() {
  return {
    root: process.env.DISK_ROOT_PATH || "/",
    uploads: storageRoot(),
    compilerCache: process.env.COMPILER_CACHE_DIR || "/tmp/compiler-cache",
  };
}

async function directoryBytes(target: string) {
  let total = 0;
  try {
    for (const entry of await fs.readdir(target, { withFileTypes: true })) {
      const entryPath = path.join(target, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) total += await directoryBytes(entryPath);
      else if (entry.isFile()) total += (await fs.stat(entryPath)).size;
    }
  } catch (error: any) {
    if (error.code === "ENOENT") return 0;
    throw error;
  }
  return total;
}

export async function checkDisk(target: string, thresholdPercent: number, filesystem = false): Promise<DiskCheck> {
  try {
    if (filesystem) {
      const stat = await fs.statfs(target);
      const totalBytes = Number(stat.blocks) * Number(stat.bsize);
      const freeBytes = Number(stat.bavail) * Number(stat.bsize);
      const usedBytes = Math.max(0, totalBytes - freeBytes);
      const usedPercent = totalBytes ? (usedBytes / totalBytes) * 100 : 100;
      return { path: target, status: usedPercent >= percent("DISK_CRITICAL_PERCENT", 95) ? "critical" : usedPercent >= thresholdPercent ? "warning" : "ok", usedBytes, totalBytes, freeBytes, usedPercent: Math.round(usedPercent * 100) / 100, thresholdPercent };
    }
    const usedBytes = await directoryBytes(target);
    const thresholdBytes = Number(process.env.COMPILER_CACHE_MAX_BYTES || 5 * 1024 ** 3);
    const usedPercent = thresholdBytes ? (usedBytes / thresholdBytes) * 100 : 100;
    return { path: target, status: usedBytes >= thresholdBytes ? "critical" : usedBytes >= thresholdBytes * 0.8 ? "warning" : "ok", usedBytes, usedPercent: Math.round(usedPercent * 100) / 100, thresholdPercent, error: undefined };
  } catch (error: any) {
    return { path: target, status: "unavailable", thresholdPercent, error: error.code === "EACCES" ? "access denied" : "read failed" };
  }
}

export async function diskHealth() {
  const paths = diskPaths();
  const checks = await Promise.all([
    checkDisk(paths.root, percent("DISK_ROOT_WARNING_PERCENT", 85), true),
    checkDisk(paths.uploads, percent("DISK_UPLOAD_WARNING_PERCENT", 85), true),
    checkDisk(paths.compilerCache, percent("COMPILER_CACHE_WARNING_PERCENT", 80)),
  ]);
  return checks;
}
