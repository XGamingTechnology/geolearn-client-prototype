import type { Feature, FeatureCollection, Geometry, LineString, Polygon } from "geojson";

export const spatialThinkingModes = [
  "location",
  "condition",
  "influence",
  "region",
  "hierarchy",
  "analogy",
  "pattern",
  "association",
] as const;
export type SpatialThinkingMode = (typeof spatialThinkingModes)[number];

export const gisToolIds = [
  "pan",
  "zoom",
  "search",
  "coordinate",
  "layer-control",
  "popup",
  "attribute-table",
  "buffer",
  "overlay",
  "distance",
  "filter",
  "symbology",
  "network",
  "administrative-layer",
  "swipe",
  "compare",
  "heatmap",
  "cluster",
  "transparency",
] as const;
export type GisToolId = (typeof gisToolIds)[number];
export type AnswerId = "A" | "B" | "C" | "D" | "E";

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

export type GenericSpatialLayer = {
  id: string;
  kind: "geojson";
  label: string;
  data: Feature<Geometry> | FeatureCollection<Geometry>;
};

export type SpatialLayer = RiverLayer | VillageLayer | GenericSpatialLayer;

export type GisToolSettings = {
  buffer?: { sourceLayerId: string; distanceMeters: number };
  overlay?: { targetLayerId: string };
};

export type QuestionConfig<
  TMode extends SpatialThinkingMode = SpatialThinkingMode,
  TLayer extends SpatialLayer = SpatialLayer,
  TSettings extends GisToolSettings = GisToolSettings,
> = {
  id: string;
  theme: string;
  spatialMode: TMode;
  prompt: string;
  instruction: string;
  tools: GisToolId[];
  requiredTools: GisToolId[];
  toolSettings: TSettings;
  layers: TLayer[];
  answers: Array<{ id: AnswerId; label: string; featureId?: string }>;
  correctAnswer: AnswerId;
  explanation: string;
};

export type SpatialInfluenceQuestionConfig = QuestionConfig<
  "influence",
  RiverLayer | VillageLayer,
  {
    buffer: { sourceLayerId: string; distanceMeters: number };
    overlay: { targetLayerId: string };
  }
>;
