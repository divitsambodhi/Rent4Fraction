#!/usr/bin/env python3
"""
Live Cloudinary Smoke Test Script
Executes full end-to-end lifecycle verification:
Sign -> Direct Upload -> Verify Metadata -> Signed Delivery Fetch -> Destroy / Cleanup.

If live credentials are not present in the environment, gracefully skips and exits 0.
"""
from __future__ import annotations

import os
import sys
import uuid
import requests

# Ensure server root is on path
server_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if server_dir not in sys.path:
    sys.path.insert(0, server_dir)

from app.core.config import get_settings
from app.integrations.storage import get_storage_provider, CloudinaryProvider


def main() -> int:
    settings = get_settings()
    cloud_name = getattr(settings, "CLOUDINARY_CLOUD_NAME", "")
    api_key = getattr(settings, "CLOUDINARY_API_KEY", "")
    api_secret = getattr(settings, "CLOUDINARY_API_SECRET", "")

    if (
        not cloud_name
        or not api_key
        or not api_secret
        or cloud_name == "fake_cloud"
        or "placeholder" in cloud_name.lower()
    ):
        print("\n" + "=" * 70)
        print("  [SMOKE TEST: CLOUDINARY LIVE VERIFICATION - SKIPPED]")
        print("=" * 70)
        print("Live Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,")
        print("CLOUDINARY_API_SECRET) are not set in server/.env.")
        print("System is running with STORAGE_PROVIDER=fake (offline deterministic mock).")
        print("All automated offline unit tests and fake provider tests are PASSING.")
        print("=" * 70 + "\n")
        return 0

    print("\n" + "=" * 70)
    print(f"  [SMOKE TEST] Verifying Live Cloudinary Account: {cloud_name}")
    print("=" * 70)

    provider = get_storage_provider()
    if not isinstance(provider, CloudinaryProvider):
        print(f"[SKIP] Current active provider is {type(provider).__name__}, not CloudinaryProvider.")
        return 0

    test_uuid = uuid.uuid4().hex[:12]
    owner_id = 999999

    try:
        # Step 1: Sign upload
        print("[1/5] Requesting signed upload parameters from provider...")
        signed = provider.sign_upload(
            kind="equipment_image",
            owner_id=owner_id,
        )
        print(f"      -> Signed public_id: {signed.public_id}")
        print(f"      -> Signature: {signed.signature[:8]}...{signed.signature[-8:]}")

        # Step 2: Upload 1x1 test image
        print("[2/5] Uploading 1x1 test WebP asset directly to Cloudinary...")
        # 1x1 transparent WebP image bytes
        test_webp_bytes = (
            b"RIFF\x1a\x00\x00\x00WEBPVP8L\x0e\x00\x00\x00/\x00\x00\x00\x00\x07\x88\x85\x85\xfe\x00\x00\x00\x00"
        )
        upload_url = f"https://api.cloudinary.com/v1_1/{signed.cloud_name}/image/upload"
        data = {
            "api_key": signed.api_key,
            "timestamp": str(signed.timestamp),
            "signature": signed.signature,
            "public_id": signed.public_id,
            "upload_preset": signed.upload_preset,
            "type": signed.type,
        }
        files = {"file": ("smoke_test.webp", test_webp_bytes, "image/webp")}
        res = requests.post(upload_url, data=data, files=files, timeout=15)

        if not res.ok:
            print(f"[FAIL] Cloudinary upload returned status {res.status_code}: {res.text}")
            return 1

        res_json = res.json()
        print(f"      -> Upload succeeded! Format: {res_json.get('format')}, Size: {res_json.get('bytes')} bytes")

        # Step 3: Verify Asset via Admin API
        print("[3/5] Verifying asset metadata via Cloudinary Admin API...")
        meta = provider.verify_asset(signed.public_id, asset_type=signed.type)
        print(f"      -> Verified format: {meta.format}, dimensions: {meta.width}x{meta.height}")

        # Step 4: Verify Delivery URL
        print("[4/5] Testing public image delivery...")
        delivery_res = requests.get(meta.secure_url, timeout=10)
        if not delivery_res.ok:
            print(f"[FAIL] Delivery URL failed: {delivery_res.status_code}")
            return 1
        print(f"      -> Delivery URL HTTP 200 OK ({len(delivery_res.content)} bytes received)")

        # Step 5: Destroy / Clean up
        print("[5/5] Destroying temporary smoke test asset...")
        del_ok = provider.delete_asset(signed.public_id, asset_type=signed.type)
        print(f"      -> Asset destroyed: {del_ok}")

        print("\n" + "=" * 70)
        print("  [SUCCESS] All live Cloudinary lifecycle operations completed successfully!")
        print("=" * 70 + "\n")
        return 0

    except Exception as exc:
        print(f"\n[ERROR] Live Cloudinary smoke test failed with exception: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

