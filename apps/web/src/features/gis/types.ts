import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { GisToolId } from "@/features/questions/types";

export type GisActivity = {
  id: number;
  toolId: GisToolId;
  label: string;
  detail: string;
  completedAt: string;
};

export type GisSnapshot = {
  bufferFeature: Feature<Polygon | MultiPolygon> | null;
  affectedVillageIds: string[];
  completedTools: GisToolId[];
  activities: GisActivity[];
};

export type GisToolResult = {
  snapshot: GisSnapshot;
  activity: GisActivity;
};
