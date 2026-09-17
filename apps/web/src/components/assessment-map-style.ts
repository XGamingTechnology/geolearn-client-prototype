import type { CircleMarkerOptions, PathOptions } from "leaflet";

export type AssessmentLayerRole="SOURCE"|"TARGET"|"CONTEXT";

const roleStyles:Record<AssessmentLayerRole,PathOptions>={
  SOURCE:{color:"#2563eb",fillColor:"#60a5fa",weight:3,fillOpacity:.25},
  TARGET:{color:"#0f766e",fillColor:"#2dd4bf",weight:2,fillOpacity:.22},
  CONTEXT:{color:"#64748b",fillColor:"#cbd5e1",weight:1.5,fillOpacity:.16},
};

export function assessmentPathStyle(role:AssessmentLayerRole,opacity:number):PathOptions{
  const style=roleStyles[role];
  return {...style,opacity,fillOpacity:(style.fillOpacity??.2)*opacity};
}

export function assessmentPointStyle(role:AssessmentLayerRole,opacity:number):CircleMarkerOptions{
  const style=assessmentPathStyle(role,opacity);
  const fillOpacity=Math.round(.75*opacity*1_000_000)/1_000_000;
  return {...style,radius:7,fillOpacity};
}
