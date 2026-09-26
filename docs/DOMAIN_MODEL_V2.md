# GeoLearn Domain Model V2

Status: **DRAFT FOR APPROVAL**  
Depends on: Product Flow V2 (#5, locked)  
Tracking issue: #6

## 1. Product boundary

GeoLearn is a Spatial Thinking assessment platform with:

- isolated classes and student attempts,
- teacher-managed student access,
- reusable Question Bank,
- reusable Data Bank,
- multimodal stimulus,
- optional GIS activity,
- versioned content,
- Spatial Thinking analytics.

Students do not self-register. Teachers or school operators provision student identities.

---

## 2. Top-level domain map

```text
SCHOOL
│
├── STAFF USER
│   └── Teacher
│
├── CLASS
│   ├── Enrollment ───────────────┐
│   │                             │
│   └── Assignment                │
│          │                      │
│          ▼                      │
│      QuizVersion                │
│          │                      │
│          ▼                      │
│     QuestionVersion             │
│                                 │
└── STUDENT ─ StudentCredential ──┘
           │
           ▼
        Attempt
           │
      ┌────┴───────────────┐
      ▼                    ▼
   Response            GisActivity
      │
      ▼
ResponseSpatialArtifact

CONTENT BANK
│
├── MediaAsset
├── Dataset
│    └── DatasetVersion
├── Case
│    └── CaseVersion
├── Question
│    └── QuestionVersion
└── Quiz
     └── QuizVersion
          └── QuizItem

ANALYTICS
│
├── QuestionSkillWeight
└── SpatialSkillScore
```

---

## 3. Identity and tenancy

### 3.1 School

Tenant root for school-owned data.

Core fields:

- `id`
- `name`
- `code`
- `status`
- `created_at`

Rules:

- school-scoped classes, students, teachers, content, and attempts belong to one School,
- System Bank content has no school owner,
- a future multi-school deployment must never require changing Question or Dataset semantics.

### 3.2 StaffUser

Represents authenticated adults operating GeoLearn.

Roles:

- `SYSTEM_ADMIN`
- `SCHOOL_ADMIN`
- `TEACHER`

Core fields:

- `id`
- `school_id` nullable for system admin
- `email`
- `password_hash`
- `role`
- `status`

Important: Student is **not** modeled as a general StaffUser.

### 3.3 TeacherProfile

Optional teacher-specific profile.

Fields may include:

- display name
- employee/NIP reference if used by school
- subject
- avatar
- school metadata

### 3.4 Student

School-managed learner identity.

Core fields:

- `id`
- `school_id`
- `student_number` / NIS / local identifier
- `full_name`
- `status`
- optional cohort metadata

Student is independent from a single class so the same learner can move classes without losing history.

### 3.5 StudentCredential

Authentication credential for student login.

Login flow:

```text
Class Code
+ Student ID
+ PIN
→ resolve Enrollment
→ authenticate Student
→ open class context
```

Core fields:

- `student_id`
- `login_id`
- `pin_hash`
- `status`
- `must_change_pin`
- `last_reset_at`
- `last_login_at`

Rules:

- PIN is never stored in plaintext,
- generated PIN may be shown once to teacher,
- reset invalidates prior PIN,
- credential may be disabled without deleting student history.

### 3.6 Class

Teaching context.

Core fields:

- `id`
- `school_id`
- `teacher_id`
- `name` e.g. XI-A
- `grade_level`
- `academic_year`
- `semester`
- `class_code`
- `status`

Class Code should be human-readable but random enough to avoid guessing.

### 3.7 Enrollment

Join entity between Student and Class.

Core fields:

- `id`
- `class_id`
- `student_id`
- `status`
- `joined_at`
- `left_at`

This is the isolation anchor for student access to assignments and results.

---

## 4. Ownership and visibility

Reusable content uses an explicit scope.

```text
SYSTEM
SCHOOL
PRIVATE
```

### Visibility matrix

| Scope | Owner | View | Use directly | Duplicate/Fork | Edit source | Delete source |
|---|---|---|---|---|---|---|
| SYSTEM | GeoLearn | all authorized teachers | yes | yes | system admin only | system admin only |
| SCHOOL | School | teachers in same school | yes | yes | permitted owner/admin | permitted owner/admin |
| PRIVATE | Teacher | owner only | yes | owner | owner | owner |

Rules:

- student never browses Bank Soal or Bank Data directly,
- assignment runtime grants only the exact assets needed by the assignment,
- duplicated content becomes a new logical object with provenance.

---

## 5. Reuse and provenance

### 5.1 Use

Teacher references an existing published QuestionVersion or DatasetVersion without copying it.

### 5.2 Duplicate / Fork

Teacher creates a new logical object they can edit.

Recommended provenance fields:

- `forked_from_question_version_id`
- `forked_from_dataset_version_id`
- `forked_from_case_version_id`

Original source remains unchanged.

---

## 6. Versioning rules

### General rule

```text
DRAFT
→ editable
→ PUBLISH
→ immutable
→ edit again = create new version
```

Published content is never modified in place when it may already be used by an Assignment or Attempt.

### Objects that require versions

- Dataset → DatasetVersion
- Case → CaseVersion
- Question → QuestionVersion
- Quiz → QuizVersion

### Why QuizVersion is required

Assignments must preserve the exact set and order of QuestionVersions delivered to students.

```text
Assignment
→ QuizVersion
→ QuizItem
→ exact QuestionVersion
```

This prevents an old assignment from silently changing when a teacher edits a question later.

---

## 7. Media model

### MediaAsset

For non-spatial media:

- image
- video
- document
- chart image / illustration

Core fields:

- `id`
- `school_id` nullable
- `owner_teacher_id` nullable
- `scope`
- `media_type`
- `storage_key`
- `mime_type`
- `size_bytes`
- `metadata_json`
- `status`

Binary media should live in object/file storage, not inside PostgreSQL rows.

---

## 8. Data Bank model

### 8.1 Dataset

Logical reusable dataset.

Fields:

- `id`
- `school_id` nullable
- `owner_teacher_id` nullable
- `scope`
- `title`
- `description`
- `data_kind` = VECTOR | RASTER | TABLE
- `source_type` = UPLOAD | DIGITIZED | GENERATED | SYSTEM
- `status`
- provenance fields

### 8.2 DatasetVersion

Immutable technical snapshot.

Suggested fields:

- `id`
- `dataset_id`
- `version_number`
- `format`
- `srid`
- `geometry_type`
- `bbox`
- `feature_count`
- `schema_json`
- `default_style_json`
- `storage_key` for raster/original upload
- `processing_status`
- `published_at`

Supported initial formats:

- GeoJSON
- SHP ZIP
- KML
- CSV with coordinates
- GeoTIFF
- digitized Point / Line / Polygon

### 8.3 Generic vector storage

Recommended initial PostGIS model:

```text
dataset_features
- id
- dataset_version_id
- source_feature_id
- geom geometry(Geometry, 4326)
- properties jsonb
```

Indexes:

- B-tree on `dataset_version_id`
- GIST on `geom`

This gives the Data Bank one flexible vector storage model without creating one SQL table per uploaded file.

For very large datasets, tiling/dedicated tables can be introduced later.

### 8.4 Raster storage

Store raster files outside the relational DB initially.

PostgreSQL keeps:

- metadata,
- storage location,
- extent,
- CRS,
- rendering configuration.

---

## 9. Case model

A Case is a reusable learning context shared by one or more questions.

Examples:

- Banjir Rob Semarang–Demak
- Sungai Siak dan sekolah
- Kawasan Monas
- Gunung Merapi

### Case

Logical identity and ownership.

### CaseVersion

Immutable published snapshot containing:

- title,
- narrative/context,
- linked MediaAssets,
- linked DatasetVersions,
- map view,
- layer order,
- default visibility,
- stimulus layout configuration.

A QuestionVersion may:

- reference one CaseVersion,
- or be standalone when no reusable case is needed.

---

## 10. Question Schema V2

### Question

Logical bank item.

Fields include:

- ownership/scope,
- title,
- subject/topic,
- provenance,
- status.

### QuestionVersion

Published assessment definition.

Core indexed fields:

- `question_id`
- `version_number`
- `case_version_id` nullable
- `spatial_mode`
- `difficulty`
- `bloom_level`
- `prompt`
- `status`

Spatial Thinking modes:

```text
location
condition
influence
region
hierarchy
analogy
pattern
association
```

Note: V1 `group` is replaced by academic term `region` in V2.

### Configuration blocks

QuestionVersion owns five polymorphic configs:

```text
stimulus_config
activity_config
response_config
validation_config
feedback_config
```

These can be stored as JSONB while core searchable fields remain relational.

### 10.1 Stimulus config

Supported types:

- text
- image
- video
- static-map
- webgis
- dual-map
- map-table
- map-chart
- composite

Example:

```json
{
  "type": "webgis",
  "caseVersionId": "casev_123",
  "layout": "map-table"
}
```

### 10.2 Activity config

Describes what student may/must do.

Example:

```json
{
  "tools": ["pan", "zoom", "popup", "buffer"],
  "requiredActions": [
    {
      "tool": "buffer",
      "parameters": {
        "distanceMeters": 500,
        "sourceDatasetVersionId": "dsv_river"
      }
    }
  ]
}
```

Important: labels such as “Buffer 500 m” must be generated from config, not hardcoded in the global tool registry.

### 10.3 Response config

Initial types:

- multiple-choice
- multi-select
- map-feature-select
- draw-point
- draw-line
- draw-polygon
- ranking
- numeric
- short-text
- composite

Multiple-choice must support **A–E**, not V1 A–D only.

### 10.4 Validation config

Validation methods:

- static-answer
- multi-select-set
- spatial-query
- geometry-overlap
- geometry-distance
- selected-feature-rule
- numeric-tolerance
- manual-review

Authoritative spatial validation should run server-side using PostGIS when persisted datasets are involved.

Turf.js remains useful for bounded client-side preview and immediate interaction.

### 10.5 Feedback config

Supports:

- correct explanation,
- incorrect explanation,
- distractor-specific feedback,
- reveal map layer/result,
- optional retry policy.

---

## 11. Skill model

One question has one primary Spatial Thinking mode but may measure multiple supporting skills.

### QuestionSkillWeight

Fields:

- `question_version_id`
- `skill_code`
- `weight`

Examples:

- proximity
- coordinate-reading
- buffer
- overlay
- network-accessibility
- comparison
- classification
- pattern-recognition

This allows analytics beyond one total score.

---

## 12. Quiz and assignment

### Quiz

Reusable assessment collection.

### QuizVersion

Immutable composition.

### QuizItem

Fields:

- `quiz_version_id`
- `question_version_id`
- `position`
- `points`
- optional section metadata

### Assignment

Teacher assigns one QuizVersion to one Class.

Fields:

- `class_id`
- `quiz_version_id`
- `teacher_id`
- `opens_at`
- `closes_at`
- `attempt_limit`
- `result_visibility`
- `status`

---

## 13. Assessment runtime

### Attempt

One student's run of one Assignment.

Fields:

- `assignment_id`
- `student_id`
- `attempt_number`
- `status`
- `started_at`
- `submitted_at`
- `score_raw`
- `score_max`

Attempt is the source of truth for historical assessment state.

### Response

One answer to one QuizItem / QuestionVersion.

Fields:

- `attempt_id`
- `question_version_id`
- `response_json`
- `is_correct`
- `score_awarded`
- `duration_ms`
- `answered_at`

### ResponseSpatialArtifact

Stores map-based student response geometry.

Fields:

- `response_id`
- `artifact_type` = POINT | LINE | POLYGON | SELECTION
- `geom geometry(Geometry,4326)` nullable
- `selected_feature_ids jsonb`
- `properties jsonb`

This supports drawing as an answer, not merely GIS visualization.

---

## 14. GIS activity log

### GisActivity

Append-only learning telemetry.

Suggested fields:

- `attempt_id`
- `response_id` nullable
- `question_version_id`
- `tool_id`
- `action_type`
- `parameters_json`
- `result_summary_json`
- `occurred_at`

Examples:

- map_open
- layer_toggle
- popup_identify
- buffer_run
- overlay_run
- distance_measure
- feature_select
- draw_create
- draw_edit
- submit_response

Do not store every mouse move/pan pixel by default. Log meaningful learning actions only.

---

## 15. Results and analytics

### Result

Optional persisted summary per Attempt.

Derived from Responses, not an independent source of truth.

### SpatialSkillScore

Materialized/derived analytics.

Possible dimensions:

- by Spatial Thinking mode,
- by skill,
- by GIS required-action completion,
- accuracy,
- completion,
- time.

Example profile:

```text
Location      82%
Condition     70%
Influence     91%
Region        64%
Hierarchy     58%
Analogy       76%
Pattern       69%
Association   61%
```

Analytics must be recomputable from immutable QuestionVersions + Attempts + Responses + GisActivities.

---

## 16. Isolation rules

### Teacher

Teacher may access:

- own classes,
- students enrolled in own classes,
- own private content,
- same-school School Bank content,
- System Bank content.

### Student

Student may access only:

- class resolved from current enrollment,
- assignments for that class,
- assets explicitly referenced by those assignments,
- own attempts/results.

Student must not receive:

- teacher-only answer keys before allowed reveal,
- unrelated school datasets,
- other students' attempts,
- Bank Data browsing permissions.

### System content

System content is globally reusable but must not expose private student/school data.

---

## 17. PostgreSQL vs PostGIS boundaries

### PostgreSQL relational

Use for:

- schools,
- teachers,
- students,
- credentials,
- classes,
- enrollments,
- ownership,
- questions/version metadata,
- cases,
- quizzes,
- assignments,
- attempts,
- responses,
- analytics metadata.

### JSONB

Use for polymorphic configuration:

- stimulus config,
- GIS activity config,
- response config,
- validation config,
- feedback config,
- feature properties,
- styles.

Avoid putting ownership, foreign keys, publish state, or critical filter fields only inside JSONB.

### PostGIS

Use for:

- dataset vector geometry,
- student response geometry,
- authoritative spatial query,
- buffer/intersection/distance/containment,
- geometry-overlap scoring,
- spatial indexes.

### File/Object storage

Use for:

- images,
- videos,
- original uploads,
- GeoTIFF,
- large derived files.

---

## 18. Publication and runtime safety

Before publish:

```text
Draft Question
→ validate config
→ resolve CaseVersion
→ resolve exact DatasetVersions
→ validate tools and parameters
→ validate answer/validation rule
→ publish immutable QuestionVersion
```

Before assignment:

```text
Draft Quiz
→ exact published QuestionVersions
→ publish QuizVersion
→ create Assignment
```

Student runtime never points at mutable draft content.

---

## 19. Recommended first backend slice after UI approval

Do **not** implement everything at once.

First backend vertical slice:

```text
School
→ Teacher
→ Class
→ Student
→ Enrollment
→ StudentCredential

Question
→ QuestionVersion
→ Multiple Choice A–E

QuizVersion
→ Assignment
→ Attempt
→ Response
```

Then add:

```text
Data Bank
→ DatasetVersion
→ CaseVersion
→ GIS activity
→ spatial response
→ analytics
```

This keeps the first implementation testable without sacrificing the V2 architecture.

---

## 20. Decisions proposed for approval

1. Student is a school-managed identity, not a self-registering general User.
2. Class Code + Student ID + PIN is the student login contract.
3. School is the tenancy/isolation root.
4. Reusable content uses SYSTEM / SCHOOL / PRIVATE scope.
5. Use and Duplicate/Fork are separate actions.
6. Published Dataset, Case, Question, and Quiz content is immutable and versioned.
7. Assignment always references an immutable QuizVersion.
8. Question Schema V2 is split into stimulus / activity / response / validation / feedback.
9. Spatial Thinking uses the term `region`, replacing V1 `group`.
10. Multiple choice supports A–E.
11. Student-drawn geometry is a first-class response type.
12. Meaningful GIS actions are logged as assessment telemetry.
13. PostgreSQL owns domain records; PostGIS owns authoritative geometry operations.
14. Media and large raster binaries live outside relational rows.
15. Analytics are derived from immutable assessment records and can be recomputed.

If these 15 decisions are approved, Domain Model V2 can be locked and the project may move to UI Screen Map / Wireframe.
