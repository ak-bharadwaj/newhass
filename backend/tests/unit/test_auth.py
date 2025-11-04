"""
Unit tests for authentication
"""
import pytest
from app.core.security import hash_password, verify_password, create_access_token


def test_password_hashing():
    """Test password hashing and verification"""
    password = "TestPassword123!"
    hashed = hash_password(password)
    
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("WrongPassword", hashed)


def test_create_access_token():
    """Test JWT token creation"""
    data = {"sub": "user@example.com", "role": "doctor"}
    token = create_access_token(data)
    
    assert token is not None
    assert isinstance(token, str)
    assert len(token) > 0
