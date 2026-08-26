import type { GisToolId } from "@/features/questions/types";
import type { GisEngine } from "./engine";
import type { GisToolResult } from "./types";

type GisToolDefinition = {
  label: string;
  description: string;
  run: (engine: GisEngine) => GisToolResult;
};

export const gisToolRegistry: Record<GisToolId, GisToolDefinition> = {
  buffer: {
    label: "Buffer 500 m",
    description: "Buat zona pengaruh sejauh 500 meter dari sungai.",
    run: (engine) => engine.runBuffer(),
  },
  overlay: {
    label: "Overlay",
    description: "Temukan desa yang berpotongan dengan zona pengaruh.",
    run: (engine) => engine.runOverlay(),
  },
};
