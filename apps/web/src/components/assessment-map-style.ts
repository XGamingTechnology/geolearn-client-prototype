import type { CircleMarkerOptions, PathOptions } from "leaflet";

import type { QuestionDatasetRole } from "@/server/content/question-datasets";

const roleStyles: Record<QuestionDatasetRole, PathOptions> = {
  SOURCE: { color: "#2563eb", fillColor: "#60a5fa", weight: 3 },
  TARGET: { color: "#0f766e", fillColor: "#2dd4bf", weight: 2 },
  CONTEXT: { color: "#64748b", fillColor: "#cbd5e1", weight: 1.5 },
};

export function assessmentPointStyle(
  role: QuestionDatasetRole,
  opacity: number,
): CircleMarkerOptions {
  return {
    ...roleStyles[role],
    radius: 7,
    opacity,
    fillOpacity: Math.round(0.75 * opacity * 1_000_000) / 1_000_000,
  };
}

export function assessmentPathStyle(
  role: QuestionDatasetRole,
  opacity: number,
): PathOptions {
  const style = roleStyles[role];
  const roleFillOpacity = role === "SOURCE" ? 0.25 : role === "TARGET" ? 0.22 : 0.16;

  return {
    ...style,
    opacity,
    fillOpacity: roleFillOpacity * opacity,
  };
}
