import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Scissors,
  Package,
  UserRoundCog,
  BadgePercent,
  CreditCard,
  ChartNoAxesCombined,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
} from "lucide-react";

const navigation = [
  {
    label: "Overview",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Appointments",
    path: "/appointments",
    icon: CalendarDays,
  },
  {
    label: "Customers",
    path: "/customers",
    icon: Users,
  },
  {
    label: "Services",
    path: "/services",
    icon: Scissors,
  },
  {
    label: "Packages",
    path: "/packages",
    icon: Package,
  },
  {
    label: "Staff Management",
    path: "/staff",
    icon: UserRoundCog,
  },
  {
    label: "Offers & Discounts",
    path: "/offers",
    icon: BadgePercent,
  },
  {
    label: "Payments",
    path: "/payments",
    icon: CreditCard,
  },
  {
    label: "Reports & Analytics",
    path: "/reports",
    icon: ChartNoAxesCombined,
  },
  {
    label: "Content Management",
    path: "/content",
    icon: FileText,
  },
];

export default function Sidebar({
  isOpen = false,
  onClose = () => {},
  onLogout,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const storedAdmin =
    localStorage.getItem("admin") ||
    localStorage.getItem("adminUser") ||
    localStorage.getItem("currentUser") ||
    localStorage.getItem("user");

  let admin = {};

  try {
    admin = storedAdmin ? JSON.parse(storedAdmin) : {};
  } catch {
    admin = {};
  }

  const adminName =
    admin?.displayName ||
    admin?.name ||
    admin?.username ||
    admin?.email?.split("@")[0] ||
    "Shaik Sameer";

  const adminEmail = admin?.email || "admin@beautyvibe.com";

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  const handleNavigation = () => {
    setProfileOpen(false);
    onClose();
  };

  const handleLogout = async () => {
    try {
      if (onLogout) {
        await onLogout();
      } else {
        localStorage.removeItem("admin");
        localStorage.removeItem("adminUser");
        localStorage.removeItem("currentUser");
        localStorage.removeItem("user");
        sessionStorage.clear();

        navigate("/login", { replace: true });
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }

    setLogoutConfirm(false);
    setProfileOpen(false);
    onClose();
  };

  const settingsItems = [
    {
      label: "General Settings",
      path: "/settings",
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          isOpen
            ? "visible opacity-100"
            : "invisible opacity-0"
        }`}
      />

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex h-screen flex-col
          bg-white
          border-r border-[#EEEAE7]
          transition-all duration-300 ease-in-out
          lg:sticky lg:top-0 lg:z-30 lg:h-screen
          ${collapsed ? "lg:w-[84px]" : "lg:w-[272px]"}
          w-[272px]
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Brand header */}
        <div
          className={`flex h-[76px] shrink-0 items-center border-b border-[#F1EEEB] ${
            collapsed
              ? "justify-center px-3"
              : "justify-between px-5"
          }`}
        >
          <Link
            to="/"
            onClick={handleNavigation}
            className="flex min-w-0 items-center gap-3 group"
          >
            {/* Logo from public/primary.png */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-[#FCF9F6] border border-[#EADBD2] shadow-sm transition-transform duration-200 group-hover:scale-105">
              <img
                src="/primary.png"
                alt="BeautyVibe Logo"
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            {!collapsed && (
              <div className="min-w-0 overflow-hidden">
                <h1 className="truncate text-[17px] font-semibold tracking-[-0.5px] text-[#302722]">
                  BeautyVibe
                </h1>

                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[1.8px] text-[#A09187]">
                  Admin Panel
                </p>
              </div>
            )}
          </Link>

          {/* Desktop collapse button */}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#9A8E86] transition hover:bg-[#F7F4F1] hover:text-[#55443B] lg:flex cursor-pointer"
            >
              <PanelLeftClose size={17} strokeWidth={1.7} />
            </button>
          )}

          {/* Mobile close */}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8C7A70] hover:bg-[#F7F4F1] lg:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X size={19} />
          </button>

          {/* Expand button */}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              title="Expand sidebar"
              className="absolute -right-3 top-[29px] hidden h-7 w-7 items-center justify-center rounded-full border border-[#EAE4DF] bg-white text-[#8C7A70] shadow-sm transition hover:bg-[#F8F4F1] lg:flex cursor-pointer"
            >
              <PanelLeftOpen size={14} />
            </button>
          )}
        </div>

        {/* Navigation heading */}
        {!collapsed && (
          <div className="px-5 pb-2 pt-6">
            <p className="text-[10px] font-semibold uppercase tracking-[1.8px] text-[#B1A49A]">
              Workspace
            </p>
          </div>
        )}

        {/* Main navigation */}
        <nav
          className={`flex-1 overflow-y-auto overflow-x-hidden pb-4 ${
            collapsed ? "px-3 pt-5" : "px-3 pt-2"
          }`}
        >
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleNavigation}
                  title={collapsed ? item.label : undefined}
                  className={`
                    group relative flex h-[42px] items-center
                    rounded-[10px]
                    transition-all duration-200
                    ${
                      collapsed
                        ? "justify-center px-0"
                        : "gap-3 px-3"
                    }
                    ${
                      active
                        ? "border border-[#F0E5DF] bg-[#FBF5F1] text-[#B65F40]"
                        : "border border-transparent text-[#62564F] hover:bg-[#F8F6F4] hover:text-[#A95D40]"
                    }
                  `}
                >
                  {/* Active indicator */}
                  {active && (
                    <span className="absolute bottom-[9px] left-0 top-[9px] w-[3px] rounded-r-full bg-[#C56E4E]" />
                  )}

                  <Icon
                    size={18}
                    strokeWidth={active ? 2 : 1.7}
                    className={`shrink-0 transition-colors ${
                      active
                        ? "text-[#C56E4E]"
                        : "text-[#80736B] group-hover:text-[#C56E4E]"
                    }`}
                  />

                  {!collapsed && (
                    <>
                      <span
                        className={`min-w-0 flex-1 truncate text-[12.5px] ${
                          active
                            ? "font-medium"
                            : "font-normal"
                        }`}
                      >
                        {item.label}
                      </span>

                      {item.label === "Appointments" && (
                        <span className="flex h-[19px] min-w-[19px] items-center justify-center rounded-md bg-[#F8E7DF] px-1 text-[10px] font-semibold text-[#B65F40]">
                          !
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom navigation */}
        <div className="shrink-0 border-t border-[#F0ECE9] px-3 pb-3 pt-3">
          {/* Settings */}
          <button
            onClick={() => {
              if (collapsed) {
                navigate("/settings");
                onClose();
              } else {
                setSettingsOpen(!settingsOpen);
              }
            }}
            title={collapsed ? "Settings" : undefined}
            className={`
              group flex h-[42px] w-full items-center rounded-[10px]
              text-[#62564F] transition-all duration-200
              hover:bg-[#F8F6F4] hover:text-[#A95D40] cursor-pointer
              ${
                collapsed
                  ? "justify-center"
                  : "gap-3 px-3"
              }
            `}
          >
            <Settings
              size={18}
              strokeWidth={1.7}
              className="shrink-0 text-[#80736B] transition-colors group-hover:text-[#C56E4E]"
            />

            {!collapsed && (
              <>
                <span className="flex-1 text-left text-[12.5px]">
                  Settings
                </span>

                <ChevronDown
                  size={15}
                  className={`text-[#A99B92] transition-transform duration-200 ${
                    settingsOpen ? "rotate-180" : ""
                  }`}
                />
              </>
            )}
          </button>

          {/* Settings submenu */}
          {!collapsed && (
            <div
              className={`grid transition-all duration-200 ${
                settingsOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="ml-[21px] mt-1 space-y-1 border-l border-[#EAE3DD] pl-3">
                  {settingsItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={handleNavigation}
                      className={`flex h-8 items-center rounded-md px-2 text-[11.5px] transition ${
                        isActive(item.path)
                          ? "bg-[#FBF5F1] font-medium text-[#B65F40]"
                          : "text-[#8A7C73] hover:bg-[#F8F6F4] hover:text-[#B65F40]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={() => setLogoutConfirm(true)}
            title={collapsed ? "Log out" : undefined}
            className={`group mt-1 flex h-[42px] w-full items-center rounded-[10px] text-[#62564F] transition hover:bg-[#FFF0ED] hover:text-[#C34D3F] cursor-pointer ${
              collapsed
                ? "justify-center"
                : "gap-3 px-3"
            }`}
          >
            <LogOut
              size={18}
              strokeWidth={1.7}
              className="shrink-0 text-[#80736B] transition-colors group-hover:text-[#C34D3F]"
            />

            {!collapsed && (
              <span className="text-[12.5px]">Log out</span>
            )}
          </button>
        </div>

        {/* Admin profile */}
        <div className="shrink-0 border-t border-[#F0ECE9] p-3">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className={`flex w-full items-center rounded-[11px] p-2 transition hover:bg-[#F8F6F4] cursor-pointer ${
              collapsed
                ? "justify-center"
                : "gap-3"
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E9D5C9] bg-[#F7E9E0] text-[12px] font-semibold text-[#A45A3E]">
              {adminName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>

            {!collapsed && (
              <>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[12px] font-semibold text-[#40332C]">
                    {adminName}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-[#A09288]">
                    Super Admin
                  </p>
                </div>

                <ChevronRight
                  size={15}
                  className={`shrink-0 text-[#A99B92] transition-transform ${
                    profileOpen ? "rotate-90" : ""
                  }`}
                />
              </>
            )}
          </button>

          {/* Profile popover */}
          {profileOpen && !collapsed && (
            <div className="mb-1 mt-2 rounded-xl border border-[#EEE7E2] bg-white p-3 shadow-[0_8px_30px_rgba(48,39,34,0.08)] animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2">
                <UserRound
                  size={15}
                  className="shrink-0 text-[#A09288]"
                />

                <p className="truncate text-[11px] text-[#74665D]">
                  {adminEmail}
                </p>
              </div>

              <div className="my-3 h-px bg-[#F0ECE9]" />

              <button
                onClick={() => setLogoutConfirm(true)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[12px] text-[#B84E43] transition hover:bg-[#FFF0ED] cursor-pointer"
              >
                <LogOut size={15} />
                Sign out of account
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Logout confirmation modal */}
      {logoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[3px] animate-in fade-in duration-200">
          <div className="w-full max-w-[360px] rounded-[20px] border border-[#F0E8E2] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF0ED] text-[#C34D3F]">
              <LogOut size={22} />
            </div>

            <h2 className="mt-4 text-center text-[17px] font-semibold text-[#302722]">
              Log out of BeautyVibe?
            </h2>

            <p className="mt-2 text-center text-[12.5px] leading-5 text-[#8C7A70]">
              Are you sure you want to end your admin session?
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setLogoutConfirm(false)}
                className="h-10 rounded-xl border border-[#EAE3DD] text-[12px] font-medium text-[#62564F] transition hover:bg-[#F8F6F4] cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleLogout}
                className="h-10 rounded-xl bg-[#C34D3F] text-[12px] font-medium text-white transition hover:bg-[#AD4034] cursor-pointer"
              >
                Yes, log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}