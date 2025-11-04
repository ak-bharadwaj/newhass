"""Voice-to-Text API routes"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Form
from typing import Optional

from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.services.voice_to_text_service import VoiceToTextService


router = APIRouter()


@router.post("/transcribe")
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    context: Optional[str] = Form("medical"),
    current_user: User = Depends(get_current_active_user)
):
    """
    Transcribe audio file to text

    Permissions: All authenticated users
    """
    # Validate file type
    allowed_types = ["audio/wav", "audio/mp3", "audio/mpeg", "audio/m4a", "audio/webm", "audio/ogg"]
    if audio_file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )

    # Validate file size (max 25MB for Whisper API)
    MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB
    audio_file.file.seek(0, 2)  # Seek to end
    file_size = audio_file.file.tell()
    audio_file.file.seek(0)  # Seek back to start

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: 25MB"
        )

    voice_service = VoiceToTextService()
    result = await voice_service.transcribe_audio(audio_file, context)

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error", "Transcription failed")
        )

    return result


@router.post("/parse-vitals")
async def parse_vitals_from_text(
    text: str = Form(...),
    current_user: User = Depends(get_current_active_user)
):
    """
    Parse vitals from transcribed text

    Permissions: nurse, doctor, manager
    """
    if current_user.role.name not in ["nurse", "doctor", "manager", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to parse vitals"
        )

    voice_service = VoiceToTextService()
    parsed_vitals = voice_service.parse_vitals_from_text(text)

    return {
        **parsed_vitals,
        "formatted_output": voice_service.format_vitals_response(parsed_vitals)
    }


@router.post("/transcribe-and-parse-vitals")
async def transcribe_and_parse_vitals(
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """
    Transcribe audio and automatically parse vitals

    Convenience endpoint combining transcription and parsing

    Permissions: nurse, doctor, manager
    """
    if current_user.role.name not in ["nurse", "doctor", "manager", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to parse vitals"
        )

    # Validate file type
    allowed_types = ["audio/wav", "audio/mp3", "audio/mpeg", "audio/m4a", "audio/webm", "audio/ogg"]
    if audio_file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )

    voice_service = VoiceToTextService()

    # Step 1: Transcribe
    transcription_result = await voice_service.transcribe_audio(audio_file, context="vitals")

    if not transcription_result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=transcription_result.get("error", "Transcription failed")
        )

    transcribed_text = transcription_result["text"]

    # Step 2: Parse vitals
    parsed_vitals = voice_service.parse_vitals_from_text(transcribed_text)

    return {
        "transcription": transcribed_text,
        **parsed_vitals,
        "formatted_output": voice_service.format_vitals_response(parsed_vitals)
    }
