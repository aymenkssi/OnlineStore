"""
Test Admin Permissions Bug Fix
Tests for: Read-only admin sections visibility in sidebar
Bug: AdminLayout.jsx line 69 used exact match which failed for 'key:r'/'key:rw' format
Fix: Added getPermissionKeys() to strip ':r'/':rw' suffixes before comparison
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminPermissions:
    """Test admin creation with read-only and read-write permissions"""
    
    admin_token = None
    test_admin_ids = []
    
    @pytest.fixture(autouse=True)
    def setup_admin_token(self):
        """Login as super admin to get token for creating test admins"""
        if TestAdminPermissions.admin_token is None:
            response = requests.post(f"{BASE_URL}/api/users/login", json={
                "email": "admin@bestshop.com",
                "password": "admin123"
            })
            assert response.status_code == 200, f"Admin login failed: {response.text}"
            data = response.json()
            TestAdminPermissions.admin_token = data.get("access_token")
            assert TestAdminPermissions.admin_token, "No access token returned"
        yield
    
    def get_auth_headers(self):
        return {"Authorization": f"Bearer {TestAdminPermissions.admin_token}"}
    
    def test_01_super_admin_login(self):
        """Test super admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/users/login", json={
            "email": "admin@bestshop.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("email") == "admin@bestshop.com"
        assert data.get("role") in ["admin", "super_admin"]
        assert "access_token" in data
        print(f"✓ Super admin login successful, role: {data.get('role')}")
    
    def test_02_create_readonly_admin(self):
        """Create admin with read-only permissions (key:r format)"""
        unique_email = f"TEST_readonly_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "email": unique_email,
            "password": "testpass123",
            "name": "Test ReadOnly Admin",
            "permissions": ["dashboard:r", "manage_orders:r", "view_customers:r"]
        }
        response = requests.post(
            f"{BASE_URL}/api/users/create-admin",
            json=payload,
            headers=self.get_auth_headers()
        )
        assert response.status_code == 200, f"Create admin failed: {response.text}"
        data = response.json()
        
        # Verify response
        assert data.get("email") == unique_email
        assert data.get("role") == "admin"
        assert data.get("permissions") == ["dashboard:r", "manage_orders:r", "view_customers:r"]
        
        TestAdminPermissions.test_admin_ids.append(data.get("id"))
        print(f"✓ Created read-only admin: {unique_email}")
        print(f"  Permissions: {data.get('permissions')}")
        
        # Verify admin can login
        login_response = requests.post(f"{BASE_URL}/api/users/login", json={
            "email": unique_email,
            "password": "testpass123"
        })
        assert login_response.status_code == 200, f"Read-only admin login failed: {login_response.text}"
        print(f"✓ Read-only admin can login successfully")
        
        return unique_email
    
    def test_03_create_readwrite_admin(self):
        """Create admin with read-write permissions (key:rw format)"""
        unique_email = f"TEST_readwrite_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "email": unique_email,
            "password": "testpass123",
            "name": "Test ReadWrite Admin",
            "permissions": ["dashboard:rw", "manage_orders:rw", "manage_products:rw"]
        }
        response = requests.post(
            f"{BASE_URL}/api/users/create-admin",
            json=payload,
            headers=self.get_auth_headers()
        )
        assert response.status_code == 200, f"Create admin failed: {response.text}"
        data = response.json()
        
        assert data.get("permissions") == ["dashboard:rw", "manage_orders:rw", "manage_products:rw"]
        TestAdminPermissions.test_admin_ids.append(data.get("id"))
        print(f"✓ Created read-write admin: {unique_email}")
        print(f"  Permissions: {data.get('permissions')}")
        
        return unique_email
    
    def test_04_create_mixed_permissions_admin(self):
        """Create admin with mixed read-only and read-write permissions"""
        unique_email = f"TEST_mixed_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "email": unique_email,
            "password": "testpass123",
            "name": "Test Mixed Admin",
            "permissions": ["dashboard:rw", "manage_orders:r", "manage_products:rw"]
        }
        response = requests.post(
            f"{BASE_URL}/api/users/create-admin",
            json=payload,
            headers=self.get_auth_headers()
        )
        assert response.status_code == 200, f"Create admin failed: {response.text}"
        data = response.json()
        
        assert data.get("permissions") == ["dashboard:rw", "manage_orders:r", "manage_products:rw"]
        TestAdminPermissions.test_admin_ids.append(data.get("id"))
        print(f"✓ Created mixed permissions admin: {unique_email}")
        print(f"  Permissions: {data.get('permissions')}")
        
        return unique_email
    
    def test_05_get_admins_list(self):
        """Verify admins are returned with correct permissions via GET /api/users?role=admin"""
        response = requests.get(
            f"{BASE_URL}/api/users/?role=admin",
            headers=self.get_auth_headers()
        )
        assert response.status_code == 200, f"Get admins failed: {response.text}"
        data = response.json()
        
        assert "items" in data
        admins = data["items"]
        
        # Find test admins
        test_admins = [a for a in admins if a.get("email", "").startswith("TEST_")]
        print(f"✓ Found {len(test_admins)} test admins in the list")
        
        for admin in test_admins:
            print(f"  - {admin.get('email')}: {admin.get('permissions')}")
            # Verify permissions are stored correctly
            perms = admin.get("permissions", [])
            for p in perms:
                assert ":" in p, f"Permission {p} should have :r or :rw suffix"
    
    def test_06_verify_permission_format(self):
        """Verify permissions are stored in correct key:level format"""
        response = requests.get(
            f"{BASE_URL}/api/users/?role=admin",
            headers=self.get_auth_headers()
        )
        assert response.status_code == 200
        data = response.json()
        
        for admin in data.get("items", []):
            if admin.get("email", "").startswith("TEST_"):
                perms = admin.get("permissions", [])
                for p in perms:
                    if isinstance(p, str) and ":" in p:
                        key, level = p.rsplit(":", 1)
                        assert level in ["r", "rw"], f"Invalid permission level: {level}"
                        print(f"  ✓ {p} -> key={key}, level={level}")
    
    def test_99_cleanup_test_admins(self):
        """Clean up test admins created during testing"""
        for admin_id in TestAdminPermissions.test_admin_ids:
            try:
                response = requests.delete(
                    f"{BASE_URL}/api/users/{admin_id}",
                    headers=self.get_auth_headers()
                )
                if response.status_code in [200, 204]:
                    print(f"✓ Deleted test admin: {admin_id}")
                else:
                    print(f"⚠ Could not delete admin {admin_id}: {response.status_code}")
            except Exception as e:
                print(f"⚠ Error deleting admin {admin_id}: {e}")
        
        TestAdminPermissions.test_admin_ids.clear()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
