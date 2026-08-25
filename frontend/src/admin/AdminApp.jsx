import { useEffect, useState } from "react";
import AdminAccountPage from "../../AdminAccountPage";
import { adminAuthApi } from "./adminAuthApi";
import AdminLoginPage from "./pages/AdminLoginPage";

export default function AdminApp() {
  const [sessionState, setSessionState] = useState("loading");
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    let active = true;

    adminAuthApi.getSession()
      .then(({ user }) => {
        if (!active) return;
        setAdmin(user);
        setSessionState("authenticated");
      })
      .catch(() => {
        if (!active) return;
        setAdmin(null);
        setSessionState("anonymous");
      });

    return () => {
      active = false;
    };
  }, []);

  const handleLogin = (user) => {
    setAdmin(user);
    setSessionState("authenticated");
  };

  const handleLogout = async () => {
    try {
      await adminAuthApi.logout();
    } finally {
      setAdmin(null);
      setSessionState("anonymous");
    }
  };

  if (sessionState === "loading") {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">Checking your admin session...</div>;
  }

  if (sessionState !== "authenticated") {
    return <AdminLoginPage onLogin={handleLogin} />;
  }

  return <AdminAccountPage user={admin} onLogout={handleLogout} />;
}
