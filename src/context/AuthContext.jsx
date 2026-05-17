import { createContext, useContext, useState } from "react";
import axiosInstance from "../api/axiosInstance.js";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });
  const login = async (username, password) => {
    const { data } = await axiosInstance.post("/auth/login", {
      username,
      password,
    });
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };
  const register = async (username, password, role) => {
    const { data } = await axiosInstance.post("/auth/register", {
      username,
      password,
      role,
    });
    return data;
  };
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };
  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
