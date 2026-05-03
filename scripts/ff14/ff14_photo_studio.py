#!/usr/bin/env python3
"""
FF14 Photo Studio

Post-processes FFXIV screenshots into polished, photographer-like variants.
This script does not automate gameplay or client input; it only edits image files.
"""

from __future__ import annotations

import argparse
import math
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageEnhance, ImageFilter, ImageOps


SUPPORTED_EXTENSIONS = {".bmp", ".jpg", ".jpeg", ".png", ".webp"}


@dataclass(frozen=True)
class GradeProfile:
    name: str
    brightness: float
    contrast: float
    color: float
    sharpness: float
    warmth: int
    shadow_tint: tuple[int, int, int]
    vignette: float
    bloom: float


PROFILES: dict[str, GradeProfile] = {
    "cinematic": GradeProfile(
        name="cinematic",
        brightness=1.02,
        contrast=1.18,
        color=1.08,
        sharpness=1.18,
        warmth=5,
        shadow_tint=(7, 10, 22),
        vignette=0.36,
        bloom=0.12,
    ),
    "portrait": GradeProfile(
        name="portrait",
        brightness=1.06,
        contrast=1.10,
        color=1.12,
        sharpness=1.12,
        warmth=9,
        shadow_tint=(9, 8, 18),
        vignette=0.28,
        bloom=0.16,
    ),
    "crisp": GradeProfile(
        name="crisp",
        brightness=1.00,
        contrast=1.22,
        color=1.02,
        sharpness=1.35,
        warmth=0,
        shadow_tint=(4, 8, 16),
        vignette=0.22,
        bloom=0.04,
    ),
    "night": GradeProfile(
        name="night",
        brightness=0.98,
        contrast=1.24,
        color=0.96,
        sharpness=1.14,
        warmth=-8,
        shadow_tint=(4, 10, 32),
        vignette=0.42,
        bloom=0.20,
    ),
    "dawn": GradeProfile(
        name="dawn",
        brightness=1.07,
        contrast=1.12,
        color=1.16,
        sharpness=1.10,
        warmth=15,
        shadow_tint=(18, 8, 14),
        vignette=0.26,
        bloom=0.18,
    ),
    "noir": GradeProfile(
        name="noir",
        brightness=1.00,
        contrast=1.34,
        color=0.08,
        sharpness=1.24,
        warmth=0,
        shadow_tint=(0, 0, 0),
        vignette=0.48,
        bloom=0.05,
    ),
}


CROP_RATIOS = {
    "original": None,
    "square": 1.0,
    "4x5": 4 / 5,
    "16x9": 16 / 9,
    "9x16": 9 / 16,
}


def default_screenshot_dirs() -> list[Path]:
    home = Path.home()
    candidates = [
        home / "Documents" / "My Games" / "FINAL FANTASY XIV - A Realm Reborn" / "screenshots",
        home
        / "OneDrive"
        / "Documents"
        / "My Games"
        / "FINAL FANTASY XIV - A Realm Reborn"
        / "screenshots",
        home
        / "OneDrive"
        / "ドキュメント"
        / "My Games"
        / "FINAL FANTASY XIV - A Realm Reborn"
        / "screenshots",
    ]
    return [path for path in candidates if path.exists()]


def find_images(path: Path) -> list[Path]:
    if path.is_file():
        return [path] if path.suffix.lower() in SUPPORTED_EXTENSIONS else []

    if not path.exists():
        return []

    return sorted(
        (
            item
            for item in path.iterdir()
            if item.is_file() and item.suffix.lower() in SUPPORTED_EXTENSIONS
        ),
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    )


def find_default_screenshot_dir() -> Path:
    candidates = default_screenshot_dirs()
    if not candidates:
        raise FileNotFoundError(
            "FF14 screenshot folder was not found. Pass --input with a folder."
        )
    return candidates[0]


def resolve_input(input_path: str | None, latest: bool) -> list[Path]:
    if input_path:
        path = Path(input_path).expanduser()
        images = find_images(path)
        if not images:
            raise FileNotFoundError(f"No supported screenshots found in: {path}")
        if latest:
            return images[:1]
        return images

    for candidate in default_screenshot_dirs():
        images = find_images(candidate)
        if images:
            return images[:1] if latest else images

    raise FileNotFoundError(
        "FF14 screenshot folder was not found. Pass --input with a file or folder."
    )


def smart_crop(image: Image.Image, ratio_name: str) -> Image.Image:
    target_ratio = CROP_RATIOS[ratio_name]
    if target_ratio is None:
        return image

    width, height = image.size
    current_ratio = width / height

    if math.isclose(current_ratio, target_ratio, rel_tol=0.01):
        return image

    if current_ratio > target_ratio:
        new_width = int(height * target_ratio)
        new_height = height
    else:
        new_width = width
        new_height = int(width / target_ratio)

    center_x = width * 0.5
    center_y = height * (0.46 if target_ratio < 1 else 0.5)

    left = int(max(0, min(width - new_width, center_x - new_width / 2)))
    top = int(max(0, min(height - new_height, center_y - new_height / 2)))

    return image.crop((left, top, left + new_width, top + new_height))


def autolevel(image: Image.Image) -> Image.Image:
    return ImageOps.autocontrast(image, cutoff=0.6)


def apply_warmth(image: Image.Image, warmth: int) -> Image.Image:
    if warmth == 0:
        return image

    red, green, blue = image.split()
    red = red.point(lambda value: max(0, min(255, value + warmth)))
    blue = blue.point(lambda value: max(0, min(255, value - warmth)))
    green = green.point(lambda value: max(0, min(255, value + warmth * 0.15)))
    return Image.merge("RGB", (red, green, blue))


def tint_shadows(image: Image.Image, tint: tuple[int, int, int]) -> Image.Image:
    if tint == (0, 0, 0):
        return image

    grayscale = ImageOps.grayscale(image)
    shadow_mask = grayscale.point(lambda value: max(0, 120 - value) * 2)
    overlay = Image.new("RGB", image.size, tint)
    return Image.composite(overlay, image, shadow_mask).blend(image, 0.88)


def add_bloom(image: Image.Image, amount: float) -> Image.Image:
    if amount <= 0:
        return image

    highlights = ImageOps.autocontrast(image).filter(ImageFilter.GaussianBlur(radius=8))
    return Image.blend(image, highlights, amount)


def add_vignette(image: Image.Image, strength: float) -> Image.Image:
    if strength <= 0:
        return image

    width, height = image.size
    mask = Image.new("L", image.size, 0)
    pixels = mask.load()
    center_x = width / 2
    center_y = height / 2
    max_distance = math.sqrt(center_x**2 + center_y**2)

    for y in range(height):
        for x in range(width):
            distance = math.sqrt((x - center_x) ** 2 + (y - center_y) ** 2)
            value = int(255 * min(1.0, (distance / max_distance) ** 1.55) * strength)
            pixels[x, y] = value

    dark = Image.new("RGB", image.size, (0, 0, 0))
    return Image.composite(dark, image, mask)


def grade_image(image: Image.Image, profile: GradeProfile) -> Image.Image:
    result = autolevel(image.convert("RGB"))
    result = ImageEnhance.Brightness(result).enhance(profile.brightness)
    result = ImageEnhance.Contrast(result).enhance(profile.contrast)
    result = ImageEnhance.Color(result).enhance(profile.color)
    result = apply_warmth(result, profile.warmth)
    result = tint_shadows(result, profile.shadow_tint)
    result = add_bloom(result, profile.bloom)
    result = ImageEnhance.Sharpness(result).enhance(profile.sharpness)
    return add_vignette(result, profile.vignette)


def build_output_path(
    source: Path,
    output_dir: Path,
    profile: str,
    crop: str,
    suffix: str,
) -> Path:
    stem = source.stem
    filename = f"{stem}_{profile}_{crop}{suffix}.jpg"
    return output_dir / filename


def output_exists_for_profiles(
    source: Path,
    output_dir: Path,
    profiles: Iterable[str],
    crop: str,
    suffix: str,
) -> bool:
    return all(
        build_output_path(source, output_dir, profile, crop, suffix).exists()
        for profile in profiles
    )


def process_image(
    source: Path,
    output_dir: Path,
    profiles: Iterable[str],
    crop: str,
    suffix: str,
    quality: int,
) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []

    with Image.open(source) as raw:
        base = smart_crop(raw.convert("RGB"), crop)
        for profile_name in profiles:
            profile = PROFILES[profile_name]
            edited = grade_image(base, profile)
            output_path = build_output_path(source, output_dir, profile_name, crop, suffix)
            edited.save(output_path, "JPEG", quality=quality, optimize=True, progressive=True)
            written.append(output_path)

    return written


def is_stable_file(path: Path, stable_seconds: float) -> bool:
    try:
        first_size = path.stat().st_size
        first_mtime = path.stat().st_mtime
        if time.time() - first_mtime < stable_seconds:
            return False
        time.sleep(0.15)
        return path.stat().st_size == first_size
    except OSError:
        return False


def watch_screenshots(
    folder: Path,
    output_dir: Path,
    profiles: list[str],
    crop: str,
    suffix: str,
    quality: int,
    interval: float,
    stable_seconds: float,
) -> None:
    print(f"Watching: {folder.resolve()}")
    print("Take screenshots manually in GPose. New files will be edited automatically.")
    processed: set[Path] = set()

    while True:
        for source in reversed(find_images(folder)):
            if source in processed:
                continue
            if output_exists_for_profiles(source, output_dir, profiles, crop, suffix):
                processed.add(source)
                continue
            if not is_stable_file(source, stable_seconds):
                continue

            print(f"New screenshot: {source.name}")
            try:
                written = process_image(
                    source=source,
                    output_dir=output_dir,
                    profiles=profiles,
                    crop=crop,
                    suffix=suffix,
                    quality=quality,
                )
                for path in written:
                    print(f"Saved: {path}")
                processed.add(source)
            except OSError as exc:
                print(f"warning: could not process {source}: {exc}")

        time.sleep(interval)


def print_gpose_card() -> None:
    print(
        """
FF14 photographer checklist

1. Camera: character eyes near the upper third, not dead center.
2. Lens feel: step back, zoom in, then crop. Faces look calmer and less distorted.
3. Light: put the main light 30-45 degrees from the face, fill light low.
4. Background: rotate until bright UI-like objects are away from the head.
5. Pose: leave a little breathing room in the direction the character is looking.
6. Depth: foreground object + character + distant light makes the shot feel expensive.
7. Export: run this script with --watch while taking screenshots manually.
""".strip()
    )


def parse_profiles(value: str) -> list[str]:
    names = [item.strip().lower() for item in value.split(",") if item.strip()]
    unknown = [name for name in names if name not in PROFILES]
    if unknown:
        valid = ", ".join(sorted(PROFILES))
        raise ValueError(f"Unknown profile(s): {', '.join(unknown)}. Valid: {valid}")
    return names or ["cinematic"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Turn FF14 screenshots into photographer-like edits.",
    )
    parser.add_argument(
        "-i",
        "--input",
        help="Screenshot file or folder. Defaults to the FF14 screenshots folder.",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="outputs/ff14-photo-studio",
        help="Output folder. Default: outputs/ff14-photo-studio",
    )
    parser.add_argument(
        "--profile",
        default="cinematic,portrait,crisp",
        help=f"Comma-separated profiles. Valid: {', '.join(sorted(PROFILES))}",
    )
    parser.add_argument(
        "--crop",
        choices=sorted(CROP_RATIOS),
        default="original",
        help="Composition crop ratio.",
    )
    parser.add_argument(
        "--latest",
        action="store_true",
        help="Only process the newest screenshot from the input folder.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Process every screenshot in the input folder.",
    )
    parser.add_argument(
        "--watch",
        action="store_true",
        help="Watch the screenshot folder and auto-edit new screenshots.",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=1.0,
        help="Watch polling interval in seconds. Default: 1.0",
    )
    parser.add_argument(
        "--stable-seconds",
        type=float,
        default=0.6,
        help="Wait until a new screenshot is stable for this many seconds.",
    )
    parser.add_argument(
        "--suffix",
        default="",
        help="Extra suffix for output filenames.",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=94,
        help="JPEG quality from 1 to 95. Default: 94",
    )
    parser.add_argument(
        "--guide",
        action="store_true",
        help="Print a GPose shooting checklist.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.guide:
        print_gpose_card()
        print()

    profiles = parse_profiles(args.profile)
    latest = args.latest or not args.all
    output_dir = Path(args.output).expanduser()
    quality = max(1, min(95, args.quality))

    if args.watch:
        folder = (
            Path(args.input).expanduser()
            if args.input
            else find_default_screenshot_dir()
        )
        if not folder.is_dir():
            raise FileNotFoundError("--watch requires --input to be a folder.")
        watch_screenshots(
            folder=folder,
            output_dir=output_dir,
            profiles=profiles,
            crop=args.crop,
            suffix=args.suffix,
            quality=quality,
            interval=max(0.2, args.interval),
            stable_seconds=max(0.0, args.stable_seconds),
        )
        return 0

    sources = resolve_input(args.input, latest=latest)

    print(f"Processing {len(sources)} screenshot(s)")
    print(f"Profiles: {', '.join(profiles)}")
    print(f"Crop: {args.crop}")
    print(f"Output: {output_dir.resolve()}")

    written: list[Path] = []
    for source in sources:
        written.extend(
            process_image(
                source=source,
                output_dir=output_dir,
                profiles=profiles,
                crop=args.crop,
                suffix=args.suffix,
                quality=quality,
            )
        )

    for path in written:
        print(f"Saved: {path}")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (FileNotFoundError, ValueError) as exc:
        print(f"error: {exc}")
        raise SystemExit(1)
