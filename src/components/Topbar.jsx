import { Menu, Bell, Search, CalendarDays } from "lucide-react";

export default function Topbar({ onMenuClick }) {
  const todayLabel = new Date().toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-30 bg-[#FCF9F6]/95 backdrop-blur-md border-b border-[#EADBD2] px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Left: Mobile Menu & Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden h-10 w-10 rounded-xl bg-white border border-[#EADBD2] flex items-center justify-center text-[#2D2623] shadow-sm cursor-pointer"
        >
          <Menu size={20} />
        </button>

        <div className="relative flex items-center bg-white border border-[#EADBD2] rounded-full px-4 py-2.5 w-full shadow-sm">
          <Search className="text-[#8C7A70] mr-2.5 shrink-0" size={15} />
          <input
            type="text"
            placeholder="Search customers, appointments, services..."
            className="bg-transparent border-none outline-none text-xs font-medium text-[#2D2623] placeholder:text-[#A39292] w-full"
          />
        </div>
      </div>

      {/* Right: Date Badge, Notifications, Profile */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 bg-white border border-[#EADBD2] rounded-full px-4 py-2 text-xs font-bold text-[#2D2623] shadow-sm">
          <CalendarDays className="text-[#C56E4E]" size={14} />
          <span>{todayLabel}</span>
        </div>

        <button
          type="button"
          className="relative h-10 w-10 rounded-full bg-white border border-[#EADBD2] flex items-center justify-center text-[#5C4841] hover:border-[#C56E4E] transition-all shadow-sm cursor-pointer"
        >
          <Bell size={17} />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#B91C47] text-white text-[9px] font-bold flex items-center justify-center">
            5
          </span>
        </button>

        <div className="flex items-center gap-2.5 pl-2 border-l border-[#EADBD2]">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80"
            alt="Admin"
            className="h-9 w-9 rounded-full object-cover border border-[#C56E4E]"
          />
          <div className="hidden md:block leading-tight">
            <p className="text-xs font-bold text-[#2D2623]">Hi, Sameer</p>
            <p className="text-[10px] text-[#8C7A70]">Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}