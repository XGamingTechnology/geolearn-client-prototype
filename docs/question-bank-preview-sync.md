# Question Bank preview synchronization

Question Bank preview metadata is resolved in the same SQL statement that selects the card's `QuestionVersion`. Dataset and media lateral joins are keyed directly by the selected `qv.id`; no second draft/published selection is performed.

The listing returns only layer metadata (role, title, kind, bbox, and counts), media delivery metadata, and `activity_config` summaries. It deliberately does not query `dataset_features`, GeoJSON, raster tiles, or media bytes. Cards therefore remain server-rendered and use a static schematic for WebGIS rather than mounting Leaflet.

The Preview link carries the selected `versionId`. The preview loader validates that the version belongs to the requested visible question and is within teacher scope. Full geometry is loaded only through that explicitly authorized preview route. Preview GIS execution uses the same exact version and remains a read-only sandbox with no Attempt, Response, GIS Activity, or grading persistence.
