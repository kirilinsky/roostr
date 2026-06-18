"use client";

import { createContext, useContext, type ReactNode } from "react";

// Admin flag is resolved on the server (from the session) and handed to the
// client tree so debug-only UI (e.g. Roostrdex reveal) can gate on it.
const AdminContext = createContext(false);

export function AdminProvider({
  isAdmin,
  children,
}: {
  isAdmin: boolean;
  children: ReactNode;
}) {
  return (
    <AdminContext.Provider value={isAdmin}>{children}</AdminContext.Provider>
  );
}

export function useIsAdmin(): boolean {
  return useContext(AdminContext);
}
