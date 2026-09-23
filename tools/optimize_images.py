"""Downscales and re-encodes generated imagery for fast page loads.

Run after tools/make_images.js:  python3 tools/optimize_images.py

Produces WebP + JPEG at display size and removes the oversized PNG masters.
"""
from __future__ import annotations

import glob
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "assets", "img")

POSTER_SIZE = (1600, 1000)


def report(path: str) -> None:
    print("  %-34s %7.1f KB" % (os.path.basename(path), os.path.getsize(path) / 1024))


def main() -> None:
    total_before = 0
    total_after = 0

    for src in sorted(glob.glob(os.path.join(IMG, "proj-*.png"))):
        total_before += os.path.getsize(src)
        base = os.path.splitext(src)[0]
        with Image.open(src) as im:
            im = im.convert("RGB")
            if im.size != POSTER_SIZE:
                im = im.resize(POSTER_SIZE, Image.LANCZOS)
            im.save(base + ".webp", "WEBP", quality=80, method=6)
            im.save(base + ".jpg", "JPEG", quality=80, optimize=True, progressive=True)
        os.remove(src)
        report(base + ".webp")
        report(base + ".jpg")
        total_after += os.path.getsize(base + ".webp")

    og = os.path.join(IMG, "og.png")
    if os.path.exists(og):
        total_before += os.path.getsize(og)
        with Image.open(og) as im:
            im = im.convert("RGB")
            im.save(os.path.join(IMG, "og.jpg"), "JPEG", quality=88, optimize=True, progressive=True)
        os.remove(og)
        report(os.path.join(IMG, "og.jpg"))
        total_after += os.path.getsize(os.path.join(IMG, "og.jpg"))

    icon = os.path.join(IMG, "apple-touch-icon.png")
    if os.path.exists(icon):
        total_before += os.path.getsize(icon)
        with Image.open(icon) as im:
            im.convert("RGB").save(icon, "PNG", optimize=True)
        report(icon)
        total_after += os.path.getsize(icon)

    print(
        "\nposter+og payload: %.1f KB -> %.1f KB (%.0f%% smaller)"
        % (total_before / 1024, total_after / 1024, 100 * (1 - total_after / total_before))
    )


if __name__ == "__main__":
    main()
