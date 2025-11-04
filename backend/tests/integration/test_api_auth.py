"""
Integration tests for authentication API
"""
import pytest
from fastapi import status


def test_health_check(client):
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "healthy"


def test_login_invalid_credentials(client):
    """Test login with invalid credentials"""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "invalid@example.com", "password": "wrongpassword"}
    )
    # Should fail (no user exists yet)
    assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_404_NOT_FOUND]


def test_protected_route_without_auth(client):
    """Test accessing protected route without authentication"""
    response = client.get("/api/v1/patients")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
