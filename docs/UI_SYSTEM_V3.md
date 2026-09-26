# GeoLearn UI System V3 — Professional Responsive Product UI

Status: **STAGING UI BASELINE**  
Target: Responsive Web + Mobile Web  
Environment: `staging` only until validated

## 1. Visual language

Reference direction adopted from the supplied screenshots:

- clean white/light-gray learning interface,
- strong cobalt-blue primary action,
- dark navy typography,
- green success/data-ready state,
- rounded cards with thin borders,
- wide content area with generous whitespace,
- top navigation for teacher desktop,
- catalog-style data cards,
- GIS Studio with left layer panel + large map canvas,
- simple student-facing screens,
- professional density without looking like a generic admin template.

GeoLearn visual identity:

- Primary: #2563EB
- Primary dark: #1D4ED8
- Navy: #0F172A
- Text: #1E293B
- Muted: #64748B
- Border: #E2E8F0
- Surface: #FFFFFF
- Page background: #F8FAFC
- Success: #10B981
- Warning: #F59E0B
- Danger: #EF4444
- Spatial teal: #14B8A6

Typography:
- product font stack: Inter / system sans-serif
- heading weight 700–800
- body 400–500
- UI label 600–700

Radius:
- page hero / major container: 24px
- card: 18px
- input/button: 12px
- badge: 999px

Spacing:
- 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64

## 2. Responsive system

### Desktop — >= 1280 px
- max content width: 1320–1440px
- persistent teacher top navigation
- 12-column grid
- 3–4 card catalog columns
- GIS Studio: 320–360px layer panel + flexible map
- student WebGIS: 390–430px question panel + map

### Tablet — 768–1279 px
- top navigation collapses non-primary items into “Lainnya”
- grids reduce to 2 columns
- Question Builder step rail narrows
- GIS Studio layer panel becomes 280px or collapsible drawer
- assessment can switch to stacked question + map when width is limited

### Mobile — < 768 px
- compact header: logo + page title + profile/menu
- teacher main navigation becomes bottom navigation:
  - Home
  - Kelas
  - Soal
  - Data
  - More
- cards become single-column
- filter bars become horizontal chips + “Filter” sheet
- tables become cards/rows
- Question Builder stepper becomes horizontal scroll / step header
- GIS Studio becomes full-screen map:
  - bottom sheet = layers
  - floating action button = Add Layer
  - floating tool dock = Draw / Analyze / Inspect
- student question becomes:
  1. prompt
  2. stimulus
  3. required activity
  4. response
  5. sticky submit button

Minimum touch target: 44×44px.

## 3. Product page map

PUBLIC / AUTH
1. Landing + Student Login
2. Teacher Login

TEACHER
3. Dashboard
4. Classes
5. Class Detail & Student Manager
6. Question Bank
7. Data Bank
8. Media Bank
9. GIS Studio
10. Question Builder
11. Results & Spatial Analytics

STUDENT
12. Student Home
13. Assessment Runtime
14. Student Result

## 4. Page 01 — Landing + Student Login

Desktop:
- top public nav
- left: product statement + key benefits
- right: student login card
- teacher/admin login button in top-right
- no account registration for student

Student login fields:
- Class Code
- Student ID
- PIN
- primary CTA: Masuk ke Ruang Belajar

Mobile:
- product headline first
- login card immediately after headline
- secondary marketing sections below login
- teacher login remains small secondary action

## 5. Page 02 — Teacher Login

Purpose: separate adult authentication from student classroom access.

Layout:
- centered 420–460px auth card
- email
- password
- school context if required
- login
- forgot password

Do not mix teacher and student credential models in one form.

## 6. Page 03 — Teacher Dashboard

Desktop sections:
- header: greeting + semester + quick actions
- metric cards:
  - Active Classes
  - Students
  - Active Assignments
  - Question Bank
  - Data Bank
- Active Assignments panel
- Recent Activity
- quick action panel:
  - Create Assignment
  - New Question
  - Upload Dataset
  - Open GIS Studio

Mobile:
- metric cards become 2-column compact grid
- active assignment cards stack
- quick actions become horizontal icon cards

## 7. Page 04 — Classes

Header:
- title
- academic year/semester filter
- + Create Class

Class card:
- class name
- grade
- student count
- active assignments
- Class Code
- teacher
- Open Class

Desktop: 3-column cards.
Tablet: 2-column.
Mobile: 1-column.

## 8. Page 05 — Class Detail & Student Manager

Class header:
- XI-A Geography
- academic year
- Class Code
- Copy Code
- Add Student
- Create Assignment

Tabs:
- Assignments
- Students
- Results

Students tab:
- search
- manual add
- import Excel/CSV
- export credentials
- each student:
  - name
  - Student ID
  - credential status
  - last activity
  - Reset PIN
  - Disable

Mobile:
- no wide table
- each student becomes a compact card
- row actions open bottom-sheet menu

## 9. Page 06 — Question Bank

Header:
- search
- New Question
- optional Case selector

Scope tabs:
- System Bank
- School Bank
- My Bank

Filters:
- grade
- topic
- Spatial Thinking mode
- stimulus type
- response type
- difficulty
- status

Question row/card:
- thumbnail / stimulus icon
- title
- topic
- Spatial mode
- stimulus
- response
- version
- scope
- status
- Preview
- Use
- Duplicate & Edit

Desktop:
- list-row preferred for information density.

Mobile:
- card presentation
- only most important metadata visible
- more metadata in expand/collapse.

## 10. Page 07 — Data Bank

Reference pattern: supplied Katalog Data screenshot.

Header hero:
- Katalog Data Spasial GeoLearn
- Upload Data
- Open GIS Studio

Scope:
- All Accessible
- System Data
- School Data
- My Data

Type:
- All
- Vector
- Raster
- Table

Data card:
- format
- scope
- status
- title
- description
- geometry/data type
- feature count
- EPSG/SRID
- Preview
- Use
- Open in Studio
- Duplicate/Fork where allowed

Desktop: 3 columns.
Tablet: 2 columns.
Mobile: 1 column.

## 11. Page 08 — Media Bank

Separate from spatial data.

Types:
- Image
- Video
- Document
- Chart/Illustration

Card:
- real thumbnail
- title
- type
- dimensions / duration / size
- scope
- usage count
- Preview
- Use in Case
- Use in Question

Video card should visually show duration and play state.

## 12. Page 09 — GIS Studio

Reference pattern: supplied GIS Studio screenshot.

### Desktop layout

Top project bar:
- back to projects
- project name
- saved state
- Save Project
- Student Preview
- Bind to Case / Question

Main:
- left 330px Project Layers
- right full map canvas

Left panel:
- Layers tab
- Tools & Map tab
- + Add Layer
- visible layer cards
- per-layer:
  - visibility
  - symbol
  - name
  - geometry
  - object count
  - zoom-to
  - style
  - attributes
  - remove
- dynamic legend
- CRS display

Map:
- basemap
- zoom
- locate
- scale
- coordinates
- current zoom
- active layer count

Tool groups:
- Navigate
- Inspect
- Draw
- Analyze
- Compare

Analysis:
- Buffer
- Overlay
- Distance
- Filter
- future Network

### Mobile GIS Studio

Do not render desktop sidebar.

Use:
- full-screen map
- top compact project bar
- bottom sheet “Layers”
- FAB + Add Layer
- floating tool rail
- bottom coordinate/status strip
- full-screen modal for attributes/style
- drawing mode locks map gestures appropriately

## 13. Page 10 — Question Builder

8-step wizard:

1. Information
2. Stimulus
3. Data & GIS
4. Activity
5. Response
6. Validation
7. Feedback
8. Student Preview

Desktop:
- left 230px vertical step rail
- right editor
- bottom previous/next
- save draft status in top-right

Mobile:
- top progress indicator
- one step per screen
- sticky previous/next buttons

Rules:
- Data & GIS step is hidden/disabled when stimulus does not require GIS.
- A teacher creating an image/video question should not need to understand spatial dataset metadata.
- Student Preview must use the actual assessment renderer.

## 14. Page 11 — Results & Spatial Analytics

Teacher overview:
- assignment completion
- class average
- accuracy
- median time
- question difficulty
- Spatial Thinking profile by class

Mode cards/charts:
- Location
- Condition
- Influence
- Region
- Hierarchy
- Analogy
- Pattern
- Association

Drill-down:
- student
- question
- GIS activity completion
- skill score

Mobile:
- summary first
- charts full-width
- student drill-down as cards rather than table.

## 15. Page 12 — Student Home

Header:
- class
- student name
- simple nav: Home / Tasks / My Results

Main:
- greeting
- tasks due
- completed tasks
- progress snapshot

No Data Bank, GIS Studio authoring, or teacher terminology.

## 16. Page 13 — Assessment Runtime

Renderer is config-driven.

Supported stimulus UI:
- text
- image
- video
- static map
- WebGIS
- dual map
- map + table
- map + chart
- composite

Desktop WebGIS:
- left question panel 390–430px
- right GIS stimulus
- allowed tool bar
- required activity state
- A–E / other response
- submit

Mobile WebGIS:
- prompt card
- map full-width 55–65vh
- tool action bar
- required activity status
- answer
- sticky submit

Image/video:
- media is primary
- response below media
- no unnecessary GIS controls.

## 17. Page 14 — Student Result

Student sees only teacher-approved information:
- score
- completion
- feedback
- correct/incorrect if enabled
- Spatial Thinking profile if enabled

Do not expose:
- teacher notes
- other students
- answer keys before policy permits.

## 18. Shared component system

Future Next.js components:

- AppShell
- PublicHeader
- TeacherHeader
- MobileBottomNav
- PageHeader
- HeroPanel
- MetricCard
- FilterBar
- ScopeTabs
- StatusBadge
- QuestionListItem
- DatasetCard
- MediaCard
- ClassCard
- StudentRow
- ProjectLayerCard
- MapCanvas
- MapToolDock
- MobileLayerSheet
- BuilderStepper
- StudentQuestionPanel
- StimulusRenderer
- ResponseRenderer
- SpatialActivityStatus

## 19. Interaction standards

Loading:
- skeleton cards
- map loading overlay
- upload progress

Empty state:
- explain what the area is for
- one primary CTA

Error:
- human-readable
- never show stack trace to end user

Destructive action:
- confirmation for delete/archive
- prefer archive for content with assessment history

Save:
- drafts autosave where safe
- always expose save state: Saved / Saving / Failed

## 20. Staging acceptance

Before backend implementation starts, UI staging must demonstrate:

- responsive Landing/Login
- responsive Teacher Dashboard
- class/student management
- Question Bank
- Data Bank
- Media Bank
- desktop + mobile GIS Studio behavior
- Question Builder flow
- student image/video question
- student WebGIS question
- result/analytics concept

Production receives only reviewed staging releases.
