import React, { createContext, useContext, useState, useCallback } from "react";

export type UserRole = "admin" | "staff" | null;

interface AuthContextType {
  role: UserRole;
  staffName: string;
  login: (role: UserRole, name: string) => void;
  logout: () => void;
  isAdmin: boolean;
  isStaff: boolean;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>(null);
  const [staffName, setStaffName] = useState("");

  const login = useCallback((r: UserRole, name: string) => {
    setRole(r);
    setStaffName(name);
  }, []);

  const logout = useCallback(() => {
    setRole(null);
    setStaffName("");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        role,
        staffName,
        login,
        logout,
        isAdmin: role === "admin",
        isStaff: role === "staff",
        isLoggedIn: role !== null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
