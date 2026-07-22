import { describe, expect, it } from "vitest";
import { getSettingsTabs } from "./settingsConfigs";

describe("getSettingsTabs", () => {
  it("uses server-issued role and permissions without exposing platform storage", () => {
    expect(getSettingsTabs("OWNER").some(({ id }) => id === "storage")).toBe(false);
    expect(getSettingsTabs("SUPER_ADMIN", ["admin_access"])).toEqual([]);
    expect(getSettingsTabs("MANAGER", ["settings:notification"]).map(({ id }) => id)).toEqual([
      "telegram",
      "notifications",
    ]);
  });
});
