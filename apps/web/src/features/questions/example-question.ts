import type { QuestionConfig } from "./types";

export const exampleQuestion: QuestionConfig = {
  id: "BAN-INF-01",
  theme: "Kebencanaan",
  spatialMode: "influence",
  prompt: "Permukiman mana yang berada dalam area pengaruh luapan sungai?",
  instruction: "Gunakan buffer untuk mengamati area pengaruh sebelum menjawab.",
  tools: ["pan", "zoom", "buffer", "overlay", "distance"],
  requiredTools: ["buffer"],
  layers: [
    { id: "river", label: "Sungai", enabledByDefault: true },
    { id: "settlement", label: "Permukiman", enabledByDefault: true },
    { id: "administrative", label: "Batas administrasi", enabledByDefault: false },
  ],
};
