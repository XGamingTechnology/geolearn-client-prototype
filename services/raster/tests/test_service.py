from pathlib import Path

import pytest

from app.main import resolve_storage_key


def test_safe_keys():
    assert resolve_storage_key("incoming/123e4567-e89b-12d3-a456-426614174000.tif", "incoming") == Path("/data/incoming/123e4567-e89b-12d3-a456-426614174000.tif")


@pytest.mark.parametrize("key", ["../secret.tif", "/etc/passwd", "incoming/../secret.tif", "incoming/file.jpg", "https://example.com/a.tif"])
def test_unsafe_keys(key):
    with pytest.raises(ValueError):
        resolve_storage_key(key, "incoming")
