// @vitest-environment node

import { describe, it, expect } from "vitest";
import { validateSettingsDomain, mergeSettingsSecrets } from "../src/server/controllers/settings.controller.js";
import { redactTenantSettingsSecrets } from "../src/server/controllers/bootstrap.controller.js";

describe("settings validator", () => {
  it("rejects domain settings with non-valid fields, billing limits, invalid branding colors or non-HTTPS URLs", () => {
    expect(validateSettingsDomain("securitySettings", { sessionTimeout: 60, limits: { users: 999 } }).success, "should reject invalid domain");
    expect(validateSettingsDomain("securitySettings", { sessionTimeout: 60, limits: { users: 999 } }).success).toBe(false);
    expect(validateSettingsDomain("branding", { primaryColor: "#12345" }).success).toBe(false);
    expect(validateSettingsDomain("branding", { logoUrl: "http://example.com/logo.png" }).success).toBe(false);
    expect(validateSettingsDomain("branding", { primaryColor: "#abc", secondaryColor: "#A1b2C3", logoUrl: "https://example.com/logo.png" }).success).toBe(true);
  });

  it("preserves valid domain fields and strict range/length", () => {
    expect(validateSettingsDomain("serviceSettings", { defaultDiagnosisFee: 25000, slaHours: 48, requireEstimateApproval: true }).success).toBe(true);
    expect(validateSettingsDomain("serviceSettings", { slaHours: 721 }).success).toBe(false);
    expect(validateSettingsDomain("emailSettings", { smtpPort: 65536 }).success).toBe(false);
  });
});

describe("secret merge", () => {
  it("omitted/masked/empty secret preserves server secret", () => {
    const existing = { smtpHost: "smtp.example.com", smtpPass: "secret" };
    expect(mergeSettingsSecrets("emailSettings", existing, { smtpPass: "••••••••" }).smtpPass).toBe("secret");
    expect(mergeSettingsSecrets("emailSettings", existing, { smtpPass: "" }).smtpPass).toBe("secret");
    expect(mergeSettingsSecrets("emailSettings", existing, { smtpHost: "smtp2.example.com" }).smtpPass).toBe("secret");
    expect(mergeSettingsSecrets("emailSettings", existing, { smtpPass: "new-secret" }).smtpPass).toBe("new-secret");
  });
});

describe("bootstrap redaction", () => {
  it("redacts integration secrets and adds configured flags", () => {
    const safe = redactTenantSettingsSecrets({
      id: "tenant-1",
      settings: {
        emailSettings: { smtpPass: "smtp-secret" },
        notificationSettings: { telegramBotToken: "bot-secret" },
        waConfig: { apiToken: "api-secret", webhookSecret: "hook-secret", whatsappKey: "wa-secret" }
      }
    });
    expect(safe.settings.emailSettings.smtpPass).toBeUndefined();
    expect(safe.settings.notificationSettings.telegramBotToken).toBeUndefined();
    expect(safe.settings.waConfig.apiToken).toBeUndefined();
    expect(safe.settings.waConfig.webhookSecret).toBeUndefined();
    expect(safe.settings.waConfig.whatsappKey).toBeUndefined();
    expect(safe.settings.emailSettings.smtpConfigured).toBe(true);
    expect(safe.settings.notificationSettings.telegramConfigured).toBe(true);
    expect(safe.settings.waConfig.credentialsConfigured).toBe(true);
  });
});
