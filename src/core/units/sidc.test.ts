import { describe, it, expect } from "vitest";
import { affiliationDigit, setAffiliationOnSidc, buildSidc } from "./sidc";

describe("affiliationDigit", () => {
  it("maps each affiliation to its APP-6(D) digit", () => {
    expect(affiliationDigit("friend")).toBe("3");
    expect(affiliationDigit("hostile")).toBe("6");
    expect(affiliationDigit("neutral")).toBe("4");
    expect(affiliationDigit("unknown")).toBe("1");
    expect(affiliationDigit("pending")).toBe("2");
  });
});

describe("setAffiliationOnSidc", () => {
  it("rewrites the affiliation digit at index 3, preserving the rest", () => {
    const original = "10031000001103000000";
    const updated = setAffiliationOnSidc(original, "hostile");
    expect(updated).toBe("10061000001103000000");
    expect(updated).toHaveLength(20);
  });

  it("is idempotent when the affiliation already matches", () => {
    const sidc = "10031000001103000000";
    expect(setAffiliationOnSidc(sidc, "friend")).toBe(sidc);
  });

  it("throws if the SIDC is not 20 characters", () => {
    expect(() => setAffiliationOnSidc("1003", "friend")).toThrow(/20/);
  });
});

describe("buildSidc", () => {
  it("uses the category template and applies the affiliation", () => {
    const sidc = buildSidc("aircraft", "hostile");
    expect(sidc).toHaveLength(20);
    expect(sidc[3]).toBe("6");
  });
});
