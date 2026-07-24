import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ============================================================
// Regression: Private key exposure in certs/qz-key.pem
// ============================================================
describe("QZ certificate security regression", () => {
  const KEY_PATH = path.resolve(process.cwd(), "certs", "qz-key.pem");
  const CERT_PATH = path.resolve(process.cwd(), "certs", "qz-cert.pem");

  it("private key file must be redacted, not contain actual key material", () => {
    const content = fs.readFileSync(KEY_PATH, "utf8");
    const lines = content.split("\n");
    const nonRedacted = lines.filter(
      (l) => l.trim() && !l.startsWith("-----") && l !== "[REDACTED - See .env.example and ops/README.md for QZ_KEY_PATH configuration]"
    );
    expect(nonRedacted.length).toBe(0);
  });

  it("certificate file must exist", () => {
    const content = fs.readFileSync(CERT_PATH, "utf8");
    expect(content).toContain("-----BEGIN CERTIFICATE-----");
  });

  it("private key file must contain REDACTED marker", () => {
    const content = fs.readFileSync(KEY_PATH, "utf8");
    expect(content).toContain("REDACTED");
  });
});

// ============================================================
// Regression: crudPlugin raw error replaced with logger
// ============================================================
describe("crudPlugin raw error regression", () => {
  it("must not use console.error for schema resolution failure", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src", "server", "plugins", "crudPlugin.ts"),
      "utf-8"
    );
    expect(source).not.toContain("console.error");
  });
});