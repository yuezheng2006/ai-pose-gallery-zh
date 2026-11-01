#!/usr/bin/env python3
"""Copy live gallery images onto R2. Resumable. Does not print credentials."""
from __future__ import annotations

import hashlib
import json
import mimetypes
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import time
import tomllib
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
ACCOUNT = "f6a6ca266227aeaae53449f89cded47f"
BUCKET = "ai-pose-assets"
SOURCE = os.environ.get("AI_POSE_SOURCE", "https://ai-pose.cyber101.cc").rstrip("/")
LOCAL_ROOTS = [
    ROOT,
    Path(os.environ.get("ASSET_LOCAL", "/tmp/upstream-ai-pose")),
]
CACHE = "public, max-age=31536000, immutable"
UA = "ai-pose-r2-migrate/1.0"
JSON_FILES = ("pose-zh.json", "costume-zh.json", "portrait-zh.json")


def token() -> str:
    if os.environ.get("CLOUDFLARE_API_TOKEN"):
        return os.environ["CLOUDFLARE_API_TOKEN"]
    for file in (
        Path.home() / "Library/Preferences/.wrangler/config/default.toml",
        Path.home() / ".config/.wrangler/config/default.toml",
    ):
        if file.exists():
            value = tomllib.loads(file.read_text()).get("oauth_token")
            if value:
                return value
    raise SystemExit("Run wrangler login first or set CLOUDFLARE_API_TOKEN")


def keys() -> list[str]:
    found = []
    for name in JSON_FILES:
        path = ROOT / "data" / name
        if not path.exists():
            continue
        data = json.loads(path.read_text())
        for item in data:
            for field in ("缩略图", "预览图", "原图"):
                value = item.get(field)
                if value:
                    found.append(value.lstrip("/"))
    found.append("og-cover.jpg")
    unique = sorted(set(found), key=lambda key: (0 if key.startswith("thumbs/") else 1, key))
    return unique


def listed(credential: str) -> dict[str, dict]:
    inventory = {}
    cursor = None
    while True:
        query = "per_page=1000"
        if cursor:
            query += "&cursor=" + urllib.parse.quote(cursor)
        url = (
            f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/r2/buckets/"
            f"{BUCKET}/objects?{query}"
        )
        request = urllib.request.Request(url, headers={"Authorization": "Bearer " + credential, "User-Agent": UA})
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = json.load(response)
        result = payload.get("result") or []
        if isinstance(result, dict):
            objects = result.get("objects") or result.get("items") or []
            cursor = (result.get("result_info") or {}).get("cursor") or result.get("cursor")
        else:
            objects = result
            info = payload.get("result_info") or {}
            cursor = info.get("cursor")
        for item in objects:
            key = item.get("key") or item.get("name")
            if key:
                inventory[key] = item
        if not cursor or not objects:
            break
    return inventory


def fetch_source(key: str) -> bytes:
    for root in LOCAL_ROOTS:
        local = root / key
        if local.is_file() and local.stat().st_size > 1024:
            return local.read_bytes()
    last_error = None
    for base in (
        SOURCE,
        "https://cdn.jsdelivr.net/gh/anhao/ai-pose-gallery-zh@main",
        "https://raw.githubusercontent.com/anhao/ai-pose-gallery-zh/main",
    ):
        url = base.rstrip("/") + "/" + key
        request = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                body = response.read()
            if len(body) > 1024:
                return body
            last_error = f"too small from {base}"
        except Exception as error:  # noqa: BLE001
            last_error = str(error)
            continue
    raise RuntimeError(f"{key}: missing local file and remote fetch failed ({last_error})")


def put_object(key: str, body: bytes, credential: str) -> None:
    content_type = mimetypes.guess_type(key)[0] or "application/octet-stream"
    endpoint = (
        f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/r2/buckets/"
        f"{BUCKET}/objects/{urllib.parse.quote(key, safe='/')}"
    )
    headers = {
        "Authorization": "Bearer " + credential,
        "User-Agent": UA,
        "Content-Type": content_type,
        "Cache-Control": CACHE,
    }
    last_error = None
    for attempt in range(8):
        try:
            request = urllib.request.Request(endpoint, data=body, method="PUT", headers=headers)
            with urllib.request.urlopen(request, timeout=90) as response:
                response.read()
            return
        except urllib.error.HTTPError as error:
            last_error = f"HTTP {error.code}"
            if error.code not in (429, 500, 502, 503, 504) or attempt == 7:
                raise RuntimeError(f"{key}: {last_error}") from None
            time.sleep(min(30, 2 ** attempt) + (3 if error.code == 429 else 0))
            continue
        except Exception as error:
            last_error = str(error)
            if attempt == 7:
                raise RuntimeError(f"{key}: {last_error}") from None
            time.sleep(min(30, 2 ** attempt))
            continue
    raise RuntimeError(f"{key}: {last_error}")


def transfer(key: str, credential: str, inventory: dict[str, dict]) -> str:
    if key in inventory:
        return "skip"
    body = fetch_source(key)
    put_object(key, body, credential)
    return "put"


def main() -> None:
    credential = token()
    planned = keys()
    inventory = listed(credential)
    pending = [key for key in planned if key not in inventory]
    print(f"planned={len(planned)} existing={len(inventory)} pending={len(pending)}", flush=True)
    done = 0
    failed = []
    workers = int(os.environ.get("R2_WORKERS", "16"))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(transfer, key, credential, inventory): key for key in pending}
        for future in as_completed(futures):
            key = futures[future]
            done += 1
            try:
                status = future.result()
                if done % 25 == 0 or status == "put" and done <= 5:
                    print(f"{done}/{len(pending)} {status} {key}", flush=True)
            except Exception as error:
                failed.append(str(error))
                print(f"{done}/{len(pending)} FAIL {error}", flush=True)
    print(f"done pending={len(pending)} failed={len(failed)}", flush=True)
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
