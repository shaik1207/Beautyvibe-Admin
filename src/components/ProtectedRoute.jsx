import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import API from "../utils/axios";

export default function AdminProtectedRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const token = localStorage.getItem("beautyvibe_admin_token");

  useEffect(() => {
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    // Verify token with backend
    API.get("/api/auth/me")
      .then((res) => {
        const responseData = res.data?.data || res.data || {};
        const role = responseData.role;

        if (role === "admin") {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("beautyvibe_admin_token");
          setIsAuthenticated(false);
        }
      })
      .catch((err) => {
        console.error("Admin session verification failed:", err);
        localStorage.removeItem("beautyvibe_admin_token");
        setIsAuthenticated(false);
      });
  }, [token]);

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF4F0]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#EADBD2] border-t-[#B91C47]" />
          <p className="mt-4 text-sm font-medium text-[#8C7A70]">
            Verifying admin session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}