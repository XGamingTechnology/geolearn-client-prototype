# Batch Question Import V2

Batch Question Import V2 extends V1 with reusable Stimulus Set creation and automatic question grouping. V1 documents remain supported.

## Core behavior

- Upload remains limited to 1 MB and 1–100 questions.
- Every successful question creates an active `Question` plus a `DRAFT` `QuestionVersion`.
- Nothing is published automatically.
- V2 may define up to 100 `stimulusSets`.
- A question may reference a set with `groupKey`.
- `scope` and `stimulusType` of a grouped question must match its Stimulus Set.
- V2 creates the Stimulus Set first, creates the draft question through the existing domain service, then attaches that question to the set through the existing grouping service.
- Dataset and media bindings remain manual. V2 groups authoring objects but does not invent or auto-bind missing source data.

## Example

```json
{
  "version": 2,
  "scope": "PRIVATE",
  "stimulusSets": [
    {
      "key": "siak-map",
      "title": "Sungai Siak dan Sekolah",
      "description": "Peta bersama untuk soal lokasi sekolah di sekitar Sungai Siak.",
      "subject": "Geografi",
      "topic": "Lokasi",
      "stimulusType": "webgis"
    }
  ],
  "questions": [
    {
      "groupKey": "siak-map",
      "title": "Lokasi sekolah terhadap Sungai Siak",
      "subject": "Geografi",
      "topic": "Lokasi",
      "difficulty": "HOTS",
      "prompt": "Sekolah manakah yang paling dekat dengan Sungai Siak?",
      "stimulusType": "webgis",
      "spatialMode": "location",
      "answers": [
        {"id":"A","label":"Pilihan A"},
        {"id":"B","label":"Pilihan B"},
        {"id":"C","label":"Pilihan C"},
        {"id":"D","label":"Pilihan D"},
        {"id":"E","label":"Pilihan E"}
      ],
      "correctAnswer": "A",
      "explanation": "Penjelasan jawaban benar.",
      "mapExperience": "analysis",
      "gisTools": ["buffer"],
      "toolParameters": {"buffer":{"distanceMeters":500}}
    }
  ]
}
```

## Stimulus Set validation

Each set requires a unique `key`, a `title`, and `stimulusType` (`text`, `image`, `video`, or `webgis`). The optional `scope` inherits the document scope. Keys are limited to letters, numbers, hyphen, and underscore.

If a question references a missing group, or its scope/stimulus type differs from that group, the question is rejected before persistence. If a Stimulus Set cannot be created because of authorization or storage failure, questions depending on that set are not created.

## Compatibility

A document with `version: 1` follows the original V1 behavior and creates standalone drafts without Stimulus Sets.
