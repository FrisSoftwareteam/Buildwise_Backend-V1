import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  roles?: string[] | null;
  department: string;
  avatarUrl?: string | null;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { name: string; email: string; password: string; department: string; role: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "buildwise_user";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function normalizeStoredUser(user: AuthUser): AuthUser {
  if (user.email === "ifeanyiayodeji@firstregistrarsnigeria.com") {
    return {
      ...user,
      role: "Software Engineer",
      roles: ["Software Engineer", "Software Unit Supervisor"],
      department: "Software",
    };
  }

  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const normalizedUser = normalizeStoredUser(JSON.parse(stored));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedUser));
        setUser(normalizedUser);
      }
    } catch {}
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    const normalizedUser = normalizeStoredUser(data.user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedUser));
    setUser(normalizedUser);
  };

  const signup = async (payload: { name: string; email: string; password: string; department: string; role: string }) => {
    const res = await fetch(`${BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Signup failed");
    const normalizedUser = normalizeStoredUser(data.user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedUser));
    setUser(normalizedUser);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
