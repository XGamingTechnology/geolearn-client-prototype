# Batch Question Import V1

Batch Question Import V1 lets an authenticated teacher upload one JSON document from **Bank Soal → Impor JSON**. It is an authoring shortcut, not a publication path: every successful item is created with the existing `createQuestionDraft` service and produces an active `Question` plus a `DRAFT` `QuestionVersion`.

## Safety and limits

- The upload is limited to 1 MB and 1–100 questions.
- Every item is validated on the server before it reaches the domain service. Errors identify the item number and field.
- Each valid item uses the transaction already owned by `createQuestionDraft`. A failed item therefore cannot leave a `Question` without its `QuestionVersion`; other valid items can still succeed and are shown in the summary.
- Scope authorization remains enforced by `createQuestionDraft`. `SYSTEM` and `SCHOOL` imports do not bypass existing permissions.
- No item is published automatically. Dataset and media bindings are intentionally deferred for manual completion.

## Document shape

The root object requires `version: 1` and a `questions` array. An optional root `scope` (`PRIVATE`, `SCHOOL`, or `SYSTEM`) is inherited by items; an item may override it.

Each question supports:

- `title`, `subject`, `topic`, `difficulty`, `prompt`, and `stimulusType` (`text`, `image`, `video`, or `webgis`);
- `spatialMode`: `location`, `condition`, `influence`, `region`, `hierarchy`, `analogy`, `pattern`, or `association`;
- exactly five ordered `answers` objects with IDs A–E, plus `correctAnswer`;
- `explanation` (stored as correct feedback) and optional `feedbackIncorrect`;
- `mapExperience`: `standard`, `analysis`, `map-data`, or `slider`;
- `gisTools`, validated against the typed GIS tool registry, and an optional `toolParameters` object. Buffer distance must be greater than zero and no more than 100,000 metres.

Bindings are not accepted in V1. Teachers add datasets/media and finish publish-readiness checks in the normal Question Builder after import.
