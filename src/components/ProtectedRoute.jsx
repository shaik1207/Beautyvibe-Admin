import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show a smooth loading spinner while Firebase restores session
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF4F0]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#EADBD2] border-t-[#B91C47]" />
          <p className="mt-4 text-sm font-medium text-[#8C7A70]">
            Verifying secure session...
          </p>
        </div>
      </div>
    );
  }

  // Only redirect if loading is completely finished and user is null
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