import { describe, expect, it } from "vitest";
import { buildPublicBaseUrl, extractTenantHost, normalizeHostname } from "./tenantHost";

describe("tenantHost", () => {
  it("normalizes hostnames", () => {
    expect(normalizeHostname("Foo.FixDev.Web.ID.:443")).toBe("foo.fixdev.web.id");
    expect(normalizeHostname("bad host")).toBeNull();
  });

  it("extracts tenant subdomains", () => {
    expect(extractTenantHost("foo.fixdev.web.id", "fixdev.web.id")).toBe("foo");
    expect(extractTenantHost("fixdev.web.id", "fixdev.web.id")).toBeNull();
    expect(extractTenantHost("foo.example.com", "fixdev.web.id")).toBeNull();
  });

  it("builds public URLs", () => {
    expect(buildPublicBaseUrl("foo", "fixdev.web.id")).toBe("https://foo.fixdev.web.id");
    expect(buildPublicBaseUrl("foo", "fixdev.web.id", "portal.example.com")).toBe("https://portal.example.com");
  });
});
