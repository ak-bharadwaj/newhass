"""Secure messaging endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from uuid import UUID

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.models.patient import Patient
from app.models.message_thread import MessageThread
from app.models.message import Message
from app.core.sse import sse_manager
from app.services.notification_service import NotificationService

router = APIRouter()


class ThreadCreate(BaseModel):
    patient_id: UUID
    staff_user_id: UUID
    subject: Optional[str] = None


class ThreadOut(BaseModel):
    id: UUID
    patient_id: UUID
    staff_user_id: UUID
    subject: Optional[str] = None
    is_closed: bool

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class MessageOut(BaseModel):
    id: UUID
    thread_id: UUID
    sender_user_id: Optional[UUID]
    content: str
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.post("/threads", response_model=ThreadOut)
async def create_or_get_thread(
    payload: ThreadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Only participant can create (either staff or patient themselves)
    if current_user.id not in [payload.staff_user_id]:
        # If patient user, ensure they are the patient's user
        patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
        if not patient or patient.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to create thread")

    thread = (
        db.query(MessageThread)
        .filter(
            MessageThread.patient_id == payload.patient_id,
            MessageThread.staff_user_id == payload.staff_user_id,
            MessageThread.is_closed == False,
        )
        .first()
    )
    if not thread:
        thread = MessageThread(
            patient_id=payload.patient_id,
            staff_user_id=payload.staff_user_id,
            created_by_user_id=current_user.id,
            subject=payload.subject,
        )
        db.add(thread)
        db.commit()
        db.refresh(thread)
    return thread


@router.get("/threads", response_model=List[ThreadOut])
async def list_threads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # If the current user is a patient, list their threads; else if staff, list their threads
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if patient:
        threads = db.query(MessageThread).filter(MessageThread.patient_id == patient.id).order_by(MessageThread.updated_at.desc()).all()
    else:
        threads = db.query(MessageThread).filter(MessageThread.staff_user_id == current_user.id).order_by(MessageThread.updated_at.desc()).all()
    return threads


@router.get("/threads/{thread_id}/messages", response_model=List[MessageOut])
async def list_messages(
    thread_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    thread = db.query(MessageThread).filter(MessageThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    # Authorization: user must be staff in thread or patient user
    patient_user_id = db.query(Patient.user_id).filter(Patient.id == thread.patient_id).scalar()
    if current_user.id not in [thread.staff_user_id, patient_user_id]:
        raise HTTPException(status_code=403, detail="Not authorized")
    msgs = db.query(Message).filter(Message.thread_id == thread_id).order_by(Message.created_at.asc()).all()
    return msgs


@router.post("/threads/{thread_id}/messages", response_model=MessageOut)
async def send_message(
    thread_id: UUID,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    thread = db.query(MessageThread).filter(MessageThread.id == thread_id, MessageThread.is_closed == False).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found or closed")

    patient_user_id = db.query(Patient.user_id).filter(Patient.id == thread.patient_id).scalar()
    if current_user.id not in [thread.staff_user_id, patient_user_id]:
        raise HTTPException(status_code=403, detail="Not authorized")

    msg = Message(thread_id=thread.id, sender_user_id=current_user.id, content=payload.content)
    db.add(msg)
    # bump thread updated_at
    thread.updated_at = func.now()
    db.commit()
    db.refresh(msg)

    # Broadcast SSE to the other participant on their personal channel
    other_user_id = thread.staff_user_id if current_user.id == patient_user_id else patient_user_id
    if other_user_id:
        await sse_manager.broadcast(f"user:{other_user_id}", {
            "type": "secure_message",
            "thread_id": str(thread.id),
            "message_id": str(msg.id),
            "preview": payload.content[:120],
        })
        # Also send multi-channel notification (email/push) via service
        NotificationService(db).notify_secure_message(other_user_id, thread.id, payload.content[:120])

    return msg
