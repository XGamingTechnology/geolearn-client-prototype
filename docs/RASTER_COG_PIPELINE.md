# GeoTIFF / COG pipeline (H1)

## Architecture and storage

The Next.js `web` service streams teacher uploads into `incoming/` on a private raster volume and sends only generated relative keys to the internal FastAPI `raster` service. Rasterio validates the raster and derives its WGS84 extent without pixel reprojection. rio-cogeo converts it using DEFLATE, `BIGTIFF=IF_SAFER`, and internal overviews, then validates the COG under `cog/`.

Both containers use UID/GID 1001 and share a dedicated, environment-specific volume. Database records contain only `cog/<uuid>.tif`, never host paths. The raster container has no public port. Metadata includes CRS/SRID, WGS84 bbox, dimensions, bands, dtypes, nodata, resolution, default display bands, and acquisition fields. Database creation follows successful conversion, preventing failed conversions from producing READY versions.

## Tile delivery and compatibility

A shared runtime resolver preserves existing `REMOTE_XYZ` URLs. For `LOCAL_COG`, it returns a 12-hour same-origin template signed with server-only HMAC-SHA256. The proxy verifies expiration/signature with a timing-safe comparison, reloads the READY/PUBLISHED COG record, validates its key, and requests a WebMercatorQuad PNG internally from TiTiler. No volume path, internal hostname, or signing secret enters a browser payload.

Local COG therefore looks like a standard Leaflet tile layer. Existing SOURCE/TARGET Map Slider clipping supports vector/COG, COG/vector, COG/COG, XYZ/COG, and COG/XYZ unchanged. Attribute tables and analytical tools remain vector-only.

## Manual staging acceptance

1. [ ] Upload a normal GeoTIFF.
2. [ ] Confirm no manual bbox input is required.
3. [ ] Confirm the DatasetVersion becomes READY.
4. [ ] Confirm detail shows CRS, bbox, dimensions, and bands.
5. [ ] Confirm preview displays the raster.
6. [ ] Confirm Network shows `/api/raster/...`, never `/var/lib` or `raster:8000`.
7. [ ] Confirm an existing remote XYZ still renders.
8. [ ] Add COG as SOURCE.
9. [ ] Add vector as TARGET.
10. [ ] Confirm Map Slider works.
11. [ ] Swap SOURCE/TARGET roles.
12. [ ] Add two COG datasets as SOURCE/TARGET.
13. [ ] Confirm the raster/raster slider works.
14. [ ] Confirm a basemap switch does not reset the slider.
15. [ ] Confirm Attribute Table remains vector-only.
16. [ ] Confirm teacher preview works.
17. [ ] Confirm student runtime works.
18. [ ] Confirm teacher preview creates no Attempt/GIS Activity.
19. [ ] Restart containers and confirm the named-volume raster remains available.
20. [ ] Upload an invalid TIFF and confirm an Indonesian error and no READY dataset.
