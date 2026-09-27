from os import replace
from pathlib import Path
from typing import Literal

import rasterio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from rasterio.warp import transform_bounds
from rio_cogeo.cogeo import cog_translate, cog_validate
from rio_cogeo.profiles import cog_profiles
from titiler.core.factory import TilerFactory

DATA_ROOT = Path("/data").resolve()


class IngestRequest(BaseModel):
    sourceKey: str
    targetKey: str


def resolve_storage_key(key: str, directory: Literal["incoming", "cog"]) -> Path:
    if "\\" in key or Path(key).is_absolute() or len(Path(key).parts) != 2:
        raise ValueError("Kunci penyimpanan raster tidak aman.")
    folder, name = Path(key).parts
    if folder != directory or not name.endswith(".tif") or any(part in ("", ".", "..") for part in Path(key).parts):
        raise ValueError("Kunci penyimpanan raster tidak aman.")
    path = (DATA_ROOT / key).resolve()
    if DATA_ROOT not in path.parents:
        raise ValueError("Kunci penyimpanan raster tidak aman.")
    return path


def raster_metadata(path: Path) -> dict:
    with rasterio.open(path) as dataset:
        if dataset.crs is None:
            raise ValueError("Raster tidak memiliki CRS.")
        if dataset.transform.is_identity:
            raise ValueError("Raster tidak memiliki georeferensi.")
        bounds = dataset.bounds
        wgs84 = transform_bounds(dataset.crs, "EPSG:4326", *bounds, densify_pts=21)
        epsg = dataset.crs.to_epsg()
        bands = [1] if dataset.count == 1 else list(range(1, min(dataset.count, 3) + 1))
        return {
            "sourceCrs": dataset.crs.to_string(), "sourceSrid": epsg,
            "bboxSource": list(bounds), "bboxWgs84": list(wgs84),
            "width": dataset.width, "height": dataset.height, "bandCount": dataset.count,
            "dtypes": list(dataset.dtypes), "nodata": dataset.nodata,
            "resolution": [abs(dataset.res[0]), abs(dataset.res[1])], "driver": dataset.driver,
            "rendering": {"bands": bands, "mode": "grayscale" if dataset.count == 1 else "rgb"},
        }


app = FastAPI(title="GeoLearn internal raster service", docs_url=None, redoc_url=None)
app.include_router(TilerFactory().router, prefix="/cog")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/internal/ingest")
def ingest(request: IngestRequest) -> dict:
    target: Path | None = None
    temporary_target: Path | None = None
    target_published = False
    try:
        source = resolve_storage_key(request.sourceKey, "incoming")
        target = resolve_storage_key(request.targetKey, "cog")
        if not source.is_file():
            raise ValueError("File raster tidak dapat dibaca.")
        if target.exists():
            raise ValueError("Tujuan raster sudah ada.")
        metadata = raster_metadata(source)
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary_target = target.with_name(f".{target.name}.tmp")
        temporary_target.unlink(missing_ok=True)
        profile = cog_profiles.get("deflate").copy()
        profile.update({"BIGTIFF": "IF_SAFER"})
        cog_translate(str(source), str(temporary_target), profile, in_memory=False, quiet=True)
        valid, _errors, _warnings = cog_validate(str(temporary_target), strict=True)
        if not valid:
            raise ValueError("GeoTIFF gagal dikonversi menjadi COG.")
        replace(temporary_target, target)
        target_published = True
        source.unlink()
        metadata.update({"driver": "GTiff", "isCog": True})
        return metadata
    except ValueError as error:
        if temporary_target is not None:
            temporary_target.unlink(missing_ok=True)
        if target_published and target is not None:
            target.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=str(error)) from error
    except rasterio.errors.RasterioError as error:
        if temporary_target is not None:
            temporary_target.unlink(missing_ok=True)
        if target_published and target is not None:
            target.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail="File raster tidak dapat dibaca.") from error
    except Exception as error:
        if temporary_target is not None:
            temporary_target.unlink(missing_ok=True)
        if target_published and target is not None:
            target.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="GeoTIFF gagal dikonversi menjadi COG.") from error
