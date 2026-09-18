export type MediaAccessDecision = "ALLOW" | "DENY" | "CHECK_STUDENT_BINDING";

type MediaAssetAccess = {
  scope: string;
  schoolId: string | null;
  ownerTeacherId: string | null;
};

type MediaActor =
  | { kind: "student"; schoolId: string | null }
  | { kind: "teacher"; schoolId: string | null; staffUserId: string };

export function mediaAccessDecision(asset: MediaAssetAccess, actor: MediaActor): MediaAccessDecision {
  if (asset.scope === "SYSTEM") return "ALLOW";
  if (actor.kind === "student") {
    if (!actor.schoolId || asset.schoolId !== actor.schoolId) return "DENY";
    if (asset.scope === "SCHOOL") return "ALLOW";
    if (asset.scope === "PRIVATE") return "CHECK_STUDENT_BINDING";
    return "DENY";
  }
  if (asset.scope === "SCHOOL") return asset.schoolId === actor.schoolId ? "ALLOW" : "DENY";
  if (asset.scope === "PRIVATE") return asset.ownerTeacherId === actor.staffUserId ? "ALLOW" : "DENY";
  return "DENY";
}
