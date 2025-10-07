/* =========================================================
   BayarInter Billing Reseller
   File: api.js (v2)
   Fitur: Login, Register, Logout, Auto Refresh Token, API Wrapper
   ========================================================= */

const API_BASE = "https://api.bayarinter.net";

/* =========================================================
   🔐 Token Helpers
   ========================================================= */
function saveTokens(access, refresh) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}

function getAccessToken() {
  return localStorage.getItem("access_token");
}

function getRefreshToken() {
  return localStorage.getItem("refresh_token");
}

function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

/* =========================================================
   🌐 API REQUEST WRAPPER
   Otomatis tambah Authorization dan auto-refresh token
   ========================================================= */
async function apiRequest(endpoint, method = "GET", body = null, useAuth = true) {
  const headers = { "Content-Type": "application/json" };

  if (useAuth && getAccessToken()) {
    headers["Authorization"] = `Bearer ${getAccessToken()}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    // Jika token expired, coba refresh sekali
    if (res.status === 401 && useAuth) {
      const refreshed = await refreshToken();
      if (refreshed) {
        // Retry original request
        headers["Authorization"] = `Bearer ${getAccessToken()}`;
        const retry = await fetch(`${API_BASE}${endpoint}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : null,
        });
        return handleResponse(retry);
      } else {
        clearTokens();
        throw new Error("Sesi habis. Silakan login ulang.");
      }
    }

    return handleResponse(res);
  } catch (err) {
    console.error("API Error:", err);
    throw err;
  }
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || res.statusText);
  return data;
}

/* =========================================================
   🧾 AUTH FUNCTIONS
   ========================================================= */

// Register
async function register(name, email, password) {
  const body = { name, email, password };
  const data = await apiRequest("/auth/register", "POST", body, false);
  return data;
}

// Login
async function login(email, password) {
  const body = { email, password };
  const data = await apiRequest("/auth/login", "POST", body, false);

  // Simpan token kalau ada
  if (data.access_token && data.refresh_token) {
    saveTokens(data.access_token, data.refresh_token);
  }

  return data;
}

// Logout
async function logout() {
  try {
    await apiRequest("/auth/logout", "POST", null, true);
  } catch (e) {
    console.warn("Logout error:", e);
  } finally {
    clearTokens();
  }
}

// Refresh Token
async function refreshToken() {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  try {
    const data = await apiRequest(
      "/auth/refresh",
      "POST",
      { refresh_token: refresh },
      false
    );
    if (data.access_token) {
      saveTokens(data.access_token, data.refresh_token || refresh);
      console.log("🔄 Token diperbarui");
      return true;
    }
  } catch (err) {
    console.warn("Gagal refresh token:", err.message);
  }

  return false;
}

/* =========================================================
   🧠 AUTH CHECK HELPER
   ========================================================= */
function isLoggedIn() {
  return !!getAccessToken();
}

/* =========================================================
   🪄 GENERIC API HELPER (untuk endpoint lain)
   ========================================================= */
const Api = {
  get:  (endpoint, useAuth = true) => apiRequest(endpoint, "GET", null, useAuth),
  post: (endpoint, body, useAuth = true) => apiRequest(endpoint, "POST", body, useAuth),
  put:  (endpoint, body, useAuth = true) => apiRequest(endpoint, "PUT", body, useAuth),
  del:  (endpoint, useAuth = true) => apiRequest(endpoint, "DELETE", null, useAuth),
  patch:(endpoint, body, useAuth = true) => apiRequest(endpoint, "PATCH", body, useAuth), // ← tambahkan ini
};


/* =========================================================
   🌟 Example Usage (di app.js)
   =========================================================
   // Login
   const result = await login(email, password);

   // Register
   await register(nama, email, pass);

   // Logout
   await logout();

   // Cek user
   const me = await Api.get("/auth/me");
   ========================================================= */
