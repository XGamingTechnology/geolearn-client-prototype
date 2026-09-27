import { describe, expect, it } from "vitest";
import { primaryNavigation, resourceNavigation } from "./app-shell";

describe("teacher responsive navigation", () => {
  it("keeps the four primary mobile destinations in the required order", () => {
    expect(primaryNavigation.slice(0, 4).map(({ href, short }) => ({ href, short }))).toEqual([
      { href: "/teacher", short: "Home" },
      { href: "/teacher/questions", short: "Soal" },
      { href: "/teacher/assignments", short: "Tugas" },
      { href: "/teacher/results", short: "Hasil" },
    ]);
  });

  it("keeps Bank Data available in teacher resources", () => {
    expect(resourceNavigation).toContainEqual(
      expect.objectContaining({ href: "/teacher/data", label: "Bank Data" }),
    );
  });
});
