export const Auth = {
  TOKEN_EXPIRY_MINUTES: 10, // Token expires after 10 minutes
  
  getToken() {
    return localStorage.getItem('jwtToken') || '';
  },
  
  setToken(token) {
    localStorage.setItem('jwtToken', token);
    // Store token timestamp for expiration checking
    localStorage.setItem('tokenTimestamp', Date.now().toString());
  },

  // Sliding session: bump timestamp on activity / authenticated API calls
  touch() {
    const token = this.getToken();
    if (!token) return;
    localStorage.setItem('tokenTimestamp', Date.now().toString());
  },
  
  clearToken() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('tokenTimestamp');
    localStorage.removeItem('userId');
    localStorage.removeItem('selectedTenantId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('selectedProjectId');
  },
  
  getRole() {
    return localStorage.getItem('userRole') || '';
  },
  
  setRole(role) {
    localStorage.setItem('userRole', role);
  },
  
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    
    // Check if token has expired (10 minutes)
    const tokenTimestamp = localStorage.getItem('tokenTimestamp');
    if (tokenTimestamp) {
      const tokenAge = Date.now() - parseInt(tokenTimestamp);
      const expiryMs = this.TOKEN_EXPIRY_MINUTES * 60 * 1000;
      
      if (tokenAge > expiryMs) {
        // Token expired, clear it
        this.clearToken();
        return false;
      }
    }
    
    return true;
  },
  
  logout() {
    this.clearToken();
    window.location.href = '/Login';
  },
  
  // Check if token is expired and logout if needed
  checkTokenExpiry() {
    if (!this.isAuthenticated()) {
      // Token expired or missing, redirect to login
      if (window.location.pathname !== '/Login') {
        this.logout();
      }
    }
  }
};


// Backend API base URL
// In development: uses Vite proxy (empty string -> localhost:8080 via proxy)
// In production: uses VITE_API_BASE_URL or defaults to EC2 backend
const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'http://3.137.217.41:8080' : '');

export async function fetchDevToken(role, sub) {
  const params = new URLSearchParams({ role, sub });
  const res = await fetch(`${API_BASE}/api/public/dev-token?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch dev token');
  return res.json();
}

export async function loginSuperAdmin(username, password) {
  const res = await fetch(`${API_BASE}/api/public/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    let text = await res.text();
    console.error('Login error:', res.status, res.statusText, text);
    throw new Error('Invalid credentials: ' + res.status + ' ' + res.statusText + (text ? ' - ' + text : ''));
  }
  return res.json();
}
