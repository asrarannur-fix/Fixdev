import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateSettingsDomain, mergeSettingsSecrets } from "../src/server/controllers/settings.controller.js";
import { redactTenantSettingsSecrets } from "../src/server/controllers/bootstrap.controller.js";

describe("settings validator", () => {
  it("rejects domain settings with non-valid fields, billing limits, invalid branding colors or non-HTTPS URLs", () => {
    assert.equal(validateSettingsDomain("securitySettings", { sessionTimeout: 60, limits: { users: 999 } }).success, false, "should reject invalid domain");
    assert.equal(validateSettingsDomain("branding", { primaryColor: "#12345" }).success, false);
    assert.equal(validateSettingsDomain("branding", { logoUrl: "http://example.com/logo.png" }).success, false);
    assert.equal(validateSettingsDomain("branding", { primaryColor: "#abc", secondaryColor: "#A1b2C3", logoUrl: "https://example.com/logo.png" }).success, true);
  });

  it("preserves valid domain fields and strict range/length", () => {
    assert.equal(validateSettingsDomain("serviceSettings", { defaultDiagnosisFee: 25000, slaHours: 48, requireEstimateApproval: true }).success, true);
    assert.equal(validateSettingsDomain("serviceSettings", { slaHours: 721 }).success, false);
    assert.equal(validateSettingsDomain("emailSettings", { smtpPort: 65536 }).success, false);
  });
});

describe("secret merge", () => {
  it("omitted/masked/empty secret preserves server secret", () => {
    const existing = { smtpHost: "smtp.example.com", smtpPass: "secret" };
    assert.equal(mergeSettingsSecrets("emailSettings", existing, { smtpPass: "••••••••" }).smtpPass, "secret");
    assert.equal(mergeSettingsSecrets("emailSettings", existing, { smtpPass: "" }).smtpPass, "secret");
    assert.equal(mergeSettingsSecrets("emailSettings", existing, { smtpHost: "smtp2.example.com" }).smtpPass, "secret");
    assert.equal(mergeSettingsSecrets("emailSettings", existing, { smtpPass: "new-secret" }).smtpPass, "new-secret");
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
    assert.equal(safe.settings.emailSettings.smtpPass, undefined);
    assert.equal(safe.settings.notificationSettings.telegramBotToken, undefined);
    assert.equal(safe.settings.waConfig.apiToken, undefined);
    assert.equal(safe.settings.waConfig.webhookSecret, undefined);
    assert.equal(safe.settings.waConfig.whatsappKey, undefined);
    assert.equal(safe.settings.emailSettings.smtpConfigured, true);
    assert.equal(safe.settings.notificationSettings.telegramConfigured, true);
    assert.equal(safe.settings.waConfig.credentialsConfigured, true);
  });
});
