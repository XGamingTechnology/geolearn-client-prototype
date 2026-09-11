# UI system v3 — responsive foundation

GeoLearn uses Indonesian copy, high-contrast green tokens, visible focus-capable native controls, semantic landmarks, and layouts that reflow rather than horizontally scroll.

- **Public/student:** public landing, `/student` entry boundary, and question-driven `/learn/demo` experience.
- **Teacher:** persistent left navigation on desktop and a four-destination bottom navigation on tablet/mobile. Slice 1 destinations other than the dashboard are reserved route boundaries and do not imply CRUD functionality.
- **Status:** staging/demo labels distinguish non-production and simulated data. Empty states never fabricate learner metrics.
- **Responsive breakpoints:** the teacher shell changes at 800px; dense public layouts stack; touch navigation stays fixed and labelled.

The learning workspace remains driven by typed question configuration and the GIS registries. New questions must not create bespoke map pages.
