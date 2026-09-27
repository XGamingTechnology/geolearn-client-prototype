from pathlib import Path

import numpy
import pytest
import rasterio
from fastapi.testclient import TestClient
from rasterio.transform import from_origin

from app import main


client = TestClient(main.app)


def test_safe_keys():
    assert main.resolve_storage_key("incoming/123e4567-e89b-12d3-a456-426614174000.tif", "incoming") == Path("/data/incoming/123e4567-e89b-12d3-a456-426614174000.tif")


@pytest.mark.parametrize("key", ["../secret.tif", "/etc/passwd", "incoming/../secret.tif", "incoming/file.jpg", "incoming/file.tiff", "https://example.com/a.tif", "incoming\\file.tif"])
def test_unsafe_keys(key):
    with pytest.raises(ValueError):
        main.resolve_storage_key(key, "incoming")


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def write_test_raster(path: Path) -> None:
    path.parent.mkdir(parents=True)
    with rasterio.open(path, "w", driver="GTiff", width=32, height=32, count=1, dtype="uint8", crs="EPSG:4326", transform=from_origin(106, -6, 0.01, 0.01)) as dataset:
        dataset.write(numpy.full((32, 32), 42, dtype="uint8"), 1)


def test_float_dem_metadata_has_display_rescale(tmp_path):
    path = tmp_path / "dem.tif"
    with rasterio.open(path, "w", driver="GTiff", width=32, height=32, count=1, dtype="float32", crs="EPSG:4326", transform=from_origin(106, -6, 0.01, 0.01)) as dataset:
        dataset.write(numpy.linspace(100, 2100, 1024, dtype="float32").reshape(32, 32), 1)

    metadata = main.raster_metadata(path)

    assert metadata["rendering"]["bands"] == [1]
    assert metadata["rendering"]["mode"] == "grayscale"
    low, high = metadata["rendering"]["rescale"][0]
    assert 100 < low < high < 2100


def test_ingest_converts_valid_geotiff_and_removes_source(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DATA_ROOT", tmp_path.resolve())
    source = tmp_path / "incoming" / "123e4567-e89b-12d3-a456-426614174000.tif"
    target = tmp_path / "cog" / "123e4567-e89b-12d3-a456-426614174000.tif"
    write_test_raster(source)

    response = client.post("/internal/ingest", json={"sourceKey": "incoming/123e4567-e89b-12d3-a456-426614174000.tif", "targetKey": "cog/123e4567-e89b-12d3-a456-426614174000.tif"})

    assert response.status_code == 200
    assert response.json()["isCog"] is True
    assert response.json()["sourceCrs"] == "EPSG:4326"
    assert target.is_file()
    assert not source.exists()
    assert not [path for path in target.parent.iterdir() if path.name.endswith(".tmp")]


def test_ingest_rejects_invalid_file_without_output(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DATA_ROOT", tmp_path.resolve())
    source = tmp_path / "incoming" / "123e4567-e89b-12d3-a456-426614174000.tif"
    source.parent.mkdir(parents=True)
    source.write_text("not a raster")

    response = client.post("/internal/ingest", json={"sourceKey": "incoming/123e4567-e89b-12d3-a456-426614174000.tif", "targetKey": "cog/123e4567-e89b-12d3-a456-426614174000.tif"})

    assert response.status_code == 422
    assert response.json() == {"detail": "File raster tidak dapat dibaca."}
    assert source.exists()
    assert not (tmp_path / "cog" / "123e4567-e89b-12d3-a456-426614174000.tif").exists()


def test_titiler_reads_generated_cog(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DATA_ROOT", tmp_path.resolve())
    source = tmp_path / "incoming" / "123e4567-e89b-12d3-a456-426614174000.tif"
    target = tmp_path / "cog" / "123e4567-e89b-12d3-a456-426614174000.tif"
    write_test_raster(source)
    ingest = client.post("/internal/ingest", json={"sourceKey": "incoming/123e4567-e89b-12d3-a456-426614174000.tif", "targetKey": "cog/123e4567-e89b-12d3-a456-426614174000.tif"})
    assert ingest.status_code == 200

    info = client.get("/cog/info", params={"url": str(target)})

    assert info.status_code == 200
    assert info.json()["width"] == 32

    tile = client.get("/cog/tiles/WebMercatorQuad/0/0/0.png", params={"url": str(target)})

    assert tile.status_code == 200
    assert tile.headers["content-type"] == "image/png"
