import type { GisToolId } from "@/features/questions/types";

export const gisToolRegistry: Record<GisToolId, { label: string; analytical: boolean }> = {
  pan: { label: "Geser", analytical: false },
  zoom: { label: "Perbesar", analytical: false },
  buffer: { label: "Buffer 500 m", analytical: true },
  overlay: { label: "Overlay", analytical: true },
  distance: { label: "Ukur jarak", analytical: true },
};
