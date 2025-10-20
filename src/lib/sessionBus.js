const KEY = "sh-v3-session";

export function saveSession(data) {
  try {
    const cur = loadSession();
    localStorage.setItem(KEY, JSON.stringify({ ...cur, ...data }));
  } catch {}
}

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
