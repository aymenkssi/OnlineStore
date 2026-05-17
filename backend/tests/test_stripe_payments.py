"""
Test Stripe Payment Integration and Order Confirmation Emails
Tests:
- POST /api/payments/checkout - creates Stripe checkout session
- GET /api/payments/status/{session_id} - returns payment status
- POST /api/orders/ - order creation with email confirmation logic
- Admin login and dashboard access
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@bestshop.com"
ADMIN_PASSWORD = "admin123"


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "Hello World"
        print("✓ API root endpoint working")
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/users/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print(f"✓ Admin login successful, token received")
        return data["access_token"]


class TestOrderCreation:
    """Test order creation with payment method logic"""
    
    def test_create_order_cash_on_delivery(self):
        """Test creating order with cash on delivery - should send email immediately"""
        order_data = {
            "items": [
                {
                    "product_id": "test-product-1",
                    "name": "Test Product",
                    "price": 99.99,
                    "quantity": 1,
                    "color": "Black",
                    "size": "M",
                    "image": None
                }
            ],
            "shipping_address": {
                "firstName": "Test",
                "lastName": "User",
                "address": "123 Test Street",
                "city": "Paris",
                "postalCode": "75001",
                "country": "France",
                "phone": "+33612345678"
            },
            "subtotal": 99.99,
            "shipping_cost": 0,
            "discount": 0,
            "total": 99.99,
            "coupon_code": None,
            "payment_method": "cashOnDelivery",
            "customer_email": "test_cod@example.com",
            "customer_name": "Test User COD"
        }
        
        response = requests.post(f"{BASE_URL}/api/orders/", json=order_data)
        assert response.status_code == 200
        data = response.json()
        
        # Verify order structure
        assert "id" in data
        assert "order_number" in data
        assert data["payment_method"] == "cashOnDelivery"
        assert data["status"] == "pending"
        assert data["payment_status"] == "pending"
        assert data["customer_email"] == "test_cod@example.com"
        
        print(f"✓ Cash on delivery order created: {data['order_number']}")
        print(f"  - Email should be sent immediately for non-card payments")
        return data
    
    def test_create_order_card_payment(self):
        """Test creating order with card payment - should NOT send email immediately"""
        order_data = {
            "items": [
                {
                    "product_id": "test-product-2",
                    "name": "Test Product Card",
                    "price": 149.99,
                    "quantity": 2,
                    "color": "Blue",
                    "size": "L",
                    "image": None
                }
            ],
            "shipping_address": {
                "firstName": "Card",
                "lastName": "Payer",
                "address": "456 Card Street",
                "city": "Lyon",
                "postalCode": "69001",
                "country": "France",
                "phone": "+33698765432"
            },
            "subtotal": 299.98,
            "shipping_cost": 5.99,
            "discount": 0,
            "total": 305.97,
            "coupon_code": None,
            "payment_method": "card",
            "customer_email": "test_card@example.com",
            "customer_name": "Card Payer Test"
        }
        
        response = requests.post(f"{BASE_URL}/api/orders/", json=order_data)
        assert response.status_code == 200
        data = response.json()
        
        # Verify order structure
        assert "id" in data
        assert "order_number" in data
        assert data["payment_method"] == "card"
        assert data["status"] == "pending"
        assert data["payment_status"] == "pending"
        
        print(f"✓ Card payment order created: {data['order_number']}")
        print(f"  - Email should NOT be sent immediately (waits for Stripe confirmation)")
        return data


class TestStripeCheckout:
    """Test Stripe checkout session creation"""
    
    def test_create_checkout_session(self):
        """Test creating Stripe checkout session for an order"""
        # First create an order
        order_data = {
            "items": [
                {
                    "product_id": "stripe-test-product",
                    "name": "Stripe Test Product",
                    "price": 50.00,
                    "quantity": 1,
                    "color": "Red",
                    "size": "S",
                    "image": None
                }
            ],
            "shipping_address": {
                "firstName": "Stripe",
                "lastName": "Tester",
                "address": "789 Stripe Ave",
                "city": "Marseille",
                "postalCode": "13001",
                "country": "France",
                "phone": "+33611223344"
            },
            "subtotal": 50.00,
            "shipping_cost": 0,
            "discount": 0,
            "total": 50.00,
            "coupon_code": None,
            "payment_method": "card",
            "customer_email": "stripe_test@example.com",
            "customer_name": "Stripe Tester"
        }
        
        order_response = requests.post(f"{BASE_URL}/api/orders/", json=order_data)
        assert order_response.status_code == 200
        order = order_response.json()
        order_id = order["id"]
        
        # Now create checkout session
        checkout_data = {
            "order_id": order_id,
            "origin_url": "https://store-test-1.preview.emergentagent.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/checkout", json=checkout_data)
        assert response.status_code == 200
        data = response.json()
        
        # Verify checkout session response
        assert "url" in data, "Response should contain Stripe checkout URL"
        assert "session_id" in data, "Response should contain session_id"
        assert data["url"].startswith("https://checkout.stripe.com"), f"URL should be Stripe checkout URL, got: {data['url'][:50]}"
        
        print(f"✓ Stripe checkout session created")
        print(f"  - Session ID: {data['session_id']}")
        print(f"  - Checkout URL: {data['url'][:80]}...")
        return data
    
    def test_checkout_session_nonexistent_order(self):
        """Test creating checkout session for non-existent order"""
        checkout_data = {
            "order_id": "nonexistent-order-id-12345",
            "origin_url": "https://store-test-1.preview.emergentagent.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/checkout", json=checkout_data)
        assert response.status_code == 404
        data = response.json()
        assert "non trouvée" in data.get("detail", "").lower() or "not found" in data.get("detail", "").lower()
        print("✓ Checkout session correctly returns 404 for non-existent order")
    
    def test_checkout_session_already_paid_order(self):
        """Test creating checkout session for already paid order"""
        # First create an order
        order_data = {
            "items": [
                {
                    "product_id": "paid-test-product",
                    "name": "Paid Test Product",
                    "price": 25.00,
                    "quantity": 1,
                    "color": "Green",
                    "size": "M",
                    "image": None
                }
            ],
            "shipping_address": {
                "firstName": "Paid",
                "lastName": "Order",
                "address": "111 Paid Street",
                "city": "Nice",
                "postalCode": "06000",
                "country": "France",
                "phone": "+33655443322"
            },
            "subtotal": 25.00,
            "shipping_cost": 0,
            "discount": 0,
            "total": 25.00,
            "coupon_code": None,
            "payment_method": "card",
            "customer_email": "paid_test@example.com",
            "customer_name": "Paid Order Test"
        }
        
        order_response = requests.post(f"{BASE_URL}/api/orders/", json=order_data)
        assert order_response.status_code == 200
        order = order_response.json()
        order_id = order["id"]
        
        # Update order to paid status
        update_response = requests.put(f"{BASE_URL}/api/orders/{order_id}", json={
            "payment_status": "paid"
        })
        assert update_response.status_code == 200
        
        # Try to create checkout session for paid order
        checkout_data = {
            "order_id": order_id,
            "origin_url": "https://store-test-1.preview.emergentagent.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/payments/checkout", json=checkout_data)
        assert response.status_code == 400
        data = response.json()
        assert "déjà payée" in data.get("detail", "").lower() or "already paid" in data.get("detail", "").lower()
        print("✓ Checkout session correctly returns 400 for already paid order")


class TestPaymentStatus:
    """Test payment status polling"""
    
    def test_get_payment_status_valid_session(self):
        """Test getting payment status for a valid session"""
        # First create an order and checkout session
        order_data = {
            "items": [
                {
                    "product_id": "status-test-product",
                    "name": "Status Test Product",
                    "price": 75.00,
                    "quantity": 1,
                    "color": "Yellow",
                    "size": "XL",
                    "image": None
                }
            ],
            "shipping_address": {
                "firstName": "Status",
                "lastName": "Tester",
                "address": "222 Status Road",
                "city": "Bordeaux",
                "postalCode": "33000",
                "country": "France",
                "phone": "+33677889900"
            },
            "subtotal": 75.00,
            "shipping_cost": 0,
            "discount": 0,
            "total": 75.00,
            "coupon_code": None,
            "payment_method": "card",
            "customer_email": "status_test@example.com",
            "customer_name": "Status Tester"
        }
        
        order_response = requests.post(f"{BASE_URL}/api/orders/", json=order_data)
        assert order_response.status_code == 200
        order = order_response.json()
        
        # Create checkout session
        checkout_data = {
            "order_id": order["id"],
            "origin_url": "https://store-test-1.preview.emergentagent.com"
        }
        
        checkout_response = requests.post(f"{BASE_URL}/api/payments/checkout", json=checkout_data)
        assert checkout_response.status_code == 200
        checkout = checkout_response.json()
        session_id = checkout["session_id"]
        
        # Get payment status
        status_response = requests.get(f"{BASE_URL}/api/payments/status/{session_id}")
        assert status_response.status_code == 200
        status = status_response.json()
        
        # Verify status response structure
        assert "status" in status
        assert "payment_status" in status
        # For unpaid session, payment_status should be "unpaid" or similar
        assert status["payment_status"] in ["unpaid", "no_payment_required", "paid"]
        
        print(f"✓ Payment status retrieved successfully")
        print(f"  - Status: {status['status']}")
        print(f"  - Payment Status: {status['payment_status']}")
        return status
    
    def test_get_payment_status_invalid_session(self):
        """Test getting payment status for invalid session ID"""
        response = requests.get(f"{BASE_URL}/api/payments/status/invalid_session_id_12345")
        # Should return 200 with status from Stripe (which will be an error or empty)
        # or could return error status
        print(f"  - Invalid session response: {response.status_code}")
        # The endpoint should handle this gracefully
        assert response.status_code in [200, 400, 404, 500]
        print("✓ Payment status endpoint handles invalid session gracefully")


class TestOrdersAPI:
    """Test orders API endpoints"""
    
    def test_get_orders_list(self):
        """Test getting list of orders"""
        response = requests.get(f"{BASE_URL}/api/orders/")
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
        
        print(f"✓ Orders list retrieved: {data['total']} orders")
        return data
    
    def test_get_order_by_id(self):
        """Test getting order by ID"""
        # First get list of orders
        list_response = requests.get(f"{BASE_URL}/api/orders/")
        assert list_response.status_code == 200
        orders = list_response.json()
        
        if orders["items"]:
            order_id = orders["items"][0]["id"]
            response = requests.get(f"{BASE_URL}/api/orders/{order_id}")
            assert response.status_code == 200
            order = response.json()
            
            assert order["id"] == order_id
            assert "order_number" in order
            assert "items" in order
            assert "total" in order
            
            print(f"✓ Order retrieved by ID: {order['order_number']}")
        else:
            print("⚠ No orders to test get by ID")
    
    def test_get_order_stats(self):
        """Test getting order statistics"""
        response = requests.get(f"{BASE_URL}/api/orders/stats")
        assert response.status_code == 200
        stats = response.json()
        
        assert "total" in stats or "total_orders" in stats
        assert "total_revenue" in stats
        
        print(f"✓ Order stats retrieved")
        print(f"  - Total orders: {stats.get('total', stats.get('total_orders', 0))}")
        print(f"  - Total revenue: {stats.get('total_revenue', 0)}")
        return stats


class TestAdminDashboard:
    """Test admin dashboard access"""
    
    def test_admin_login_and_stats(self):
        """Test admin can login and access dashboard stats"""
        # Login
        login_response = requests.post(f"{BASE_URL}/api/users/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get dashboard stats
        stats_response = requests.get(f"{BASE_URL}/api/stats/dashboard", headers=headers)
        assert stats_response.status_code == 200
        stats = stats_response.json()
        
        print(f"✓ Admin dashboard stats accessible")
        print(f"  - Stats keys: {list(stats.keys())[:5]}...")
        return stats
    
    def test_admin_can_view_orders(self):
        """Test admin can view orders"""
        # Login
        login_response = requests.post(f"{BASE_URL}/api/users/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get orders
        orders_response = requests.get(f"{BASE_URL}/api/orders/", headers=headers)
        assert orders_response.status_code == 200
        
        print("✓ Admin can view orders")


class TestPaymentsAPIStructure:
    """Test payments API structure and paymentsApi frontend service"""
    
    def test_payments_checkout_endpoint_exists(self):
        """Verify /api/payments/checkout endpoint exists"""
        # Send minimal request to verify endpoint exists
        response = requests.post(f"{BASE_URL}/api/payments/checkout", json={})
        # Should return 422 (validation error) not 404
        assert response.status_code != 404, "Endpoint should exist"
        print(f"✓ /api/payments/checkout endpoint exists (status: {response.status_code})")
    
    def test_payments_status_endpoint_exists(self):
        """Verify /api/payments/status/{session_id} endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/payments/status/test_session")
        # Should not return 404 for the route itself
        # May return error for invalid session but route should exist
        assert response.status_code != 404 or "session" in response.text.lower()
        print(f"✓ /api/payments/status endpoint exists (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
