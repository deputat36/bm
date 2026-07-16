import fs from "node:fs";

const filePath = "data/verification/prostornaya-4a.json";
const profile = JSON.parse(fs.readFileSync(filePath, "utf8"));

profile.schema_version = "1.1";
profile.updated_at = "2026-07-16";
profile.claims = (profile.claims || []).map((claim) => ({
  ...claim,
  checked_at: claim.checked_at || "2026-07-05",
  publication_allowed: claim.verification_status === "confirmed"
}));

if (profile.claims.length !== 23) {
  throw new Error(`Expected 23 claims, found ${profile.claims.length}`);
}
if (profile.claims.some((claim) => !claim.checked_at || typeof claim.publication_allowed !== "boolean")) {
  throw new Error("Contract fields were not added to every claim");
}
if (profile.claims.some((claim) => claim.publication_allowed)) {
  throw new Error("No Просторная 4А claim may be public before accepted sources");
}

fs.writeFileSync(filePath, `${JSON.stringify(profile, null, 2)}\n`, "utf8");
console.log("Prostornaya verification profile migrated to schema 1.1.");