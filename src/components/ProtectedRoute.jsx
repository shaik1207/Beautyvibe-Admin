import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Wait for Firebase to restore the session.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF4F0]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#EADBD2] border-t-[#B91C47]" />

          <p className="mt-4 text-sm font-medium text-[#8C7A70]">
            Checking your session...
          </p>
        </div>
      </div>
    );
  }

  // Redirect only after Firebase finishes checking.
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
}