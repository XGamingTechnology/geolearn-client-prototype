import { lineString, polygon } from "@turf/helpers";
import type { QuestionConfig } from "./types";

export const spatialInfluenceQuestion: QuestionConfig = {
  id: "BAN-INF-01",
  theme: "Kebencanaan",
  spatialMode: "influence",
  prompt: "Sungai meluap hingga 500 meter. Desa manakah yang terdampak?",
  instruction: "Buat Buffer 500 m dari sungai. Gunakan Overlay untuk memperjelas perpotongannya dengan batas desa, lalu tentukan jawaban.",
  tools: ["buffer", "overlay"],
  requiredTools: ["buffer"],
  toolSettings: {
    buffer: { sourceLayerId: "river", distanceMeters: 500 },
    overlay: { targetLayerId: "villages" },
  },
  layers: [
    {
      id: "river",
      kind: "river",
      label: "Sungai Winongo (simulasi)",
      data: lineString([
        [110.348, -7.778],
        [110.357, -7.787],
        [110.368, -7.797],
        [110.379, -7.807],
        [110.390, -7.818],
      ]),
    },
    {
      id: "villages",
      kind: "villages",
      label: "Batas desa (simulasi)",
      data: [
        village("village-a", "Desa A", 110.361, -7.793, 110.370, -7.800),
        village("village-b", "Desa B", 110.397, -7.779, 110.407, -7.787),
        village("village-c", "Desa C", 110.329, -7.809, 110.338, -7.818),
        village("village-d", "Desa D", 110.394, -7.824, 110.404, -7.833),
      ],
    },
  ],
  answers: [
    { id: "A", label: "Desa A", villageId: "village-a" },
    { id: "B", label: "Desa B", villageId: "village-b" },
    { id: "C", label: "Desa C", villageId: "village-c" },
    { id: "D", label: "Desa D", villageId: "village-d" },
  ],
  correctAnswer: "A",
  explanation: "Desa A berpotongan dengan zona buffer 500 meter dari alur sungai. Desa B, C, dan D berada di luar zona pengaruh pada data simulasi ini.",
};

function village(id: string, name: string, west: number, north: number, east: number, south: number) {
  return polygon(
    [[[west, north], [east, north], [east, south], [west, south], [west, north]]],
    { id, name },
  );
}
