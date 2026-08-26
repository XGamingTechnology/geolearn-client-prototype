import type { GisToolId } from "@/features/questions/types";
import type { GisEngine } from "./engine";
import type { GisToolResult } from "./types";

export type GisToolDefinition = {
  label: string;
  description: string;
  category: "navigation" | "exploration" | "analysis" | "visualization";
  availability: "available" | "planned";
  run?: (engine: GisEngine) => GisToolResult;
};

const navigation = (label: string, description: string): GisToolDefinition => ({
  label, description, category: "navigation", availability: "available",
});
const planned = (
  label: string,
  description: string,
  category: GisToolDefinition["category"] = "analysis",
): GisToolDefinition => ({ label, description, category, availability: "planned" });

export const gisToolRegistry: Record<GisToolId, GisToolDefinition> = {
  pan: navigation("Geser", "Geser tampilan peta."),
  zoom: navigation("Perbesar", "Ubah tingkat perbesaran peta."),
  search: planned("Cari lokasi", "Cari objek atau lokasi.", "exploration"),
  coordinate: planned("Koordinat", "Baca koordinat pada peta.", "exploration"),
  "layer-control": planned("Kontrol layer", "Atur visibilitas layer.", "exploration"),
  popup: planned("Informasi objek", "Baca informasi objek terpilih.", "exploration"),
  "attribute-table": planned("Tabel atribut", "Jelajahi atribut fitur.", "exploration"),
  buffer: {
    label: "Buffer 500 m",
    description: "Buat zona pengaruh sejauh 500 meter dari sungai.",
    category: "analysis",
    availability: "available",
    run: (engine) => engine.runBuffer(),
  },
  overlay: {
    label: "Overlay",
    description: "Temukan desa yang berpotongan dengan zona pengaruh.",
    category: "analysis",
    availability: "available",
    run: (engine) => engine.runOverlay(),
  },
  distance: planned("Ukur jarak", "Ukur jarak antarobjek."),
  filter: planned("Filter", "Saring fitur berdasarkan atribut.", "exploration"),
  symbology: planned("Simbologi", "Ubah representasi tematik.", "visualization"),
  network: planned("Jaringan", "Analisis konektivitas jaringan."),
  "administrative-layer": planned("Layer administrasi", "Tampilkan batas administrasi.", "exploration"),
  swipe: planned("Swipe", "Bandingkan dua layer secara interaktif.", "visualization"),
  compare: planned("Bandingkan", "Bandingkan layer atau wilayah.", "visualization"),
  heatmap: planned("Heatmap", "Visualisasikan intensitas spasial.", "visualization"),
  cluster: planned("Cluster", "Kelompokkan titik yang berdekatan.", "visualization"),
  transparency: planned("Transparansi", "Atur transparansi layer.", "visualization"),
};
