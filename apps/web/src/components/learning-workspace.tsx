"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { createGisEngine } from "@/features/gis/engine";
import { gisToolRegistry } from "@/features/gis/tool-registry";
import type { GisSnapshot } from "@/features/gis/types";
import { canSubmitAnswer, evaluateAnswer, hasCompletedRequiredTools } from "@/features/questions/session";
import type { AnswerId, GisToolId, QuestionConfig } from "@/features/questions/types";

const LeafletAdapter = dynamic(
  () => import("./leaflet-adapter").then((module) => module.LeafletAdapter),
  { ssr: false, loading: () => <div className="map-loading">Menyiapkan peta…</div> },
);

type AnswerResult = { isCorrect: boolean; selectedAnswer: AnswerId } | null;

export function LearningWorkspace({ question }: { question: QuestionConfig }) {
  const engine = useMemo(() => createGisEngine(question), [question]);
  const [snapshot, setSnapshot] = useState<GisSnapshot>(engine.getSnapshot());
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerId | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult>(null);
  const [toolError, setToolError] = useState<string | null>(null);
  const requiredComplete = hasCompletedRequiredTools(question, snapshot.completedTools);
  const canSubmit = canSubmitAnswer(question, snapshot.completedTools, selectedAnswer);

  function activateTool(toolId: GisToolId) {
    try {
      const result = gisToolRegistry[toolId].run(engine);
      setSnapshot({ ...result.snapshot });
      setToolError(null);
    } catch (error) {
      setToolError(error instanceof Error ? error.message : "Aktivitas GIS gagal dijalankan.");
    }
  }

  function submitAnswer() {
    if (!canSubmit || !selectedAnswer) return;
    setAnswerResult(evaluateAnswer(question, selectedAnswer));
  }

  return (
    <section className="workspace" aria-labelledby="question-title">
      <article className="question-card">
        <div className="question-meta"><span>{question.theme} · Spatial Influence</span><code>{question.id}</code></div>
        <h2 id="question-title">{question.prompt}</h2>
        <p>{question.instruction}</p>

        <div className="required-action" aria-live="polite">
          <span className={requiredComplete ? "status complete" : "status"} aria-hidden="true" />
          <div>
            <strong>{requiredComplete ? "Aktivitas wajib selesai" : "Aktivitas GIS wajib"}</strong>
            <small>{requiredComplete ? "Jawaban sekarang dapat dikirim." : `Jalankan ${question.requiredTools.map((tool) => gisToolRegistry[tool].label).join(", ")} sebelum menjawab.`}</small>
          </div>
        </div>

        <fieldset disabled={!requiredComplete || answerResult !== null}>
          <legend>Pilih desa yang terdampak</legend>
          {question.answers.map((answer) => (
            <label className={`answer ${selectedAnswer === answer.id ? "selected" : ""}`} key={answer.id}>
              <input checked={selectedAnswer === answer.id} name="answer" onChange={() => setSelectedAnswer(answer.id)} type="radio" />
              <b>{answer.id}</b>{answer.label}
            </label>
          ))}
        </fieldset>
        <button className="submit" disabled={!canSubmit || answerResult !== null} onClick={submitAnswer} type="button">Kirim jawaban</button>

        {answerResult && (
          <div className={`answer-result ${answerResult.isCorrect ? "correct" : "incorrect"}`} role="status">
            <strong>{answerResult.isCorrect ? "Jawaban benar" : "Jawaban belum tepat"}</strong>
            <p>{question.explanation}</p>
          </div>
        )}
      </article>

      <article className="map-card">
        <div className="map-heading">
          <div><strong>Workspace WebGIS</strong><small>Tool berasal dari konfigurasi soal</small></div>
          <span>{question.layers.length} layer aktif</span>
        </div>
        <div className="toolbar" aria-label="Alat GIS yang disediakan soal">
          {question.tools.map((toolId) => {
            const tool = gisToolRegistry[toolId];
            const complete = snapshot.completedTools.includes(toolId);
            return (
              <button className={complete ? "complete" : ""} key={toolId} onClick={() => activateTool(toolId)} title={tool.description} type="button">
                {complete ? "✓ " : ""}{tool.label}{question.requiredTools.includes(toolId) && <span aria-label="wajib"> •</span>}
              </button>
            );
          })}
        </div>
        {toolError && <p className="tool-error" role="alert">{toolError}</p>}
        <LeafletAdapter question={question} snapshot={snapshot} />
        <section className="activity-log" aria-labelledby="activity-title">
          <div><strong id="activity-title">Aktivitas GIS</strong><span>{snapshot.activities.length} tercatat</span></div>
          {snapshot.activities.length === 0 ? (
            <p>Belum ada analisis. Mulai dengan Buffer 500 m.</p>
          ) : (
            <ol>{snapshot.activities.map((activity) => <li key={activity.id}><span>✓</span><div><strong>{activity.label}</strong><small>{activity.detail}</small></div><time dateTime={activity.completedAt}>{formatTime(activity.completedAt)}</time></li>)}</ol>
          )}
        </section>
      </article>
    </section>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}
