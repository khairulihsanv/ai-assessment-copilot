"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

/**
 * SessionGuard ensures that users who did NOT choose "Ingat Sesi"
 * are automatically logged out when they close the browser / exit the website.
 * 
 * - If "dexa_remember_me" is true in localStorage, the session persists across browser restarts.
 * - Otherwise, the session is strictly scoped to the active browser session via sessionStorage.
 * - If user closed all tabs/browser and returns, they are immediately signed out to prevent
 *   stale sessions lingering in the dashboard.
 */
export function SessionGuard() {
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (verifiedRef.current) return;

    // 1. If user opted into "Ingat Sesi", allow persistent session
    const rememberMe = localStorage.getItem("dexa_remember_me") === "true";
    if (rememberMe) {
      verifiedRef.current = true;
      return;
    }

    // 2. Check if this tab already has an active session mark
    const sessionActive = sessionStorage.getItem("dexa_session_active") === "1";
    if (sessionActive) {
      verifiedRef.current = true;

      // Keep channel open to answer other tabs that might open
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("dexa_auth_channel");
        channel.onmessage = (e) => {
          if (e.data === "PING_SESSION") {
            channel.postMessage("PONG_SESSION");
          }
        };
        return () => {
          channel.close();
        };
      }
      return;
    }

    // 3. Tab has no active mark. Check if another tab of the app is already open.
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("dexa_auth_channel");
      let responded = false;

      channel.onmessage = (e) => {
        if (e.data === "PONG_SESSION") {
          responded = true;
          sessionStorage.setItem("dexa_session_active", "1");
          verifiedRef.current = true;
        }
      };

      channel.postMessage("PING_SESSION");

      const timer = setTimeout(() => {
        if (!responded) {
          // No tab responded and rememberMe is false.
          // The user previously exited the website! Auto logout now.
          channel.close();
          sessionStorage.removeItem("dexa_session_active");
          localStorage.removeItem("dexa_remember_me");
          signOut({ redirect: true, callbackUrl: "/login?reason=session_ended" });
        }
      }, 200);

      return () => {
        clearTimeout(timer);
        channel.close();
      };
    } else {
      sessionStorage.removeItem("dexa_session_active");
      localStorage.removeItem("dexa_remember_me");
      signOut({ redirect: true, callbackUrl: "/login?reason=session_ended" });
    }
  }, []);

  return null;
}
