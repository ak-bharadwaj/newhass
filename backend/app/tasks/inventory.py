"""
Celery periodic tasks for inventory monitoring:
- Low stock alerts
- Expiring medications alerts
"""
from celery import shared_task
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.inventory import Inventory
from app.models.hospital import Hospital
from app.services.notification_service import NotificationService
import logging

logger = logging.getLogger(__name__)


def _group_by_hospital(items):
    by_hospital = {}
    for item in items:
        by_hospital.setdefault(item.hospital_id, []).append(item)
    return by_hospital


@shared_task(name="inventory_check_low_stock")
def inventory_check_low_stock(threshold: int = 10):
    """
    Scan inventory for items below threshold and notify pharmacist/manager.
    """
    db: Session = SessionLocal()
    try:
        low_items = (
            db.query(Inventory)
            .filter(
                Inventory.item_type == "medication",
                Inventory.is_active == True,
                Inventory.quantity < threshold,
            )
            .all()
        )

        if not low_items:
            logger.debug("No low stock items found")
            return {"hospitals": 0, "items": 0}

        by_hospital = _group_by_hospital(low_items)
        notif_service = NotificationService(db)

        notified = 0
        for hospital_id, items in by_hospital.items():
            hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
            if not hospital:
                continue
            payload = [
                {"item_name": i.item_name, "quantity": i.quantity, "unit": i.unit}
                for i in items
            ]
            notif_service.notify_inventory_low_stock(hospital_id, hospital.name, payload)
            notified += 1

        logger.info(f"Inventory low stock notifications sent for {notified} hospitals")
        return {"hospitals": notified, "items": len(low_items)}

    except Exception as e:
        logger.error(f"Error in inventory_check_low_stock: {e}")
        db.rollback()
        raise
    finally:
        db.close()


@shared_task(name="inventory_check_expiring")
def inventory_check_expiring(days: int = 30):
    """
    Scan inventory for medications expiring within N days and notify pharmacist/manager.
    """
    db: Session = SessionLocal()
    try:
        cutoff = datetime.utcnow().date() + timedelta(days=days)
        expiring = (
            db.query(Inventory)
            .filter(
                Inventory.item_type == "medication",
                Inventory.is_active == True,
                Inventory.expiry_date.isnot(None),
                Inventory.expiry_date <= cutoff,
            )
            .all()
        )

        if not expiring:
            logger.debug("No expiring medications found")
            return {"hospitals": 0, "items": 0}

        by_hospital = _group_by_hospital(expiring)
        notif_service = NotificationService(db)

        notified = 0
        for hospital_id, items in by_hospital.items():
            hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
            if not hospital:
                continue
            payload = [
                {"item_name": i.item_name, "expiry_date": i.expiry_date.isoformat() if i.expiry_date else None}
                for i in items
            ]
            notif_service.notify_inventory_expiring(hospital_id, hospital.name, payload)
            notified += 1

        logger.info(f"Inventory expiring notifications sent for {notified} hospitals")
        return {"hospitals": notified, "items": len(expiring)}

    except Exception as e:
        logger.error(f"Error in inventory_check_expiring: {e}")
        db.rollback()
        raise
    finally:
        db.close()
