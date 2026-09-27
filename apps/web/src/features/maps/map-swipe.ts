export const DEFAULT_SLIDER_POSITION = 50;

export function clampSliderPosition(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SLIDER_POSITION;
  return Math.min(100, Math.max(0, value));
}

export function isSliderExperience(value: unknown): value is "slider" {
  return value === "slider";
}

export function sliderRoleAssignment<T extends { role: string }>(layers: T[]) {
  return {
    source: layers.filter((layer) => layer.role === "SOURCE"),
    target: layers.filter((layer) => layer.role === "TARGET"),
    context: layers.filter((layer) => layer.role === "CONTEXT"),
  };
}
