"""
Additional Case Sheet Event Tracking Endpoints

Add these to backend/app/api/routes/case_sheets.py at the end:
"""

@router.post("/{case_sheet_id}/events", response_model=CaseSheetResponse)
def add_event_to_timeline(
    case_sheet_id: UUID,
    event_data: AddEventToTimeline,
    current_user: User = Depends(require_role("doctor", "nurse", "manager")),
    db: Session = Depends(get_db),
):
    """
    Add an event to the case sheet timeline.
    
    Events can be:
    - Vitals recorded (by nurse)
    - Medications administered (by nurse)  
    - Doctor visits
    - Procedures
    - Lab tests/results
    - Imaging tests/results
    - Consultations
    - Transfers
    - Other clinical events
    
    Permission: Doctor, Nurse, Manager
    """
    case_sheet = db.query(CaseSheet).filter(CaseSheet.id == case_sheet_id).first()

    if not case_sheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case sheet not found"
        )

    # Check hospital access
    if current_user.hospital_id and current_user.role.name not in ["super_admin", "regional_admin"]:
        if case_sheet.hospital_id != current_user.hospital_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only add events to case sheets from your hospital"
            )

    # Initialize event timeline if needed
    if not case_sheet.event_timeline:
        case_sheet.event_timeline = []

    # Create event entry
    event_entry = {
        "type": event_data.event_type.value,
        "description": event_data.description,
        "timestamp": datetime.utcnow().isoformat(),
        "data": event_data.event_data or {},
        "recorded_by_user_id": str(current_user.id),
        "recorded_by_user_name": f"{current_user.first_name} {current_user.last_name}",
        "recorded_by_role": current_user.role.name,
        "requires_acknowledgment": event_data.requires_acknowledgment,
        "acknowledged": False if event_data.requires_acknowledgment else None,
        "acknowledged_by_user_id": None,
        "acknowledged_by_user_name": None,
        "acknowledged_by_role": None,
        "acknowledged_at": None,
        "acknowledgment_notes": None
    }

    case_sheet.event_timeline.append(event_entry)
    case_sheet.last_updated_by = current_user.id
    case_sheet.updated_at = datetime.utcnow()

    # Mark as modified to trigger JSONB update
    from sqlalchemy import orm
    orm.attributes.flag_modified(case_sheet, "event_timeline")

    db.commit()
    db.refresh(case_sheet)

    return case_sheet


@router.post("/{case_sheet_id}/events/acknowledge", response_model=CaseSheetResponse)
def acknowledge_event(
    case_sheet_id: UUID,
    ack_data: AcknowledgeEvent,
    current_user: User = Depends(require_role("doctor", "nurse", "manager")),
    db: Session = Depends(get_db),
):
    """
    Acknowledge an event in the case sheet timeline.
    
    Common workflow:
    1. Doctor orders medication (adds event with requires_acknowledgment=True)
    2. Nurse administers medication and acknowledges the event
    3. Event timeline shows who ordered, who administered, and when
    
    Permission: Doctor, Nurse, Manager
    """
    case_sheet = db.query(CaseSheet).filter(CaseSheet.id == case_sheet_id).first()

    if not case_sheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case sheet not found"
        )

    # Check hospital access
    if current_user.hospital_id and current_user.role.name not in ["super_admin", "regional_admin"]:
        if case_sheet.hospital_id != current_user.hospital_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only acknowledge events in case sheets from your hospital"
            )

    # Validate event index
    if not case_sheet.event_timeline or ack_data.event_index >= len(case_sheet.event_timeline):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid event index. Timeline has {len(case_sheet.event_timeline or [])} events."
        )

    event = case_sheet.event_timeline[ack_data.event_index]

    # Check if event requires acknowledgment
    if not event.get("requires_acknowledgment"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This event does not require acknowledgment"
        )

    # Check if already acknowledged
    if event.get("acknowledged"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This event has already been acknowledged"
        )

    # Update acknowledgment
    event["acknowledged"] = True
    event["acknowledged_by_user_id"] = str(current_user.id)
    event["acknowledged_by_user_name"] = f"{current_user.first_name} {current_user.last_name}"
    event["acknowledged_by_role"] = current_user.role.name
    event["acknowledged_at"] = datetime.utcnow().isoformat()
    event["acknowledgment_notes"] = ack_data.acknowledgment_notes

    case_sheet.last_updated_by = current_user.id
    case_sheet.updated_at = datetime.utcnow()

    # Mark as modified to trigger JSONB update
    from sqlalchemy import orm
    orm.attributes.flag_modified(case_sheet, "event_timeline")

    db.commit()
    db.refresh(case_sheet)

    return case_sheet


@router.get("/{case_sheet_id}/events/pending", response_model=Dict[str, Any])
def get_pending_acknowledgments(
    case_sheet_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get all events requiring acknowledgment in a case sheet.
    
    Useful for nurses to see:
    - Medications to be administered
    - Vitals to be recorded
    - Doctor orders to be executed
    
    Permission: All authenticated users with view access
    """
    # Check if user can view case sheets
    if not CaseSheet.can_view(None, current_user.role.name):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view case sheets"
        )

    case_sheet = db.query(CaseSheet).filter(CaseSheet.id == case_sheet_id).first()

    if not case_sheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case sheet not found"
        )

    # Check hospital access
    if current_user.hospital_id and current_user.role.name not in ["super_admin", "regional_admin"]:
        if case_sheet.hospital_id != current_user.hospital_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to case sheets from other hospitals"
            )

    # Get pending events
    pending_events = []
    if case_sheet.event_timeline:
        for index, event in enumerate(case_sheet.event_timeline):
            if event.get("requires_acknowledgment") and not event.get("acknowledged"):
                pending_events.append({
                    "index": index,
                    "event": event
                })

    return {
        "case_sheet_id": str(case_sheet.id),
        "patient_id": str(case_sheet.patient_id),
        "case_number": case_sheet.case_number,
        "pending_count": len(pending_events),
        "pending_events": pending_events
    }
