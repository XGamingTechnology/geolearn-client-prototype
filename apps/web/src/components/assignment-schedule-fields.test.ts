import { describe, expect, it } from "vitest";
import { localDateTimeToUtc } from "./assignment-schedule-fields";

describe("assignment schedule browser conversion",()=>{
  it("converts a browser-local datetime to an absolute UTC ISO instant",()=>{
    const local="2026-09-17T10:30";
    expect(localDateTimeToUtc(local)).toBe(new Date(local).toISOString());
    expect(localDateTimeToUtc(local)).toMatch(/Z$/);
  });

  it("keeps an empty schedule empty",()=>{
    expect(localDateTimeToUtc("")).toBe("");
  });
});
