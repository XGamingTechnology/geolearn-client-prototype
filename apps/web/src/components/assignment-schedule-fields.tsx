"use client";

import { useState } from "react";

function toUtc(localValue: string): string {
  if (!localValue) return "";
  const value = new Date(localValue);
  return Number.isNaN(value.getTime()) ? "" : value.toISOString();
}

export function AssignmentScheduleFields() {
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");

  return <div className="builder-two-col">
    <label>Buka
      <input type="datetime-local" value={opensAt} onChange={(event)=>setOpensAt(event.currentTarget.value)}/>
      <input type="hidden" name="opensAt" value={toUtc(opensAt)}/>
    </label>
    <label>Tutup
      <input type="datetime-local" value={closesAt} onChange={(event)=>setClosesAt(event.currentTarget.value)}/>
      <input type="hidden" name="closesAt" value={toUtc(closesAt)}/>
    </label>
  </div>;
}

