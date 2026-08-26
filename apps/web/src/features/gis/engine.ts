import { booleanIntersects, buffer } from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { SpatialInfluenceQuestionConfig } from "@/features/questions/types";
import type { GisActivity, GisSnapshot, GisToolResult } from "./types";

export type GisEngine = ReturnType<typeof createGisEngine>;

export function createGisEngine(question: SpatialInfluenceQuestionConfig, now: () => Date = () => new Date()) {
  let snapshot: GisSnapshot = {
    bufferFeature: null,
    affectedVillageIds: [],
    completedTools: [],
    activities: [],
  };

  function record(toolId: "buffer" | "overlay", label: string, detail: string): GisToolResult {
    const activity: GisActivity = {
      id: snapshot.activities.length + 1,
      toolId,
      label,
      detail,
      completedAt: now().toISOString(),
    };
    snapshot = {
      ...snapshot,
      completedTools: Array.from(new Set([...snapshot.completedTools, toolId])),
      activities: [...snapshot.activities, activity],
    };
    return { snapshot, activity };
  }

  return {
    getSnapshot: () => snapshot,

    runBuffer(): GisToolResult {
      const settings = question.toolSettings.buffer;
      const source = question.layers.find((layer) => layer.id === settings.sourceLayerId);
      if (!source || source.kind !== "river") {
        throw new Error(`Layer sungai '${settings.sourceLayerId}' tidak ditemukan.`);
      }

      const result = buffer(source.data, settings.distanceMeters, { units: "meters" });
      if (!result) throw new Error("Buffer tidak dapat dihitung untuk geometri sungai.");
      snapshot = { ...snapshot, bufferFeature: result as Feature<Polygon | MultiPolygon>, affectedVillageIds: [] };
      return record("buffer", `Buffer ${settings.distanceMeters} m`, `Zona pengaruh dibuat dari layer ${source.label}.`);
    },

    runOverlay(): GisToolResult {
      const bufferFeature = snapshot.bufferFeature;
      if (!bufferFeature) {
        throw new Error("Jalankan Buffer 500 m sebelum Overlay.");
      }
      const targetId = question.toolSettings.overlay.targetLayerId;
      const villages = question.layers.find((layer) => layer.id === targetId);
      if (!villages || villages.kind !== "villages") {
        throw new Error(`Layer desa '${targetId}' tidak ditemukan.`);
      }
      const affectedVillageIds = villages.data
        .filter((village) => booleanIntersects(bufferFeature, village))
        .map((village) => village.properties.id);
      snapshot = { ...snapshot, affectedVillageIds };
      return record("overlay", "Overlay desa", `${affectedVillageIds.length} desa berpotongan dengan zona buffer.`);
    },
  };
}
