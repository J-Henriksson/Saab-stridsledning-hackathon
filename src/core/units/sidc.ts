import type { Affiliation, UnitCategory } from "@/types/units";
import { UNIT_TYPE_CONFIG } from "@/data/config/unitTypes";

const AFFILIATION_DIGITS: Record<Affiliation, string> = {
  unknown: "1",
  pending: "2",
  friend: "3",
  neutral: "4",
  hostile: "6",
};

export function affiliationDigit(affiliation: Affiliation): string {
  return AFFILIATION_DIGITS[affiliation];
}

export function setAffiliationOnSidc(sidc: string, affiliation: Affiliation): string {
  if (sidc.length !== 20) {
    throw new Error(`SIDC must be 20 characters, got ${sidc.length}`);
  }
  const digit = affiliationDigit(affiliation);
  return sidc.slice(0, 3) + digit + sidc.slice(4);
}

export function buildSidc(category: UnitCategory, affiliation: Affiliation): string {
  const template = UNIT_TYPE_CONFIG[category].defaultSidc;
  return setAffiliationOnSidc(template, affiliation);
}
