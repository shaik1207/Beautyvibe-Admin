import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Default route */}
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          {/* Login */}
          <Route path="/login" element={<Login />} />

          {/* Protected admin routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route
                path="/dashboard"
                element={<Dashboard />}
              />

              <Route
                path="/appointments"
                element={<Appointments />}
              />

              <Route
                path="/services"
                element={<Services />}
              />

              <Route
                path="/packages"
                element={<Packages />}
              />

              <Route
                path="/customers"
                element={<Customers />}
              />

              <Route
                path="/staff"
                element={<Staff />}
              />

              <Route
                path="/offers"
                element={<Offers />}
              />

              <Route
                path="/payments"
                element={<Payments />}
              />

              <Route
                path="/reports"
                element={<Reports />}
              />

              <Route
                path="/content"
                element={<WebsiteContent />}
              />

              <Route
                path="/settings"
                element={<Settings />}
              />
            </Route>
          </Route>

          {/* Unknown routes */}
          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}