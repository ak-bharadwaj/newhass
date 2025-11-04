"""
File storage service for MinIO/S3 (MinIO is S3-compatible)

Dev mode: returns constructed URLs without performing real uploads.
Prod mode (USE_MINIO=true): uses boto3 S3 client pointed to MinIO endpoint
to perform actual put/delete operations and ensures the bucket exists.
"""
import os
import json
import logging
from uuid import uuid4
from typing import BinaryIO
from datetime import datetime

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class FileStorageService:
    """Service for handling file uploads to MinIO/S3"""

    def __init__(self):
        self.endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
        # Public endpoint used in URLs returned to the browser (can be host:port)
        self.public_endpoint = os.getenv("MINIO_PUBLIC_ENDPOINT", self.endpoint)
        self.access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        self.secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
        self.secure = os.getenv("MINIO_SECURE", "false").lower() == "true"
        self.bucket_name = os.getenv("MINIO_BUCKET", "hospital-files")
        
        # In production, use S3 client against MinIO (S3-compatible)
        self.use_minio = os.getenv("USE_MINIO", "false").lower() == "true"

        # Prepare S3 client if using MinIO
        self._s3 = None
        if self.use_minio:
            self._s3 = boto3.client(
                "s3",
                endpoint_url=(f"https://{self.endpoint}" if self.secure else f"http://{self.endpoint}"),
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=os.getenv("MINIO_REGION", "us-east-1"),
                config=Config(
                    s3={"addressing_style": "path"},  # MinIO prefers path-style by default
                    retries={"max_attempts": 3, "mode": "standard"},
                    signature_version="s3v4",
                ),
            )
            # Ensure bucket exists
            self._ensure_bucket()

    def _base_url(self) -> str:
        # If public endpoint already contains scheme, return as-is
        if self.public_endpoint.startswith("http://") or self.public_endpoint.startswith("https://"):
            return self.public_endpoint
        # Otherwise, build from secure flag
        return f"https://{self.public_endpoint}" if self.secure else f"http://{self.public_endpoint}"

    def _ensure_bucket(self):
        try:
            self._s3.head_bucket(Bucket=self.bucket_name)
        except ClientError:
            # Create bucket if not exists
            try:
                self._s3.create_bucket(Bucket=self.bucket_name)
                logger.info(f"Created bucket: {self.bucket_name}")
            except Exception as e:
                logger.error(f"Failed to create bucket {self.bucket_name}: {e}")
                raise
        # Ensure public read policy for object access (so images can be viewed without auth)
        try:
            public_read_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "AllowPublicRead",
                        "Effect": "Allow",
                        "Principal": "*",
                        "Action": [
                            "s3:GetObject"
                        ],
                        "Resource": [
                            f"arn:aws:s3:::{self.bucket_name}/*"
                        ]
                    }
                ]
            }
            self._s3.put_bucket_policy(
                Bucket=self.bucket_name,
                Policy=json.dumps(public_read_policy)
            )
            logger.info(f"Applied public-read policy to bucket: {self.bucket_name}")
        except Exception as e:
            # Don't fail startup if policy cannot be applied (may already be set or insufficient perms)
            logger.warning(f"Could not apply public-read policy to bucket {self.bucket_name}: {e}")

    def upload_profile_picture(
        self,
        user_id: str,
        file_content: BinaryIO,
        filename: str
    ) -> str:
        """
        Upload profile picture and return URL
        
        Args:
            user_id: User UUID
            file_content: File binary content
            filename: Original filename
            
        Returns:
            URL to uploaded file
        """
        try:
            # Extract file extension
            ext = filename.rsplit('.', 1)[-1] if '.' in filename else 'jpg'
            
            # Generate unique filename
            unique_filename = f"{user_id}_{uuid4().hex[:8]}.{ext}"
            object_name = f"profile-pictures/{unique_filename}"
            
            if self.use_minio and self._s3 is not None:
                # Upload using S3 client
                file_content.seek(0)
                self._s3.upload_fileobj(
                    Fileobj=file_content,
                    Bucket=self.bucket_name,
                    Key=object_name,
                    ExtraArgs={"ContentType": f"image/{ext}"}
                )

            # Return URL
            return f"{self._base_url()}/{self.bucket_name}/{object_name}"
            
        except Exception as e:
            logger.error(f"Failed to upload profile picture: {str(e)}")
            raise

    def upload_region_branding(
        self,
        region_id: str,
        file_content: BinaryIO,
        filename: str,
        file_type: str  # 'logo' or 'banner'
    ) -> str:
        """
        Upload regional branding image
        
        Args:
            region_id: Region UUID
            file_content: File binary content
            filename: Original filename
            file_type: Type of branding image
            
        Returns:
            URL to uploaded file
        """
        try:
            ext = filename.rsplit('.', 1)[-1] if '.' in filename else 'png'
            unique_filename = f"{region_id}_{file_type}_{uuid4().hex[:8]}.{ext}"
            object_name = f"region-branding/{unique_filename}"
            
            if self.use_minio and self._s3 is not None:
                file_content.seek(0)
                self._s3.upload_fileobj(
                    Fileobj=file_content,
                    Bucket=self.bucket_name,
                    Key=object_name,
                    ExtraArgs={"ContentType": f"image/{ext}"}
                )

            return f"{self._base_url()}/{self.bucket_name}/{object_name}"
            
        except Exception as e:
            logger.error(f"Failed to upload branding image: {str(e)}")
            raise

    def upload_lab_report(
        self,
        test_id: str,
        file_content: BinaryIO,
        filename: str
    ) -> str:
        """
        Upload lab report PDF
        
        Args:
            test_id: Lab test UUID
            file_content: File binary content
            filename: Original filename
            
        Returns:
            URL to uploaded file
        """
        try:
            ext = filename.rsplit('.', 1)[-1] if '.' in filename else 'pdf'
            unique_filename = f"{test_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{ext}"
            object_name = f"lab-reports/{unique_filename}"
            
            if self.use_minio and self._s3 is not None:
                file_content.seek(0)
                self._s3.upload_fileobj(
                    Fileobj=file_content,
                    Bucket=self.bucket_name,
                    Key=object_name,
                    ExtraArgs={"ContentType": "application/pdf" if ext == "pdf" else f"application/{ext}"}
                )

            return f"{self._base_url()}/{self.bucket_name}/{object_name}"
            
        except Exception as e:
            logger.error(f"Failed to upload lab report: {str(e)}")
            raise

    def delete_file(self, file_url: str) -> bool:
        """
        Delete file from storage
        
        Args:
            file_url: Full URL to file
            
        Returns:
            Success status
        """
        try:
            if self.use_minio and self._s3 is not None:
                # file_url ends with /bucket/key; extract key after bucket name
                try:
                    prefix = f"{self._base_url()}/{self.bucket_name}/"
                    if not file_url.startswith(prefix):
                        logger.warning(f"Unexpected URL format for deletion: {file_url}")
                        return False
                    key = file_url[len(prefix):]
                    self._s3.delete_object(Bucket=self.bucket_name, Key=key)
                    logger.info(f"Deleted file from bucket {self.bucket_name}: {key}")
                    return True
                except Exception as e:
                    logger.error(f"Failed to delete object: {e}")
                    return False

            # Dev mode: no-op
            logger.info(f"Dev mode: would delete file: {file_url}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete file: {str(e)}")
            return False

    def upload_file(
        self,
        file_path: str,
        file_content: BinaryIO,
        content_type: str = "application/octet-stream"
    ) -> str:
        """
        Generic file upload method
        
        Args:
            file_path: Target path in storage (e.g., "region/hospital/patients/123/file.pdf")
            file_content: File binary content
            content_type: MIME type of the file
            
        Returns:
            URL to uploaded file
        """
        try:
            if self.use_minio and self._s3 is not None:
                file_content.seek(0)
                # Ensure folder-like prefixes are okay; S3 treats keys as flat paths
                self._s3.upload_fileobj(
                    Fileobj=file_content,
                    Bucket=self.bucket_name,
                    Key=file_path,
                    ExtraArgs={"ContentType": content_type}
                )

            url = f"{self._base_url()}/{self.bucket_name}/{file_path}"
            logger.info(f"Uploaded file to: {url}")
            return url
            
        except Exception as e:
            logger.error(f"Failed to upload file {file_path}: {str(e)}")
            raise
