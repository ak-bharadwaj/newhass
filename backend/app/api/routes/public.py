"""Public API routes for unauthenticated access (e.g., registration helpers)"""
from typing import List, Dict, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.hospital import Hospital
from app.models.region import Region

router = APIRouter()


@router.get("/hospitals", response_model=List[Dict[str, str]])
def list_public_hospitals(db: Session = Depends(get_db)) -> List[Dict[str, str]]:
    """
    Public endpoint to list active hospitals for patient self-registration.

    Returns minimal info: id, name, code. No authentication required.
    """
    hospitals = (
        db.query(Hospital)
        .filter(Hospital.is_active == True)  # noqa: E712
        .order_by(Hospital.name.asc())
        .all()
    )
    return [
        {
            "id": str(h.id),
            "name": h.name,
            "code": h.code,
        }
        for h in hospitals
    ]


@router.get("/branding", response_model=Dict[str, Optional[str]])
def get_public_branding(db: Session = Depends(get_db)) -> Dict[str, Optional[str]]:
    """
    Public endpoint to retrieve basic branding (logo and colors) for unauthenticated pages.

    Tries Region.theme_settings first, then falls back to defaults.
    """
    # Try to get first active region's theme settings
    region = db.query(Region).filter(Region.is_active == True).order_by(Region.created_at.asc()).first()  # noqa: E712
    theme = {}
    if region and isinstance(region.theme_settings, dict):
        theme = region.theme_settings or {}

    # Fallbacks
    app_name = "Hospital Automation System"
    tagline = "Secure, reliable healthcare operations"
    primary = theme.get("primary_color") or "#4f46e5"  # indigo-600
    secondary = theme.get("secondary_color") or "#ec4899"  # pink-500
    logo_url = theme.get("logo_url") or None

    return {
        "app_name": app_name,
        "tagline": tagline,
        "primary_color": primary,
        "secondary_color": secondary,
        "logo_url": logo_url,
    }
