import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { SidebarProvider } from "../context/SidebarContext";

export default function AdminLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="h-screen w-screen overflow-hidden bg-[#FCF9F6] text-[#2D2623] flex font-sans selection:bg-[#C56E4E] selection:text-white">
        
        {/* Fixed Pinned Sidebar */}
        <Sidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

        {/* Scrollable Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
          <Topbar onMenuClick={() => setMobileOpen((prev) => !prev)} />

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {children ? children : <Outlet />}
          </main>
        </div>

      </div>
    </SidebarProvider>
  );
}