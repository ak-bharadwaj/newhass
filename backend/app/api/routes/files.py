"""
File upload endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.services.file_storage_service import FileStorageService
from app.models.user import User
from app.models.region import Region

router = APIRouter()


@router.post("/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload profile picture for current user
    Any authenticated user can upload their profile picture
    """
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Validate file size (5MB max)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must be less than 5MB"
        )
    
    try:
        # Upload to storage
        storage_service = FileStorageService()
        
        # Create file-like object
        from io import BytesIO
        file_obj = BytesIO(content)
        
        file_url = storage_service.upload_profile_picture(
            str(current_user.id),
            file_obj,
            file.filename
        )
        
        # Update user record
        user = db.query(User).filter(User.id == current_user.id).first()
        if user:
            # Delete old profile picture if exists
            if user.profile_picture_url:
                storage_service.delete_file(user.profile_picture_url)
            
            user.profile_picture_url = file_url
            db.commit()
        
        return {
            "success": True,
            "profile_picture_url": file_url
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )


@router.post("/region-branding/{region_id}")
async def upload_region_branding(
    region_id: str,
    file: UploadFile = File(...),
    file_type: str = Form(...),  # logo or banner
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload regional branding (logo or banner)
    Only regional_admin of that region or super_admin can upload
    """
    from uuid import UUID
    
    # Verify user is regional admin of this region or super admin
    if current_user.role.name != "super_admin":
        if current_user.role.name != "regional_admin" or str(current_user.region_id) != region_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only regional admin can update regional branding"
            )
    
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Validate file type parameter
    if file_type not in ['logo', 'banner']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="file_type must be 'logo' or 'banner'"
        )
    
    # Validate file size (10MB max for branding)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must be less than 10MB"
        )
    
    try:
        # Upload to storage
        storage_service = FileStorageService()
        from io import BytesIO
        file_obj = BytesIO(content)
        
        file_url = storage_service.upload_region_branding(
            region_id,
            file_obj,
            file.filename,
            file_type
        )
        
        # Update region record
        region = db.query(Region).filter(Region.id == UUID(region_id)).first()
        if not region:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Region not found"
            )
        
        # Update theme settings
        if not region.theme_settings:
            region.theme_settings = {}
        
        # Delete old file if exists
        old_url_key = f"{file_type}_url"
        if old_url_key in region.theme_settings and region.theme_settings[old_url_key]:
            storage_service.delete_file(region.theme_settings[old_url_key])
        
        region.theme_settings[old_url_key] = file_url
        db.commit()
        
        return {
            "success": True,
            f"{file_type}_url": file_url
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )


@router.post("/lab-report/{test_id}")
async def upload_lab_report(
    test_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload lab report PDF
    Only lab_tech can upload
    """
    from uuid import UUID
    from app.models.lab_test import LabTest
    
    # Verify user is lab tech
    if current_user.role.name != "lab_tech":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only lab technicians can upload lab reports"
        )
    
    # Validate file type
    if file.content_type != 'application/pdf':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a PDF"
        )
    
    # Validate file size (20MB max)
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must be less than 20MB"
        )
    
    try:
        # Verify test exists
        test = db.query(LabTest).filter(LabTest.id == UUID(test_id)).first()
        if not test:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lab test not found"
            )
        
        # Upload to storage
        storage_service = FileStorageService()
        from io import BytesIO
        file_obj = BytesIO(content)
        
        file_url = storage_service.upload_lab_report(
            test_id,
            file_obj,
            file.filename
        )
        
        # Update lab test record
        test.result_file_url = file_url
        test.status = "completed"
        from datetime import datetime
        test.completed_at = datetime.utcnow()
        test.assigned_to_id = current_user.id
        
        db.commit()
        
        return {
            "success": True,
            "file_url": file_url
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )
