# GeoLearn UI/UX V2

Status: **STAGING DESIGN BASELINE**  
Depends on: Product Flow V2 (#5), Domain Model V2 (#6)  
Tracking: UI/UX V2 (#7)

## 1. Design direction

The supplied UI references establish a useful interaction pattern:

- public/student landing is spacious and simple,
- student access is visible without account registration,
- teacher workspace uses a clean top navigation,
- Data Bank is a catalog, not a file-manager tree,
- GIS Studio uses a **left layer panel + large map canvas**,
- actions use strong blue primary buttons with light neutral surfaces,
- cards use rounded corners, subtle borders, and restrained shadow,
- dense GIS controls are isolated inside GIS Studio rather than appearing everywhere.

GeoLearn adopts those principles while retaining its own information architecture and Spatial Thinking identity.

## 2. Product navigation

### Teacher navigation

```text
Dashboard
Kelas
Bank Soal
Bank Data
Media
GIS Studio
Hasil
```

Question Builder is contextual and opened from Bank Soal / Case / Assignment rather than permanently occupying the main navigation.

### Student navigation

```text
Beranda
Tugas
Hasil Saya
```

The student interface intentionally omits Data Bank, GIS Studio authoring, Question Builder, dataset metadata, and teacher-only analytics.

## 3. Screen map

```text
PUBLIC
├── Landing
├── Student Login
└── Teacher Login

TEACHER
├── Dashboard
├── Classes
│   ├── Class Detail
│   ├── Student Manager
│   ├── Assignment List
│   └── Results
├── Question Bank
│   ├── Preview
│   ├── Duplicate & Edit
│   └── Question Builder
├── Case Library
├── Data Bank
│   ├── Dataset Detail
│   ├── Upload
│   └── Open in GIS Studio
├── Media Bank
│   ├── Image
│   ├── Video
│   ├── Document
│   └── Illustration / Chart
├── GIS Studio
│   ├── Project Layers
│   ├── Add Layer
│   ├── Digitize
│   ├── Analysis
│   └── Student Preview
└── Results / Spatial Analytics

STUDENT
├── Login
├── Home
├── Assignment
│   ├── Image Question
│   ├── Video Question
│   ├── WebGIS Question
│   ├── Dual Map Question
│   └── Composite Question
└── Result / Spatial Thinking Profile
```

## 4. Student access

Student login stays simple:

```text
Class Code
Student ID
PIN
[Masuk]
```

No self-registration, no required email, and no social login.

The landing page may include a teacher/admin login link separately.

## 5. Teacher dashboard

Primary information:

- active classes,
- active assignments,
- students,
- question count,
- dataset count,
- recent activity,
- shortcuts: Create Assignment, Create Question, Upload Dataset, Open GIS Studio.

Avoid showing infrastructure/debug data on the normal teacher dashboard.

## 6. Class screen

Class header:

- class name,
- grade / semester,
- class code,
- copy/share credential action,
- Add Students,
- Create Assignment.

Tabs:

- Assignments
- Students
- Results

Student Manager supports:

- manual add,
- CSV/Excel import,
- generate/reset PIN,
- disable credential,
- export credential sheet.

## 7. Question Bank

Layout:

```text
[Search________________] [Grade] [Spatial Mode] [Stimulus] [Response] [+ New Question]

Tabs:
System Bank | School Bank | My Bank

Question card/list:
- title
- spatial mode
- topic
- stimulus type
- response type
- difficulty
- owner/scope
- version
- draft/published
- Preview
- Use
- Duplicate & Edit
```

System questions are visibly read-only and show **Duplicate & Edit** rather than Edit.

## 8. Data Bank

Inspired by the supplied catalog UI.

Header actions:

- Upload Data
- Open GIS Studio

Tabs:

- All Accessible
- System Data
- School Data
- My Data

Filters:

- Vector / Raster / Table
- format
- scope
- status
- search

Dataset card:

- format badge,
- scope badge,
- owner badge,
- processing status,
- title,
- short description,
- feature count,
- SRID/EPSG,
- Preview,
- Use,
- Open in GIS Studio,
- Duplicate/Fork.

## 9. Media Bank

Media is distinct from spatial data.

Tabs:

- All
- Images
- Videos
- Documents
- Charts / Illustrations

Card:

- thumbnail,
- media type,
- title,
- duration/dimensions/file size,
- scope,
- owner,
- usage count,
- Preview,
- Use in Case,
- Use in Question,
- Archive.

A teacher making a non-GIS image/video question should never be forced through GIS Studio.

## 10. GIS Studio

Core layout:

```text
┌──────────────────────┬──────────────────────────────────────┐
│ PROJECT LAYERS       │                                      │
│                      │            MAP CANVAS                │
│ ☑ Sungai Siak        │                                      │
│ ☑ Sekolah            │                                      │
│ ☑ Jalan              │                                      │
│ □ Buffer Result      │                                      │
│                      │                                      │
│ + Add Layer          │                                      │
│ + Digitize           │                                      │
│ + Analysis           │                                      │
├──────────────────────┤                                      │
│ Layer properties     │                                      │
│ style / opacity      │                                      │
└──────────────────────┴──────────────────────────────────────┘
```

Project actions:

- Save
- Student Preview
- Bind to Case
- Bind to Question

Add Layer sources:

- Data Bank
- Upload
- Digitize
- Generated result

Layer row actions:

- show/hide,
- zoom to,
- style,
- attribute preview,
- remove from project.

GIS tool groups:

- Navigate
- Explore
- Draw
- Analyze
- Compare

Do not mix map navigation tools with analytical runners internally.

## 11. Question Builder

Wizard:

```text
1 Information
2 Stimulus
3 Data & GIS
4 Activity
5 Response
6 Validation
7 Feedback
8 Student Preview
```

### Step 1 — Information

- title
- topic
- grade
- Spatial Thinking mode
- Bloom level
- difficulty

### Step 2 — Stimulus

Options:

- Text
- Image
- Video
- Static Map
- WebGIS
- Dual Map
- Map + Table
- Map + Chart
- Composite

### Step 3 — Data & GIS

Only shown when needed.

- select Case,
- select from Data Bank,
- upload dataset,
- open GIS Studio,
- choose visible layers,
- configure initial extent.

### Step 4 — Activity

Teacher selects allowed and required actions.

Example:

```text
Allowed:
☑ Pan
☑ Zoom
☑ Popup
☑ Buffer

Required:
☑ Buffer
   distance = 500 m
   source = Sungai Siak
```

### Step 5 — Response

- Multiple Choice A–E
- Multi Select
- Map Feature Select
- Draw Point
- Draw Line
- Draw Polygon
- Ranking
- Numeric
- Short Text
- Composite

### Step 6 — Validation

- static answer
- spatial query
- feature rule
- geometry overlap
- distance
- numeric tolerance
- manual review

### Step 7 — Feedback

- correct explanation
- incorrect explanation
- distractor feedback
- reveal result
- retry policy

### Step 8 — Student Preview

Preview must use exactly the same renderer as real assessment runtime.

## 12. Assessment runtime layouts

The UI adapts to the stimulus.

### Image / Video

```text
Question text
Media viewer
Answer A–E
Submit
```

### WebGIS

Desktop:

```text
Question panel | GIS workspace
Activity state
Answer / Submit
```

Mobile/tablet:

```text
Question
Map
Required activity
Answer
```

### Dual Map

Two synchronized maps or swipe/compare view, depending on question configuration.

### Composite

Map plus table/chart/media blocks driven by configuration.

## 13. Result UX

Student:

- total score,
- correct/incorrect,
- teacher-configured feedback,
- optional Spatial Thinking profile.

Teacher:

- score distribution,
- submission status,
- mode-level performance,
- question analysis,
- GIS activity completion,
- student drill-down.

## 14. Design tokens

### Color roles

- Primary: GeoLearn blue
- Secondary: teal/green for spatial/data success states
- Ink: near-black/navy
- Muted: cool gray
- Surface: white
- Canvas background: very light blue-gray
- Warning: amber
- Error: red
- Success: green

### Shape

- card radius: 16–20 px,
- control radius: 10–12 px,
- pill radius: full,
- subtle 1 px borders,
- low-elevation shadow only for floating/primary panels.

### Density

- Teacher catalog: medium density.
- GIS Studio: high density.
- Student assessment: low-to-medium density.

## 15. Staging → production rule

All UI/UX implementation happens on **staging**.

Promotion to production requires:

1. student login flow works,
2. teacher class/student flow works,
3. image question works,
4. video question works,
5. WebGIS question works,
6. Question Builder can express bank-soal requirements,
7. Data Bank → GIS Studio reuse works,
8. no blocker in student assessment runtime.

Production is not a design sandbox.
