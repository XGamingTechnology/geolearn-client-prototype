import type { Feature, LineString, Polygon } from "geojson";

export const gisToolIds = ["buffer", "overlay"] as const;
export type GisToolId = (typeof gisToolIds)[number];
export type AnswerId = "A" | "B" | "C" | "D";

export type RiverLayer = {
  id: string;
  kind: "river";
  label: string;
  data: Feature<LineString>;
};

export type VillageLayer = {
  id: string;
  kind: "villages";
  label: string;
  data: Array<Feature<Polygon, { id: string; name: string }>>;
};

export type QuestionConfig = {
  id: string;
  theme: string;
  spatialMode: "influence";
  prompt: string;
  instruction: string;
  tools: GisToolId[];
  requiredTools: GisToolId[];
  toolSettings: {
    buffer: { sourceLayerId: string; distanceMeters: number };
    overlay: { targetLayerId: string };
  };
  layers: [RiverLayer, VillageLayer];
  answers: Array<{ id: AnswerId; label: string; villageId: string }>;
  correctAnswer: AnswerId;
  explanation: string;
};
