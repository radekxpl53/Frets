import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/client";
import { normalizeUserProfile } from "../utils/userProfile";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api
        .get("/users/me")
        .then((res) => setUser(normalizeUserProfile(res.data)))
        .catch(() => {
          localStorage.removeItem("token");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (login, password) => {
    const res = await api.post("/auth/login", { login, password });
    localStorage.setItem("token", res.data.token);
    const profile = await api.get("/users/me");
    const normalized = normalizeUserProfile(profile.data);
    setUser(normalized);
    return normalized;
  };

  const register = async (username, email, password) => {
    await api.post("/auth/register", { username, email, password });
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const refreshUser = async () => {
    const profile = await api.get("/users/me");
    const normalized = normalizeUserProfile(profile.data);
    setUser(normalized);
    return normalized;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}