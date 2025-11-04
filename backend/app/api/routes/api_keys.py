"""Admin API for API key management"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from uuid import UUID
import secrets
import hashlib

from app.core.database import get_db
from app.core.dependencies import require_role, get_current_active_user
from app.models.api_key import ApiKey
from app.models.user import User

router = APIRouter()


class ApiKeyCreate(BaseModel):
    name: str = Field(..., max_length=200)
    scopes: Optional[List[str]] = None
    hospital_id: Optional[UUID] = None


class ApiKeyOut(BaseModel):
    id: UUID
    name: str
    prefix: str
    scopes: Optional[List[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ApiKeyWithSecret(BaseModel):
    key: str
    key_id: UUID
    prefix: str


@router.post("/", response_model=ApiKeyWithSecret, status_code=201, dependencies=[Depends(require_role("super_admin", "regional_admin", "hospital_admin"))])
def create_api_key(
    payload: ApiKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    prefix = secrets.token_hex(4)  # 8 hex chars
    secret = secrets.token_urlsafe(32)
    full_key = f"{prefix}.{secret}"
    hashed = hashlib.sha256(full_key.encode()).hexdigest()

    api_key = ApiKey(
        name=payload.name,
        prefix=prefix,
        hashed_key=hashed,
        scopes=payload.scopes or [],
        created_by_user_id=current_user.id,
        hospital_id=payload.hospital_id or current_user.hospital_id,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    return ApiKeyWithSecret(key=full_key, key_id=api_key.id, prefix=api_key.prefix)


@router.get("/", response_model=List[ApiKeyOut], dependencies=[Depends(require_role("super_admin", "regional_admin", "hospital_admin"))])
def list_api_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(ApiKey)
    # Hospital admins limited to their hospital
    if current_user.role.name == "hospital_admin":
        q = q.filter(ApiKey.hospital_id == current_user.hospital_id)
    keys = q.order_by(ApiKey.created_at.desc()).all()
    return keys


@router.delete("/{key_id}", status_code=204, dependencies=[Depends(require_role("super_admin", "regional_admin", "hospital_admin"))])
def revoke_api_key(key_id: UUID, db: Session = Depends(get_db)):
    api_key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    from sqlalchemy import func
    api_key.revoked_at = func.now()
    db.commit()
    return


@router.post("/{key_id}/rotate", response_model=ApiKeyWithSecret, dependencies=[Depends(require_role("super_admin", "regional_admin", "hospital_admin"))])
def rotate_api_key(key_id: UUID, db: Session = Depends(get_db)):
    api_key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    prefix = secrets.token_hex(4)
    secret = secrets.token_urlsafe(32)
    full_key = f"{prefix}.{secret}"
    hashed = hashlib.sha256(full_key.encode()).hexdigest()

    api_key.prefix = prefix
    api_key.hashed_key = hashed
    api_key.revoked_at = None
    db.commit()
    db.refresh(api_key)

    return ApiKeyWithSecret(key=full_key, key_id=api_key.id, prefix=api_key.prefix)
