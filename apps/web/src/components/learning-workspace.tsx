"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { gisToolRegistry } from "@/features/gis/tool-registry";
import type { GisToolId, QuestionConfig } from "@/features/questions/types";

const MapWorkspace = dynamic(() => import("./map-workspace").then((module) => module.MapWorkspace), {
  ssr: false,
  loading: () => <div className="map-loading">Menyiapkan peta…</div>,
});

export function LearningWorkspace({ question }: { question: QuestionConfig }) {
  const [activeTool, setActiveTool] = useState<GisToolId>("pan");
  const [completedTools, setCompletedTools] = useState<Set<GisToolId>>(new Set());
  const requiredComplete = useMemo(
    () => question.requiredTools.every((tool) => completedTools.has(tool)),
    [completedTools, question.requiredTools],
  );

  function activateTool(tool: GisToolId) {
    setActiveTool(tool);
    if (gisToolRegistry[tool].analytical) {
      setCompletedTools((current) => new Set(current).add(tool));
    }
  }

  return (
    <section className="workspace" aria-labelledby="question-title">
      <article className="question-card">
        <div className="question-meta"><span>{question.theme}</span><code>{question.id}</code></div>
        <h2 id="question-title">{question.prompt}</h2>
        <p>{question.instruction}</p>
        <div className="required-action">
          <span className={requiredComplete ? "status complete" : "status"} aria-hidden="true" />
          <div><strong>{requiredComplete ? "Aktivitas GIS selesai" : "Aktivitas GIS diperlukan"}</strong><small>Jalankan {question.requiredTools.map((tool) => gisToolRegistry[tool].label).join(", ")}.</small></div>
        </div>
        <fieldset disabled={!requiredComplete}>
          <legend>Pilih jawaban</legend>
          {["Permukiman A", "Permukiman B", "Permukiman C", "Tidak ada"].map((answer, index) => (
            <label className="answer" key={answer}><input type="radio" name="answer" /> <b>{String.fromCharCode(65 + index)}</b>{answer}</label>
          ))}
        </fieldset>
        <button className="submit" disabled={!requiredComplete}>Kirim jawaban</button>
      </article>
      <article className="map-card">
        <div className="toolbar" aria-label="Alat GIS yang disediakan soal">
          {question.tools.map((tool) => (
            <button className={activeTool === tool ? "active" : ""} key={tool} onClick={() => activateTool(tool)} type="button">
              {gisToolRegistry[tool].label}{question.requiredTools.includes(tool) && <span aria-label="wajib"> •</span>}
            </button>
          ))}
        </div>
        <MapWorkspace activeTool={activeTool} layers={question.layers} />
      </article>
    </section>
  );
}
