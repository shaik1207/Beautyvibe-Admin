import { useState, useRef, useEffect } from "react";
import { Menu, Bell, Search, CalendarDays, Check, Trash2, X } from "lucide-react";

export default function Topbar({ onMenuClick, adminName = "Shaik Sameer", adminRole = "Admin" }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  
  // Real-time notifications state
  const [notifications, setNotifications] = useState([
    { id: 1, title: "New appointment booked", time: "5m ago", unread: true },
    { id: 2, title: "Service request updated", time: "1h ago", unread: true },
    { id: 3, title: "Customer payment received", time: "3h ago", unread: true },
    { id: 4, title: "Daily schedule reminder", time: "5h ago", unread: true },
    { id: 5, title: "System backup completed", time: "1d ago", unread: true },
  ]);

  const calendarRef = useRef(null);
  const notificationRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Simulate real-time incoming notification every 45 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const newNotif = {
        id: Date.now(),
        title: "New service inquiry received",
        time: "Just now",
        unread: true,
      };
      setNotifications((prev) => [newNotif, ...prev]);
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const todayLabel = new Date(selectedDate).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, unread: false })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

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
      <div className="flex items-center gap-3 relative">
        {/* Date Badge & Dropdown */}
        <div className="relative" ref={calendarRef}>
          <button
            type="button"
            onClick={() => setShowCalendar(!showCalendar)}
            className="hidden sm:flex items-center gap-2 bg-white border border-[#EADBD2] hover:border-[#C56E4E] transition-all rounded-full px-4 py-2 text-xs font-bold text-[#2D2623] shadow-sm cursor-pointer"
          >
            <CalendarDays className="text-[#C56E4E]" size={14} />
            <span>{todayLabel}</span>
          </button>

          {showCalendar && (
            <div className="absolute right-0 mt-2 bg-white border border-[#EADBD2] rounded-2xl p-4 shadow-xl w-72 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EADBD2]">
                <span className="text-xs font-bold text-[#2D2623]">Select Date</span>
                <button 
                  onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                  className="text-[10px] text-[#C56E4E] font-semibold hover:underline cursor-pointer"
                >
                  Reset to Today
                </button>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setShowCalendar(false);
                }}
                className="w-full bg-[#FCF9F6] border border-[#EADBD2] rounded-xl px-3 py-2 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E]"
              />
            </div>
          )}
        </div>

        {/* Notifications Button & Dropdown */}
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative h-10 w-10 rounded-full bg-white border border-[#EADBD2] flex items-center justify-center text-[#5C4841] hover:border-[#C56E4E] transition-all shadow-sm cursor-pointer"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#B91C47] text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 bg-white border border-[#EADBD2] rounded-2xl shadow-xl w-80 sm:w-96 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-4 py-3 bg-[#FCF9F6] border-b border-[#EADBD2]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#2D2623]">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="bg-[#C56E4E]/15 text-[#C56E4E] text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={markAllAsRead}
                    title="Mark all as read"
                    className="text-[#8C7A70] hover:text-[#C56E4E] transition-colors p-1 cursor-pointer"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={clearNotifications}
                    title="Clear all"
                    className="text-[#8C7A70] hover:text-[#B91C47] transition-colors p-1 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#EADBD2]/60">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#8C7A70]">
                    No notifications right now
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        setNotifications(
                          notifications.map((n) => (n.id === notif.id ? { ...n, unread: false } : n))
                        );
                      }}
                      className={`px-4 py-3 text-xs flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                        notif.unread ? "bg-[#FCF9F6]/80 font-semibold" : "hover:bg-[#FCF9F6]/40 text-[#5C4841]"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {notif.unread && (
                          <span className="h-2 w-2 rounded-full bg-[#C56E4E] mt-1 shrink-0" />
                        )}
                        <div>
                          <p className="text-[#2D2623]">{notif.title}</p>
                          <span className="text-[10px] text-[#8C7A70]">{notif.time}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#EADBD2]">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80"
            alt={adminName}
            className="h-9 w-9 rounded-full object-cover border border-[#C56E4E]"
          />
          <div className="hidden md:block leading-tight">
            <p className="text-xs font-bold text-[#2D2623]">Hi, {adminName}</p>
            <p className="text-[10px] text-[#8C7A70]">{adminRole}</p>
          </div>
        </div>
      </div>
    </header>
  );
}