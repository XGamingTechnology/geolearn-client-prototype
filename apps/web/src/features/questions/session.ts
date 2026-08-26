import type { AnswerId, GisToolId, QuestionConfig } from "./types";

export function hasCompletedRequiredTools(question: QuestionConfig, completedTools: GisToolId[]) {
  return question.requiredTools.every((tool) => completedTools.includes(tool));
}

export function canSubmitAnswer(question: QuestionConfig, completedTools: GisToolId[], selectedAnswer: AnswerId | null) {
  return selectedAnswer !== null && hasCompletedRequiredTools(question, completedTools);
}

export function evaluateAnswer(question: QuestionConfig, selectedAnswer: AnswerId) {
  return {
    selectedAnswer,
    isCorrect: selectedAnswer === question.correctAnswer,
    explanation: question.explanation,
  };
}
