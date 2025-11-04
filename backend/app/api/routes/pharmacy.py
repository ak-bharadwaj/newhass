"""Pharmacy inventory management API routes"""
from uuid import UUID
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import date, datetime, timedelta

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.user import User
from app.models.inventory import Inventory

router = APIRouter()


# ========== Request/Response Models ==========
class InventoryItemCreate(BaseModel):
    """Request model for adding pharmacy inventory (uses Inventory model with item_type='medication')"""
    hospital_id: UUID
    medication_name: str = Field(..., min_length=1)
    quantity: int = Field(..., ge=0)
    unit: str  # "tablets", "capsules", "bottles", "vials", "boxes", "ml", "grams"
    expiry_date: date
    notes: Optional[str] = None


class InventoryItemUpdate(BaseModel):
    """Update model for inventory items"""
    medication_name: Optional[str] = None
    quantity: Optional[int] = Field(None, ge=0)
    unit: Optional[str] = None
    expiry_date: Optional[date] = None
    notes: Optional[str] = None


class InventoryItemResponse(BaseModel):
    """Response model for inventory items"""
    id: UUID
    hospital_id: UUID
    medication_name: str
    quantity: int
    unit: str
    expiry_date: Optional[date] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


def _to_response(item: Inventory) -> InventoryItemResponse:
    return InventoryItemResponse(
        id=item.id,
        hospital_id=item.hospital_id,
        medication_name=item.item_name,
        quantity=item.quantity,
        unit=item.unit,
        expiry_date=item.expiry_date,
        notes=item.supplier or item.location,  # reuse fields for notes context
    )


# ========== Pharmacy Endpoints ==========
@router.post("/inventory", response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED)
def add_inventory_item(
    item_data: InventoryItemCreate,
    current_user: User = Depends(require_role("pharmacist")),
    db: Session = Depends(get_db),
):
    """
    Add new medication to pharmacy inventory.

    Backed by generic Inventory table with item_type='medication'.
    Permission: Pharmacist only
    """

    # Validate hospital access
    if current_user.hospital_id and str(current_user.hospital_id) != str(item_data.hospital_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only add inventory to your assigned hospital"
        )

    inv = Inventory(
        hospital_id=item_data.hospital_id,
        item_type="medication",
        item_name=item_data.medication_name,
        item_code=f"MED-{item_data.medication_name[:3].upper()}",
        category="Pharmacy",
        quantity=item_data.quantity,
        unit=item_data.unit,
        expiry_date=item_data.expiry_date,
        is_active=True,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    return _to_response(inv)


@router.get("/inventory", response_model=List[InventoryItemResponse])
def get_inventory(
    hospital_id: Optional[UUID] = None,
    current_user: User = Depends(require_role("pharmacist", "manager", "doctor")),
    db: Session = Depends(get_db),
):
    """
    Get pharmacy inventory for a hospital.

    Returns list of medications with quantities and expiry dates.
    Permission: Pharmacist, Manager, Doctor
    """
    query_hospital_id = hospital_id or current_user.hospital_id

    if not query_hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hospital ID is required"
        )

    items = (
        db.query(Inventory)
        .filter(
            Inventory.hospital_id == query_hospital_id,
            Inventory.item_type == "medication",
            Inventory.is_active == True,
        )
        .order_by(Inventory.item_name.asc())
        .all()
    )
    return [_to_response(i) for i in items]


@router.get("/inventory/low-stock", response_model=List[InventoryItemResponse])
def get_low_stock_items(
    hospital_id: Optional[UUID] = None,
    threshold: int = 10,
    current_user: User = Depends(require_role("pharmacist", "manager")),
    db: Session = Depends(get_db),
):
    """
    Get medications with low stock levels.

    Returns items below the specified quantity threshold.
    Permission: Pharmacist, Manager
    """
    query_hospital_id = hospital_id or current_user.hospital_id

    if not query_hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hospital ID is required"
        )

    items = (
        db.query(Inventory)
        .filter(
            Inventory.hospital_id == query_hospital_id,
            Inventory.item_type == "medication",
            Inventory.is_active == True,
            Inventory.quantity < threshold,
        )
        .order_by(Inventory.quantity.asc())
        .all()
    )
    return [_to_response(i) for i in items]


@router.get("/inventory/expiring-soon", response_model=List[InventoryItemResponse])
def get_expiring_medications(
    hospital_id: Optional[UUID] = None,
    days: int = 30,
    current_user: User = Depends(require_role("pharmacist", "manager")),
    db: Session = Depends(get_db),
):
    """
    Get medications expiring within specified days.
    Permission: Pharmacist, Manager
    """
    query_hospital_id = hospital_id or current_user.hospital_id

    if not query_hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hospital ID is required"
        )

    cutoff = datetime.utcnow().date() + timedelta(days=days)

    items = (
        db.query(Inventory)
        .filter(
            Inventory.hospital_id == query_hospital_id,
            Inventory.item_type == "medication",
            Inventory.is_active == True,
            Inventory.expiry_date.isnot(None),
            Inventory.expiry_date <= cutoff,
        )
        .order_by(Inventory.expiry_date.asc())
        .all()
    )
    return [_to_response(i) for i in items]


@router.patch("/inventory/{item_id}", response_model=InventoryItemResponse)
def update_inventory_item(
    item_id: UUID,
    update: InventoryItemUpdate,
    current_user: User = Depends(require_role("pharmacist")),
    db: Session = Depends(get_db),
):
    """Update an existing medication inventory item (pharmacist only)."""
    item = db.query(Inventory).filter(
        Inventory.id == item_id,
        Inventory.item_type == "medication",
        Inventory.is_active == True,
    ).first()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    # Hospital scope check
    if current_user.hospital_id and str(current_user.hospital_id) != str(item.hospital_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-hospital update not allowed")

    if update.medication_name is not None:
        item.item_name = update.medication_name
    if update.quantity is not None:
        item.quantity = update.quantity
    if update.unit is not None:
        item.unit = update.unit
    if update.expiry_date is not None:
        item.expiry_date = update.expiry_date
    if update.notes is not None:
        item.supplier = update.notes  # reuse supplier to store notes context

    db.commit()
    db.refresh(item)
    return _to_response(item)


@router.delete("/inventory/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory_item(
    item_id: UUID,
    current_user: User = Depends(require_role("pharmacist")),
    db: Session = Depends(get_db),
):
    """Soft-delete an inventory item (is_active=False)."""
    item = db.query(Inventory).filter(
        Inventory.id == item_id,
        Inventory.item_type == "medication",
        Inventory.is_active == True,
    ).first()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    # Hospital scope check
    if current_user.hospital_id and str(current_user.hospital_id) != str(item.hospital_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-hospital delete not allowed")

    item.is_active = False
    db.commit()
    return None
