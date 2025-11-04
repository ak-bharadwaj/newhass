#!/usr/bin/env python3
"""
Generate VAPID keys for Web Push Notifications (P-256)

Run this script to generate new VAPID keys:
    docker exec -it hass_backend python scripts/generate_vapid_keys.py

Then add the keys to your .env file:
    VAPID_PUBLIC_KEY=...
    VAPID_PRIVATE_KEY=...
    VAPID_EMAIL=noreply@yourhospital.com
"""

import base64
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def generate_vapid_keys():
    # Generate EC P-256 key pair
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()

    # Private key as 32-byte big-endian integer (raw scalar)
    priv_int = private_key.private_numbers().private_value
    priv_bytes = priv_int.to_bytes(32, byteorder="big")

    # Public key as uncompressed point per X9.62 (65 bytes 0x04 | X | Y)
    pub_bytes = public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)

    vapid_public = b64url(pub_bytes)
    vapid_private = b64url(priv_bytes)

    print("=" * 80)
    print("VAPID Keys Generated Successfully!")
    print("=" * 80)
    print()
    print("Add these to your backend/.env file:")
    print()
    print(f"VAPID_PUBLIC_KEY={vapid_public}")
    print(f"VAPID_PRIVATE_KEY={vapid_private}")
    print(f"VAPID_EMAIL=noreply@yourhospital.com")
    print()
    print("=" * 80)
    print("IMPORTANT: Keep the private key SECRET!")
    print("=" * 80)
    print()

    with open('vapid_keys.txt', 'w') as f:
        f.write(f"VAPID_PUBLIC_KEY={vapid_public}\n")
        f.write(f"VAPID_PRIVATE_KEY={vapid_private}\n")
        f.write("VAPID_EMAIL=noreply@yourhospital.com\n")

    print("✓ Keys also saved to: vapid_keys.txt (do not commit this file)")


if __name__ == "__main__":
    generate_vapid_keys()
