import React, { createContext, useContext, useState, ReactNode } from "react";
type UserRole = "admin" | "employee";

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  currentUserId: string;
}

const RoleContext = createContext<RoleContextType>({ role: "admin", setRole: () => {}, currentUserId: "u1" });

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<UserRole>("admin");
  const currentUserId = role === "admin" ? "u1" : "u2";
  
  return (
    <RoleContext.Provider value={{ role, setRole, currentUserId }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);
