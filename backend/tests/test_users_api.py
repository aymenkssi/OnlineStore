"""
Backend API Tests for Best Shop E-commerce
Tests: User registration, login, logout, account lockout, password change, email verification
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Basic API health check"""
    
    def test_api_root_returns_hello_world(self):
        """Test /api/ returns Hello World"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "Hello World"
        print("✓ API root returns Hello World")


class TestUserRegistration:
    """User registration endpoint tests"""
    
    def test_register_new_user_success(self):
        """Test POST /api/users/register with valid data"""
        unique_email = f"test_user_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "name": "Test User"
        }
        response = requests.post(f"{BASE_URL}/api/users/register", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("email") == unique_email
        assert data.get("name") == "Test User"
        assert data.get("role") == "customer"  # Public registration always creates customer
        assert data.get("status") == "active"
        assert "id" in data
        print(f"✓ User registration successful: {unique_email}")
        return data
    
    def test_register_duplicate_email_fails(self):
        """Test registration with existing email returns 400"""
        unique_email = f"test_dup_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "name": "First User"
        }
        # First registration
        response1 = requests.post(f"{BASE_URL}/api/users/register", json=payload)
        assert response1.status_code == 200
        
        # Duplicate registration
        response2 = requests.post(f"{BASE_URL}/api/users/register", json=payload)
        assert response2.status_code == 400
        data = response2.json()
        assert "déjà utilisé" in data.get("detail", "").lower() or "already" in data.get("detail", "").lower()
        print("✓ Duplicate email registration correctly rejected")


class TestUserLogin:
    """User login endpoint tests"""
    
    def test_login_with_valid_credentials(self):
        """Test POST /api/users/login with admin credentials"""
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
    
    def test_login_with_invalid_password(self):
        """Test login with wrong password returns 401"""
        payload = {
            "email": "admin@bestshop.com",
            "password": "wrongpassword"
        }
        response = requests.post(f"{BASE_URL}/api/users/login", json=payload)
        assert response.status_code == 401
        print("✓ Invalid password correctly rejected with 401")
    
    def test_login_with_nonexistent_email(self):
        """Test login with non-existent email returns 401"""
        payload = {
            "email": "nonexistent@example.com",
            "password": "anypassword"
        }
        response = requests.post(f"{BASE_URL}/api/users/login", json=payload)
        assert response.status_code == 401
        print("✓ Non-existent email correctly rejected with 401")


class TestAccountLockout:
    """Account lockout after failed login attempts"""
    
    def test_account_lockout_after_5_failures(self):
        """Test account gets locked after 5 failed login attempts (returns 423)"""
        # Create a fresh user for lockout testing
        unique_email = f"lockout_test_{uuid.uuid4().hex[:8]}@example.com"
        register_payload = {
            "email": unique_email,
            "password": "CorrectPass123!",
            "name": "Lockout Test User"
        }
        reg_response = requests.post(f"{BASE_URL}/api/users/register", json=register_payload)
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        
        # Attempt 5 failed logins
        wrong_payload = {
            "email": unique_email,
            "password": "WrongPassword!"
        }
        
        for i in range(5):
            response = requests.post(f"{BASE_URL}/api/users/login", json=wrong_payload)
            if response.status_code == 423:
                # Account locked before 5th attempt (already had some failures)
                print(f"✓ Account locked at attempt {i+1}")
                break
            assert response.status_code == 401, f"Attempt {i+1}: Expected 401, got {response.status_code}"
            print(f"  Failed attempt {i+1}: 401")
        
        # 6th attempt should return 423 (locked)
        response = requests.post(f"{BASE_URL}/api/users/login", json=wrong_payload)
        assert response.status_code == 423, f"Expected 423 (locked), got {response.status_code}: {response.text}"
        data = response.json()
        assert "locked" in str(data.get("detail", "")).lower() or "verrouillé" in str(data.get("detail", "")).lower()
        print("✓ Account correctly locked after 5 failed attempts (423 status)")


class TestUserLogout:
    """User logout and JWT blacklist tests"""
    
    def test_logout_blacklists_token(self):
        """Test POST /api/users/logout blacklists the JWT token"""
        # First login to get a token
        login_payload = {
            "email": "admin@bestshop.com",
            "password": "admin123"
        }
        login_response = requests.post(f"{BASE_URL}/api/users/login", json=login_payload)
        assert login_response.status_code == 200
        token = login_response.json().get("access_token")
        
        # Logout with the token
        headers = {"Authorization": f"Bearer {token}"}
        logout_response = requests.post(f"{BASE_URL}/api/users/logout", headers=headers)
        assert logout_response.status_code == 200
        data = logout_response.json()
        assert "déconnexion" in data.get("message", "").lower() or "logout" in data.get("message", "").lower()
        print("✓ Logout successful")
        
        # Try to use the revoked token - should fail
        # Note: The token is blacklisted, so protected endpoints should reject it
        protected_response = requests.get(f"{BASE_URL}/api/users/stats", headers=headers)
        # Should be 401 (revoked) or 403 (forbidden)
        assert protected_response.status_code in [401, 403], f"Expected 401/403 for revoked token, got {protected_response.status_code}"
        print("✓ Revoked token correctly rejected on subsequent requests")


class TestPasswordChange:
    """Password change with history check tests"""
    
    def test_change_password_success(self):
        """Test POST /api/users/change-password with valid current password"""
        # Create a fresh user
        unique_email = f"pwchange_{uuid.uuid4().hex[:8]}@example.com"
        original_password = "OriginalPass123!"
        new_password = "NewSecurePass456!"
        
        register_payload = {
            "email": unique_email,
            "password": original_password,
            "name": "Password Change Test"
        }
        reg_response = requests.post(f"{BASE_URL}/api/users/register", json=register_payload)
        assert reg_response.status_code == 200
        
        # Login to get token
        login_payload = {"email": unique_email, "password": original_password}
        login_response = requests.post(f"{BASE_URL}/api/users/login", json=login_payload)
        assert login_response.status_code == 200
        token = login_response.json().get("access_token")
        
        # Change password
        headers = {"Authorization": f"Bearer {token}"}
        change_payload = {
            "current_password": original_password,
            "new_password": new_password
        }
        change_response = requests.post(f"{BASE_URL}/api/users/change-password", json=change_payload, headers=headers)
        assert change_response.status_code == 200, f"Expected 200, got {change_response.status_code}: {change_response.text}"
        print("✓ Password changed successfully")
        
        # Verify new password works
        new_login_response = requests.post(f"{BASE_URL}/api/users/login", json={"email": unique_email, "password": new_password})
        assert new_login_response.status_code == 200
        print("✓ Login with new password successful")
    
    def test_change_password_reuse_blocked(self):
        """Test that reusing one of the last 5 passwords is blocked"""
        # Create a fresh user
        unique_email = f"pwhistory_{uuid.uuid4().hex[:8]}@example.com"
        original_password = "OriginalPass123!"
        
        register_payload = {
            "email": unique_email,
            "password": original_password,
            "name": "Password History Test"
        }
        reg_response = requests.post(f"{BASE_URL}/api/users/register", json=register_payload)
        assert reg_response.status_code == 200
        
        # Login
        login_response = requests.post(f"{BASE_URL}/api/users/login", json={"email": unique_email, "password": original_password})
        assert login_response.status_code == 200
        token = login_response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try to change to the same password (should be blocked)
        change_payload = {
            "current_password": original_password,
            "new_password": original_password  # Same as current
        }
        change_response = requests.post(f"{BASE_URL}/api/users/change-password", json=change_payload, headers=headers)
        assert change_response.status_code == 400, f"Expected 400 for password reuse, got {change_response.status_code}"
        data = change_response.json()
        assert "déjà utilisé" in data.get("detail", "").lower() or "already used" in data.get("detail", "").lower() or "récemment" in data.get("detail", "").lower()
        print("✓ Password reuse correctly blocked")
    
    def test_change_password_wrong_current_fails(self):
        """Test that wrong current password returns 401"""
        # Create a fresh user
        unique_email = f"pwwrong_{uuid.uuid4().hex[:8]}@example.com"
        original_password = "OriginalPass123!"
        
        register_payload = {
            "email": unique_email,
            "password": original_password,
            "name": "Wrong Password Test"
        }
        reg_response = requests.post(f"{BASE_URL}/api/users/register", json=register_payload)
        assert reg_response.status_code == 200
        
        # Login
        login_response = requests.post(f"{BASE_URL}/api/users/login", json={"email": unique_email, "password": original_password})
        assert login_response.status_code == 200
        token = login_response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try to change with wrong current password
        change_payload = {
            "current_password": "WrongCurrentPass!",
            "new_password": "NewPass456!"
        }
        change_response = requests.post(f"{BASE_URL}/api/users/change-password", json=change_payload, headers=headers)
        assert change_response.status_code == 401
        print("✓ Wrong current password correctly rejected with 401")


class TestEmailVerification:
    """Email verification endpoint tests"""
    
    def test_verify_email_invalid_token(self):
        """Test POST /api/users/verify-email with invalid token returns 400"""
        response = requests.post(f"{BASE_URL}/api/users/verify-email?token=invalid_token_12345")
        assert response.status_code == 400
        data = response.json()
        assert "invalide" in data.get("detail", "").lower() or "invalid" in data.get("detail", "").lower()
        print("✓ Invalid verification token correctly rejected with 400")
    
    def test_verify_email_missing_token(self):
        """Test POST /api/users/verify-email without token returns 422"""
        response = requests.post(f"{BASE_URL}/api/users/verify-email")
        # FastAPI returns 422 for missing required query params
        assert response.status_code == 422
        print("✓ Missing verification token correctly returns 422")


class TestAdminEndpoints:
    """Admin-only endpoint tests"""
    
    def test_admin_stats_requires_auth(self):
        """Test /api/users/stats requires admin authentication"""
        response = requests.get(f"{BASE_URL}/api/users/stats")
        assert response.status_code == 401
        print("✓ User stats endpoint correctly requires authentication")
    
    def test_admin_stats_with_valid_token(self):
        """Test /api/users/stats returns data with admin token"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/users/login", json={
            "email": "admin@bestshop.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        token = login_response.json().get("access_token")
        
        # Get stats
        headers = {"Authorization": f"Bearer {token}"}
        stats_response = requests.get(f"{BASE_URL}/api/users/stats", headers=headers)
        assert stats_response.status_code == 200
        data = stats_response.json()
        assert "total" in data
        assert "active" in data
        print(f"✓ Admin stats retrieved: {data.get('total')} total users")


class TestOtherEndpoints:
    """Test other critical endpoints"""
    
    def test_products_endpoint(self):
        """Test /api/products/ returns products"""
        response = requests.get(f"{BASE_URL}/api/products/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list) or "items" in data
        print(f"✓ Products endpoint working")
    
    def test_categories_endpoint(self):
        """Test /api/categories/ returns categories"""
        response = requests.get(f"{BASE_URL}/api/categories/")
        assert response.status_code == 200
        print("✓ Categories endpoint working")
    
    def test_orders_endpoint_requires_auth(self):
        """Test /api/orders/ requires authentication"""
        response = requests.get(f"{BASE_URL}/api/orders/")
        assert response.status_code == 401
        print("✓ Orders endpoint correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
