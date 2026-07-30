export const API_BASE_URL = import.meta.env.VITE_API_URL || "https://backend-tut-production.up.railway.app/api/v1";

// Token storage in memory
let accessToken = null;
let refreshToken = localStorage.getItem("refresh_token") || null;
let refreshPromise = null;

function makeApiError(message, status) {
  const err = new Error(message);
  err.status = status;
  err.sessionExpired = status === 401 || status === 403;
  return err;
}

export function setTokens(access, refresh) {
  accessToken = access;
  if (refresh) {
    refreshToken = refresh;
    localStorage.setItem("refresh_token", refresh);
  }
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem("refresh_token");
}

export function getRefreshToken() {
  return refreshToken;
}

export async function refreshAccessToken() {
  if (!refreshToken) throw new Error("No refresh token");
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async function () {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        clearTokens();
        throw makeApiError("Session expired", res.status);
      }
      if (res.status === 429) {
        throw makeApiError("Too many session refresh attempts. Please wait a moment and try again.", res.status);
      }
      throw makeApiError("Could not refresh session. Please try again.", res.status);
    }
    const data = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return data.access_token;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function request(method, path, body, retry = true) {
  if (!accessToken && refreshToken && retry) {
    await refreshAccessToken();
  }

  const headers = { "Content-Type": "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry) {
    try {
      await refreshAccessToken();
      return request(method, path, body, false);
    } catch (err) {
      if (err && err.sessionExpired) {
        clearTokens();
        window.location.href = "/";
      }
      throw err;
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    // FastAPI validation errors return detail as an array
    let detail = err.detail;
    if (Array.isArray(detail)) {
      detail = detail.map(d => d.msg || JSON.stringify(d)).join(", ");
    } else if (detail && typeof detail === "object") {
      detail = Object.values(detail).flat().join(", ");
    }
    throw new Error(detail || "Request failed");
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  patch: (path, body) => request("PATCH", path, body),
  put: (path, body) => request("PUT", path, body),
  delete: (path) => request("DELETE", path),
};

function analyticsPath(path, params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}

async function analyticsRequest(path) {
  try {
    return await api.get(path);
  } catch (cause) {
    if (cause && cause.sessionExpired) throw cause;
    const error = new Error(cause?.message || "Analytics data is unavailable");
    error.name = "AnalyticsUnavailableError";
    error.analyticsUnavailable = true;
    error.cause = cause;
    throw error;
  }
}

// ── Auth ──
export const auth = {
  login: (email, password) =>
    api.post("/auth/login", { email, password }),
  register: (full_name, email, password, referral_code, phone) =>
    api.post("/auth/register", { full_name, email, password, referral_code, phone: phone || "" }),
};

// ── User ──
export const users = {
  me: () => api.get("/users/me"),
  update: (data) => api.patch("/users/me", data),
  changePassword: (current_password, new_password, confirm_password) => api.post("/users/me/change-password", { current_password, new_password, confirm_password }),
  referrals: () => api.get("/users/me/referrals"),
  referralList: () => api.get("/users/me/referrals/list"),
  analytics: (options = {}) => analyticsRequest(analyticsPath("/users/me/analytics", {
    range: options.range,
    timezone: options.timezone,
  })),
};

// ── Subscriptions ──
export const subscriptions = {
  create: () => api.post("/subscriptions/"),
  me: () => api.get("/subscriptions/me"),
  cancel: () => api.post("/subscriptions/cancel"),
  verifyPayment: () => api.post("/subscriptions/verify-payment"),
};

// ── Courses ──
export const courses = {
  list: () => api.get("/courses/"),
  get: (id) => api.get(`/courses/${id}`),
  lessons: (courseId) => api.get(`/courses/${courseId}/lessons`),
  progress: (courseId) => api.get(`/courses/${courseId}/progress`),
  updateProgress: (courseId, lessonId, data) =>
    api.put(`/courses/${courseId}/lessons/${lessonId}/progress`, data),
};

// ── Chat ──
export const chat = {
  send: (content, session_id, lesson_id, system) =>
    api.post("/chat/messages", { content, session_id, lesson_id, system }),
  sessions: () => api.get("/chat/sessions"),
  messages: (sessionId) => api.get(`/chat/sessions/${sessionId}/messages`),
};

// ── Payouts ──
export const payouts = {
  mine: () => api.get("/payouts/me"),
  commissions: () => api.get("/payouts/me/commissions"),
  request: () => api.post("/users/me/payout-request", {}),
};

// ── Support ──
export const support = {
  create: (data) => api.post("/support/", data),
};

// ── Admin ──
export const admin = {
  users: (limit=200) => api.get("/admin/users?limit="+limit),
  dashboard: () => api.get("/admin/dashboard"),
  analytics: (options = {}) => analyticsRequest(analyticsPath("/admin/analytics", {
    range: options.range,
    bucket: options.bucket,
    timezone: options.timezone,
    top_limit: options.topLimit,
  })),
  updateRole: (userId, role) => api.patch("/admin/users/"+userId+"/role", { role }),
  payouts: (limit=200) => api.get("/admin/payouts?limit="+limit),
  triggerPayouts: () => api.post("/admin/payouts/trigger"),
  verifyPayout: (payoutId) => api.get("/admin/payouts/"+payoutId+"/verify"),
  activateSubscription: (userId) => api.post("/admin/users/"+userId+"/subscription/activate"),
  cancelSubscription: (userId) => api.post("/admin/users/"+userId+"/subscription/cancel"),
  createUser: (data) => api.post("/admin/users/create", data),
  deleteUser: (userId) => api.delete("/admin/users/"+userId),
  createCourse: (data) => api.post("/courses/", data),
  patchCourse: (id, data) => api.patch("/courses/"+id, data),
  deleteCourse: (id) => api.delete("/courses/"+id),
  getLessons: (courseId) => api.get("/courses/"+courseId+"/lessons"),
  createLesson: (courseId, data) => api.post("/courses/"+courseId+"/lessons", data),
  updateLesson: (courseId, lessonId, data) => api.patch("/courses/"+courseId+"/lessons/"+lessonId, data),
  deleteLesson: (courseId, lessonId) => api.delete("/courses/"+courseId+"/lessons/"+lessonId),
  resetPayout: (payoutId) => api.post("/admin/payouts/"+payoutId+"/reset"),
  updatePayoutInfo: (userId, data) => api.patch("/admin/users/"+userId+"/payout-info", data),
  processPayout: (payoutId) => api.post("/admin/payouts/"+payoutId+"/process"),
};
