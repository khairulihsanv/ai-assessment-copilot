"use client";

import { createContext, type ReactNode, useContext } from "react";
import styles from "./workspace-theme.module.css";

const WorkspaceThemeContext = createContext("");

export function WorkspaceThemeProvider({ children }: { children: ReactNode }) {
  return (
    <WorkspaceThemeContext.Provider value={styles.palette ?? ""}>
      {children}
    </WorkspaceThemeContext.Provider>
  );
}

// Portals inherit React context even when their DOM is rendered outside the workspace.
export function useWorkspaceThemeClassName() {
  return useContext(WorkspaceThemeContext);
}
