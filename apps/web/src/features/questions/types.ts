export const gisToolIds = ["pan", "zoom", "buffer", "overlay", "distance"] as const;
export type GisToolId = (typeof gisToolIds)[number];

export type QuestionConfig = {
  id: string;
  theme: string;
  spatialMode: "location" | "condition" | "influence" | "group" | "hierarchy" | "analogy" | "pattern" | "association";
  prompt: string;
  instruction: string;
  tools: GisToolId[];
  requiredTools: GisToolId[];
  layers: Array<{ id: string; label: string; enabledByDefault: boolean }>;
};
