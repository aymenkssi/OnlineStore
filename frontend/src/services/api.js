// API Service for connecting to MongoDB backend
const API_URL = process.env.REACT_APP_BACKEND_URL;

// Retrieve JWT from localStorage (set by AuthModal on login)
const getAuthToken = () => {
  try {
    return localStorage.getItem('access_token');
  } catch {
    return null;
  }
};

// Read cookie (for CSRF double-submit pattern, used by OAuth redirect flows)
// eslint-disable-next-line no-unused-vars
const getCookie = (name) => {
  try {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[\\.$?*|{}()[\]\\\/\\+^]/g, '\\$&') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
};

// Helper for API calls
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  const token = getAuthToken();
  const config = {
    // Bearer header is the primary auth for SPA. Cookies are used by OAuth redirect flows only.
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    ...options
  };
  
  const response = await fetch(url, config);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur réseau' }));
    // Auto-logout on 401
    if (response.status === 401) {
      try {
        localStorage.removeItem('access_token');
      } catch { /* ignore */ }
    }
    throw new Error(error.detail || 'Erreur API');
  }
  return response.json();
};

// ============ ORDERS API ============
export const ordersApi = {
  getAll: async (params = {}) => {
    // Filter out undefined/null values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    return apiCall(`/api/orders/${query ? `?${query}` : ''}`);
  },
  
  getById: async (id) => apiCall(`/api/orders/${id}`),
  
  getByCustomer: async (email) => apiCall(`/api/orders/customer/${email}`),
  
  getStats: async () => apiCall('/api/orders/stats'),
  
  create: async (data) => apiCall('/api/orders/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  update: async (id, data) => apiCall(`/api/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  updateStatus: async (id, status) => apiCall(`/api/orders/${id}/status?status=${status}`, {
    method: 'PUT'
  }),
  
  delete: async (id) => apiCall(`/api/orders/${id}`, { method: 'DELETE' })
};

// ============ CUSTOMERS API ============
export const customersApi = {
  getAll: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    return apiCall(`/api/customers/${query ? `?${query}` : ''}`);
  },
  
  getById: async (id) => apiCall(`/api/customers/${id}`),
  
  getByEmail: async (email) => apiCall(`/api/customers/email/${email}`),
  
  getStats: async () => apiCall('/api/customers/stats'),
  
  recalculateStats: async () => apiCall('/api/customers/recalculate-stats', {
    method: 'POST'
  }),
  
  create: async (data) => apiCall('/api/customers/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  update: async (id, data) => apiCall(`/api/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  delete: async (id, code) => apiCall(`/api/customers/${id}`, { method: 'DELETE', body: JSON.stringify({ code }) })
};

// ============ RETURNS API ============
export const returnsApi = {
  getAll: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    return apiCall(`/api/returns/${query ? `?${query}` : ''}`);
  },
  
  getById: async (id) => apiCall(`/api/returns/${id}`),
  
  getByOrder: async (orderId) => apiCall(`/api/returns/order/${orderId}`),
  
  getStats: async () => apiCall('/api/returns/stats'),
  
  create: async (data) => apiCall('/api/returns/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  update: async (id, data) => apiCall(`/api/returns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  approve: async (id) => apiCall(`/api/returns/${id}/approve`, { method: 'PUT' }),
  
  reject: async (id, reason) => apiCall(`/api/returns/${id}/reject${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`, { method: 'PUT' }),
  
  complete: async (id) => apiCall(`/api/returns/${id}/complete`, { method: 'PUT' }),
  
  restock: async (id) => apiCall(`/api/returns/${id}/restock`, { method: 'PUT' }),
  
  updateStatus: async (id, status) => apiCall(`/api/returns/${id}/status?status=${status}`, { method: 'PUT' }),
  
  delete: async (id) => apiCall(`/api/returns/${id}`, { method: 'DELETE' })
};

// ============ PROMOTIONS API ============
export const promotionsApi = {
  getAll: async (activeOnly = false) => apiCall(`/api/promotions/${activeOnly ? '?active_only=true' : ''}`),
  
  getActive: async () => apiCall('/api/promotions/active'),
  
  getById: async (id) => apiCall(`/api/promotions/${id}`),
  
  create: async (data) => apiCall('/api/promotions/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  update: async (id, data) => apiCall(`/api/promotions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  toggle: async (id) => apiCall(`/api/promotions/${id}/toggle`, { method: 'POST' }),
  
  delete: async (id) => apiCall(`/api/promotions/${id}`, { method: 'DELETE' })
};

// ============ COUPONS API ============
export const couponsApi = {
  getAll: async () => apiCall('/api/coupons/'),
  
  create: async (data) => apiCall('/api/coupons/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  update: async (id, data) => apiCall(`/api/coupons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  toggle: async (id) => apiCall(`/api/coupons/${id}/toggle`, { method: 'POST' }),
  
  validate: async (code) => apiCall('/api/coupons/validate', {
    method: 'POST',
    body: JSON.stringify({ code })
  }),
  
  delete: async (id) => apiCall(`/api/coupons/${id}`, { method: 'DELETE' })
};

// ============ PRODUCTS API ============
export const productsApi = {
  getAll: async (params = {}) => {
    // Add cache-busting timestamp to always fetch fresh data
    const cacheBuster = { ...params, _t: Date.now() };
    const query = new URLSearchParams(cacheBuster).toString();
    return apiCall(`/api/products/${query ? `?${query}` : ''}`);
  },
  
  getById: async (id) => {
    // Add cache-busting timestamp
    const timestamp = Date.now();
    return apiCall(`/api/products/${id}?_t=${timestamp}`);
  },
  
  create: async (data) => apiCall('/api/products/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  update: async (id, data) => apiCall(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  delete: async (id, code) => apiCall(`/api/products/${id}`, { 
    method: 'DELETE',
    body: JSON.stringify({ code })
  })
};

// ============ CATEGORIES API ============
export const categoriesApi = {
  getAll: async () => apiCall('/api/categories/'),
  
  getBySlug: async (slug) => apiCall(`/api/categories/${slug}`),
  
  create: async (data) => apiCall('/api/categories/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  update: async (id, data) => apiCall(`/api/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  delete: async (id) => apiCall(`/api/categories/${id}`, { method: 'DELETE' })
};

// ============ ATTRIBUTES API ============
export const attributesApi = {
  getAll: async () => apiCall('/api/attributes/'),
  
  update: async (data) => apiCall('/api/attributes/', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  addColor: async (color) => apiCall('/api/attributes/colors', {
    method: 'POST',
    body: JSON.stringify(color)
  }),
  
  deleteColor: async (name) => apiCall(`/api/attributes/colors/${name}`, { method: 'DELETE' }),
  
  addSize: async (size) => apiCall(`/api/attributes/sizes/${size}`, { method: 'POST' }),
  
  deleteSize: async (size) => apiCall(`/api/attributes/sizes/${size}`, { method: 'DELETE' }),
  
  addBrand: async (brand) => apiCall(`/api/attributes/brands/${brand}`, { method: 'POST' }),
  
  deleteBrand: async (brand) => apiCall(`/api/attributes/brands/${brand}`, { method: 'DELETE' })
};

// ============ SETTINGS API ============
export const settingsApi = {
  getPayment: async () => apiCall('/api/settings/payment'),
  updatePayment: async (data) => apiCall('/api/settings/payment', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  getStyle: async () => apiCall('/api/settings/style'),
  updateStyle: async (data) => apiCall('/api/settings/style', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  getSite: async () => apiCall('/api/settings/site'),
  updateSite: async (data) => apiCall('/api/settings/site', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  getTexts: async () => apiCall('/api/settings/texts'),
  updateTexts: async (data) => apiCall('/api/settings/texts', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  getAdmins: async () => apiCall('/api/settings/admins'),
  getAdmin: async (id) => apiCall(`/api/settings/admins/${id}`),
  createAdmin: async (data) => apiCall('/api/settings/admins', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateAdmin: async (id, data) => apiCall(`/api/settings/admins/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteAdmin: async (id) => apiCall(`/api/settings/admins/${id}`, { method: 'DELETE' }),
  
  // Security settings
  getSecurity: async () => apiCall('/api/settings/security'),
  updateSecurity: async (data) => apiCall('/api/settings/security', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  verifyDeletionCode: async (code) => apiCall('/api/settings/verify-deletion-code', {
    method: 'POST',
    body: JSON.stringify({ code })
  })
};

// ============ STATISTICS API ============
export const statsApi = {
  getDashboard: async () => apiCall('/api/stats/dashboard'),
  recalculateDashboard: async () => apiCall('/api/stats/dashboard/recalculate', { method: 'POST' }),
  getSales: async (period = 'month') => apiCall(`/api/stats/sales?period=${period}`),
  getCustomers: async () => apiCall('/api/stats/customers'),
  getInventory: async () => apiCall('/api/stats/inventory')
};

// ============ NOTIFICATIONS API ============
export const notificationsApi = {
  getAll: async (unreadOnly = false) => apiCall(`/api/notifications/${unreadOnly ? '?unread_only=true' : ''}`),
  markAsRead: async (id) => apiCall(`/api/notifications/${id}/read`, { method: 'PUT' }),
  markAllAsRead: async () => apiCall('/api/notifications/read-all', { method: 'PUT' }),
  delete: async (id) => apiCall(`/api/notifications/${id}`, { method: 'DELETE' }),
  // Notification settings (Telegram/WhatsApp)
  getSettings: async () => apiCall('/api/notifications/settings'),
  updateSettings: async (data) => apiCall('/api/notifications/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  testChannel: async (channel, message) => apiCall('/api/notifications/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel, message }) }),
};

// ============ MIGRATION API ============
export const migrationApi = {
  getStatus: async () => apiCall('/api/migrate/status'),
  seedAll: async () => apiCall('/api/migrate/seed-all', { method: 'POST' })
};

// ============ RECOMMENDATIONS API ============
export const recommendationsApi = {
  // Track product view
  trackView: async (productId, category, subcategory) => {
    try {
      return await apiCall('/api/recommendations/track-view', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ 
          product_id: productId, 
          category, 
          subcategory 
        })
      });
    } catch (error) {
      console.error('Error tracking view:', error);
      return null;
    }
  },
  
  // Get personalized recommendations
  getPersonalized: async (limit = 8) => {
    try {
      return await apiCall(`/api/recommendations/personalized?limit=${limit}`, {
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  },
  
  // Get similar products
  getSimilar: async (productId, limit = 4) => {
    try {
      return await apiCall(`/api/recommendations/similar/${productId}?limit=${limit}`);
    } catch (error) {
      console.error('Error getting similar products:', error);
      return [];
    }
  },
  
  // Get recently viewed products
  getRecentlyViewed: async (limit = 6) => {
    try {
      return await apiCall(`/api/recommendations/recently-viewed?limit=${limit}`, {
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error getting recently viewed:', error);
      return [];
    }
  },
  
  // Get recommendation stats (admin)
  getStats: async () => apiCall('/api/recommendations/stats')
};

// ============ USERS API ============
export const usersApi = {
  // Get all users
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/api/users/${query ? '?' + query : ''}`);
  },
  
  // Get user stats
  getStats: async () => apiCall('/api/users/stats'),
  
  // Get user by ID
  getById: async (id) => apiCall(`/api/users/${id}`),
  
  // Register new user
  register: async (userData) => apiCall('/api/users/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),
  
  // Login user
  login: async (credentials) => apiCall('/api/users/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),

  // Logout (clears httpOnly cookies server-side)
  logout: async () => apiCall('/api/users/logout', { method: 'POST' }).catch(() => ({})),

  // Change own password
  changePassword: async (currentPassword, newPassword) => apiCall('/api/users/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
  }),

  // Forgot password (send reset email)
  forgotPassword: async (email) => apiCall('/api/users/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  }),

  // Reset password with token
  resetPassword: async (token, newPassword) => apiCall('/api/users/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password: newPassword })
  }),

  // Resend verification email
  resendVerification: async (email) => apiCall('/api/users/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email })
  }),

  // Two-factor authentication (TOTP)
  twoFactorStatus: async () => apiCall('/api/users/2fa/status'),
  twoFactorSetup: async () => apiCall('/api/users/2fa/setup', { method: 'POST' }),
  twoFactorVerify: async (code) => apiCall('/api/users/2fa/verify', {
    method: 'POST',
    body: JSON.stringify({ code })
  }),
  twoFactorDisable: async (password) => apiCall('/api/users/2fa/disable', {
    method: 'POST',
    body: JSON.stringify({ password })
  }),
  
  // Update user
  update: async (id, userData) => apiCall(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  }),
  
  // Delete user
  delete: async (id) => apiCall(`/api/users/${id}`, { method: 'DELETE' }),

  // Create admin account (admin only)
  createAdmin: async (data) => apiCall('/api/users/create-admin', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  // Get profile by email
  getProfile: async (email) => apiCall(`/api/users/profile/${encodeURIComponent(email)}`),
  
  // Update profile
  updateProfile: async (email, profileData) => apiCall(`/api/users/profile/${encodeURIComponent(email)}`, {
    method: 'PUT',
    body: JSON.stringify(profileData)
  }),

  // Get user preferences
  getPreferences: async (email) => apiCall(`/api/users/preferences/${encodeURIComponent(email)}`),

  // Update user preferences
  updatePreferences: async (email, preferences) => apiCall(`/api/users/preferences/${encodeURIComponent(email)}`, {
    method: 'PUT',
    body: JSON.stringify(preferences)
  })
};

// ============ PAYMENTS API ============
export const paymentsApi = {
  createCheckoutSession: async (orderId, originUrl) => apiCall('/api/payments/checkout', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId, origin_url: originUrl })
  }),
  getPaymentStatus: async (sessionId) => apiCall(`/api/payments/status/${sessionId}`),
};

export default {
  orders: ordersApi,
  customers: customersApi,
  returns: returnsApi,
  promotions: promotionsApi,
  coupons: couponsApi,
  products: productsApi,
  categories: categoriesApi,
  attributes: attributesApi,
  settings: settingsApi,
  stats: statsApi,
  notifications: notificationsApi,
  migration: migrationApi,
  recommendations: recommendationsApi,
  users: usersApi
};
