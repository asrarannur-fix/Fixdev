import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkDisk, diskPaths } from "./diskMonitor";

const roots: string[] = [];
const previousEnv = { ...process.env };

afterEach(async () => {
  process.env = { ...previousEnv };
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe("disk monitoring", () => {
  it("uses configured upload and compiler cache paths", () => {
    process.env.FILE_UPLOAD_DIR = "/srv/uploads";
    process.env.COMPILER_CACHE_DIR = "/tmp/build-cache";
    expect(diskPaths()).toEqual({ root: "/", uploads: "/srv/uploads", compilerCache: "/tmp/build-cache" });
  });

  it("alerts when compiler cache reaches configured limit", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "fixdev-cache-"));
    roots.push(root);
    await fs.writeFile(path.join(root, "artifact"), Buffer.alloc(10));
    process.env.COMPILER_CACHE_MAX_BYTES = "10";
    await expect(checkDisk(root, 80)).resolves.toMatchObject({ status: "critical", usedBytes: 10, usedPercent: 100 });
  });

  it("treats a missing compiler cache as empty", async () => {
    await expect(checkDisk("/tmp/fixdev-cache-does-not-exist", 80)).resolves.toMatchObject({ status: "ok", usedBytes: 0 });
  });

  it("reports filesystem capacity without exposing internals", async () => {
    const result = await checkDisk("/", 0, true);
    expect(result.status).toMatch(/warning|critical/);
    expect(result.totalBytes).toBeGreaterThan(0);
    expect(result.error).toBeUndefined();
  });
});
