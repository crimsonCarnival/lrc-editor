import { useState, useEffect, useCallback, useRef } from 'react';
import { auth, setAccessToken, clearAccessToken } from '../api';

const ACCESS_TOKEN_KEY = 'lrc-syncer-access-token';
const REFRESH_TOKEN_KEY = 'lrc-syncer-refresh-token';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);

  const doLogout = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    // Clear project data so stale projects don't persist across accounts
    localStorage.removeItem('lrc-syncer-project');
    localStorage.removeItem('lrc-syncer-shared-project');
    localStorage.removeItem('lrc-syncer-active-project-id');
    clearAccessToken();
    setUser(null);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  // Schedule a token refresh before the access token expires (default: 14 min for 15 min expiry)
  const scheduleRefresh = useCallback((expiresIn = 14 * 60 * 1000) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      const rt = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!rt) return;
      try {
        const result = await auth.refresh(rt);
        localStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
        if (result.refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
        }
        setAccessToken(result.accessToken);
        scheduleRefresh();
      } catch {
        // Refresh failed — token expired, force logout
        doLogout();
      }
    }, expiresIn);
  }, [doLogout]);

  // Restore project on mount — guarded against StrictMode double-fire
  const restoringRef = useRef(false);
  useEffect(() => {
    if (restoringRef.current) return;
    restoringRef.current = true;

    const restore = async () => {
      const at = localStorage.getItem(ACCESS_TOKEN_KEY);
      const rt = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!at && !rt) {
        setLoading(false);
        return;
      }

      if (at) {
        setAccessToken(at);
        try {
          const result = await auth.me();
          setUser(result.user);
          scheduleRefresh();
          setLoading(false);
          return;
        } catch (err) {
          // Access token expired or user deleted — clear it so refresh can try
          clearAccessToken();
          if (err?.status === 404) {
            // User no longer exists — clear all tokens
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            setLoading(false);
            return;
          }
        }
      }

      if (rt) {
        try {
          const result = await auth.refresh(rt);
          localStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
          if (result.refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
          }
          setAccessToken(result.accessToken);
          const me = await auth.me();
          setUser(me.user);
          scheduleRefresh();
        } catch {
          // Both tokens invalid
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          clearAccessToken();
        }
      }
      setLoading(false);
    };

    restore();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [scheduleRefresh]);

  const login = useCallback(async ({ identifier, password }) => {
    const result = await auth.login({ identifier, password });
    localStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
    setAccessToken(result.accessToken);
    setUser(result.user);
    scheduleRefresh();
    return result;
  }, [scheduleRefresh]);

  const register = useCallback(async ({ username, email, password }) => {
    const result = await auth.register({ username, email, password });
    localStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
    setAccessToken(result.accessToken);
    setUser(result.user);
    scheduleRefresh();
    return result;
  }, [scheduleRefresh]);

  return { user, loading, login, register, logout: doLogout };
}
