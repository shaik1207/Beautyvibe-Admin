import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import API from "./utils/axios";
import AdminLayout from "./components/AdminLayout";

import Dashboard from "./pages/Dashboard";
import Appointments from "./pages/Appointments";
import Services from "./pages/Services";
import Packages from "./pages/Packages";
import Customers from "./pages/Customers";
import Staff from "./pages/Staff";
import Offers from "./pages/Offers";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import WebsiteContent from "./pages/WebsiteContent";
import Settings from "./pages/Settings";
import Login from "./pages/Login";

// Inline Protected Route Component (No separate file required)
function InlineAdminGuard() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const token = localStorage.getItem("beautyvibe_admin_token");

  useEffect(() => {
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    API.get("/api/auth/me")
      .then((res) => {
        const responseData = res.data?.data || res.data || {};
        if (responseData.role === "admin") {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("beautyvibe_admin_token");
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route */}
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />

        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Protected Admin Routes */}
        <Route element={<InlineAdminGuard />}>
          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/services" element={<Services />} />
            <Route path="/packages" element={<Packages />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/content" element={<WebsiteContent />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        {/* Unknown routes */}
        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}