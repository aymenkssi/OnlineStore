"""
Backend API Tests for Email Verification and Password Reset Features
Tests: 
- Admin login (bypasses email verification)
- Customer registration with email verification
- Customer login blocked when email not verified
- Forgot password flow
- Reset password with valid/invalid tokens
- Password history check on reset
"""
import pytest
import requests
import os
import uuid
import time
import jwt

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
JWT_SECRET = "supersecret_jwt_key_store_v7_production_2025"  # From backend/.env


class TestAdminLogin:
    """Admin login should work since admin has email_verified=true"""
    
    def test_admin_login_success(self):
        """Test admin login works (admin bypasses email verification)"""
        payload = {
            "email": "admin@bestshop.com",
            "password": "admin123"
        }
        response = requests.post(f"{BASE_URL}/api/users/login", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data.get("email") == "admin@bestshop.com"
        assert data.get("role") in ["admin", "super_admin"]
        print(f"✓ Admin login successful, role: {data.get('role')}")
        return data.get("access_token")


class TestCustomerRegistration:
    """Customer registration should return success and send verification email"""
    
    def test_register_new_customer_success(self):
        """Test POST /api/users/register returns success with verification message"""
        unique_email = f"test_verif_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "name": "Test Verification User"
        }
        response = requests.post(f"{BASE_URL}/api/users/register", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("email") == unique_email
        assert data.get("role") == "customer"
        assert data.get("status") == "active"
        # Check for success message
        assert "message" in data
        print(f"✓ Customer registration successful: {unique_email}")
        print(f"  Message: {data.get('message')}")
        return unique_email


class TestCustomerLoginBlocked:
    """Customer login should be blocked when email not verified"""
    
    def test_unverified_customer_login_blocked(self):
        """Test customer with email_verified=false gets 403 error"""
        # First register a new customer
        unique_email = f"test_blocked_{uuid.uuid4().hex[:8]}@example.com"
        register_payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "name": "Blocked User Test"
        }
        reg_response = requests.post(f"{BASE_URL}/api/users/register", json=register_payload)
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        
        # Now try to login - should be blocked with 403
        login_payload = {
            "email": unique_email,
            "password": "TestPass123!"
        }
        login_response = requests.post(f"{BASE_URL}/api/users/login", json=login_payload)
        assert login_response.status_code == 403, f"Expected 403, got {login_response.status_code}: {login_response.text}"
        
        data = login_response.json()
        detail = data.get("detail", {})
        if isinstance(detail, dict):
            assert detail.get("code") == "email_not_verified", f"Expected email_not_verified code, got: {detail}"
        else:
            assert "email" in str(detail).lower() or "vérifier" in str(detail).lower()
        print(f"✓ Unverified customer login correctly blocked with 403")
        print(f"  Error detail: {detail}")


class TestForgotPassword:
    """Forgot password endpoint tests"""
    
    def test_forgot_password_returns_success(self):
        """Test POST /api/users/forgot-password always returns 200 (doesn't leak account existence)"""
        # Test with existing email
        payload = {"email": "admin@bestshop.com"}
        response = requests.post(f"{BASE_URL}/api/users/forgot-password", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Forgot password returns success for existing email")
        print(f"  Message: {data.get('message')}")
    
    def test_forgot_password_nonexistent_email_still_200(self):
        """Test forgot-password with non-existent email still returns 200 (security)"""
        payload = {"email": "nonexistent_user_12345@example.com"}
        response = requests.post(f"{BASE_URL}/api/users/forgot-password", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Forgot password returns 200 for non-existent email (security)")


class TestResetPasswordInvalidToken:
    """Reset password with invalid token tests"""
    
    def test_reset_password_invalid_token_returns_400(self):
        """Test POST /api/users/reset-password with invalid token returns 400"""
        payload = {
            "token": "invalid_token_12345",
            "new_password": "NewSecurePass123!"
        }
        response = requests.post(f"{BASE_URL}/api/users/reset-password", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        print(f"✓ Reset password with invalid token correctly returns 400")
        print(f"  Error: {data.get('detail')}")
    
    def test_reset_password_expired_token_returns_400(self):
        """Test reset-password with expired token returns 400"""
        # Create an expired token manually
        import time
        expired_payload = {
            "sub": "fake_user_id",
            "email": "test@example.com",
            "purpose": "password_reset",
            "iat": int(time.time()) - 7200,  # 2 hours ago
            "exp": int(time.time()) - 3600,  # Expired 1 hour ago
        }
        expired_token = jwt.encode(expired_payload, JWT_SECRET, algorithm="HS256")
        
        payload = {
            "token": expired_token,
            "new_password": "NewSecurePass123!"
        }
        response = requests.post(f"{BASE_URL}/api/users/reset-password", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "expiré" in data.get("detail", "").lower() or "expired" in data.get("detail", "").lower()
        print(f"✓ Reset password with expired token correctly returns 400")


class TestResetPasswordValidToken:
    """Reset password with valid token tests"""
    
    def test_reset_password_with_valid_token(self):
        """Test full reset password flow with valid token"""
        # First register a user
        unique_email = f"test_reset_{uuid.uuid4().hex[:8]}@example.com"
        register_payload = {
            "email": unique_email,
            "password": "OriginalPass123!",
            "name": "Reset Test User"
        }
        reg_response = requests.post(f"{BASE_URL}/api/users/register", json=register_payload)
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        user_id = reg_response.json().get("id")
        
        # Create a valid reset token manually (simulating what the backend does)
        import time
        now = int(time.time())
        reset_payload = {
            "sub": user_id,
            "email": unique_email,
            "purpose": "password_reset",
            "iat": now,
            "exp": now + 3600,  # Valid for 1 hour
        }
        valid_token = jwt.encode(reset_payload, JWT_SECRET, algorithm="HS256")
        
        # Reset password with valid token
        new_password = "NewSecurePass456!"
        reset_response = requests.post(f"{BASE_URL}/api/users/reset-password", json={
            "token": valid_token,
            "new_password": new_password
        })
        assert reset_response.status_code == 200, f"Expected 200, got {reset_response.status_code}: {reset_response.text}"
        data = reset_response.json()
        assert "message" in data
        print(f"✓ Password reset successful with valid token")
        print(f"  Message: {data.get('message')}")
        
        # Note: We can't verify login because email is not verified
        # But we can verify the password was changed by trying to reset again with same password
        return user_id, unique_email, new_password


class TestPasswordHistoryOnReset:
    """Password history check on reset (cannot reuse last 5 passwords)"""
    
    def test_reset_password_reuse_blocked(self):
        """Test that resetting to a recently used password is blocked"""
        # Register a user
        unique_email = f"test_history_{uuid.uuid4().hex[:8]}@example.com"
        original_password = "OriginalPass123!"
        register_payload = {
            "email": unique_email,
            "password": original_password,
            "name": "History Test User"
        }
        reg_response = requests.post(f"{BASE_URL}/api/users/register", json=register_payload)
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        user_id = reg_response.json().get("id")
        
        # Create a valid reset token
        import time
        now = int(time.time())
        reset_payload = {
            "sub": user_id,
            "email": unique_email,
            "purpose": "password_reset",
            "iat": now,
            "exp": now + 3600,
        }
        valid_token = jwt.encode(reset_payload, JWT_SECRET, algorithm="HS256")
        
        # Try to reset to the same password (should be blocked)
        reset_response = requests.post(f"{BASE_URL}/api/users/reset-password", json={
            "token": valid_token,
            "new_password": original_password  # Same as original
        })
        assert reset_response.status_code == 400, f"Expected 400, got {reset_response.status_code}: {reset_response.text}"
        data = reset_response.json()
        detail = data.get("detail", "")
        assert "déjà utilisé" in detail.lower() or "already used" in detail.lower() or "récemment" in detail.lower()
        print(f"✓ Password reuse correctly blocked on reset")
        print(f"  Error: {detail}")


class TestResetPasswordMinLength:
    """Reset password minimum length validation"""
    
    def test_reset_password_too_short(self):
        """Test that password less than 8 chars is rejected"""
        # Register a user
        unique_email = f"test_short_{uuid.uuid4().hex[:8]}@example.com"
        register_payload = {
            "email": unique_email,
            "password": "OriginalPass123!",
            "name": "Short Password Test"
        }
        reg_response = requests.post(f"{BASE_URL}/api/users/register", json=register_payload)
        assert reg_response.status_code == 200
        user_id = reg_response.json().get("id")
        
        # Create valid token
        import time
        now = int(time.time())
        reset_payload = {
            "sub": user_id,
            "email": unique_email,
            "purpose": "password_reset",
            "iat": now,
            "exp": now + 3600,
        }
        valid_token = jwt.encode(reset_payload, JWT_SECRET, algorithm="HS256")
        
        # Try to reset with short password
        reset_response = requests.post(f"{BASE_URL}/api/users/reset-password", json={
            "token": valid_token,
            "new_password": "short"  # Less than 8 chars
        })
        assert reset_response.status_code == 400, f"Expected 400, got {reset_response.status_code}: {reset_response.text}"
        data = reset_response.json()
        assert "8" in data.get("detail", "") or "caractères" in data.get("detail", "").lower()
        print(f"✓ Short password correctly rejected on reset")


class TestAdminDashboardAccess:
    """Test admin dashboard is accessible after login"""
    
    def test_admin_can_access_stats(self):
        """Test admin can access /api/users/stats after login"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/users/login", json={
            "email": "admin@bestshop.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        token = login_response.json().get("access_token")
        
        # Access stats endpoint
        headers = {"Authorization": f"Bearer {token}"}
        stats_response = requests.get(f"{BASE_URL}/api/users/stats", headers=headers)
        assert stats_response.status_code == 200
        data = stats_response.json()
        assert "total" in data
        print(f"✓ Admin can access dashboard stats: {data.get('total')} total users")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
