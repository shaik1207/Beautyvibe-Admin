import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import API from "../utils/axios";

import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  IndianRupee,
  RefreshCw,
  TrendingUp,
  Home,
  AlertCircle,
  Scissors,
  Users,
} from "lucide-react";

const PAGE_SIZE = 8;
const REFRESH_INTERVAL = 10000; // 10 seconds background polling

const AVATAR_STYLES = [
  { background: "#FCE7D8", color: "#9C4F2E" },
  { background: "#E3EAFE", color: "#4056A1" },
  { background: "#DDF5E5", color: "#267344" },
  { background: "#F5E2FA", color: "#8742A1" },
  { background: "#FFF0BE", color: "#93690D" },
  { background: "#DDF3F5", color: "#276D78" },
  { background: "#F9DFE5", color: "#A33F5D" },
  { background: "#E8E2D8", color: "#63594B" },
];

// --- Utility Functions ---
const normalizeStatus = (status) => String(status || "Pending").trim().toLowerCase();
const isCancelled = (status) => ["cancelled", "canceled", "rejected"].includes(normalizeStatus(status));
const isConfirmed = (status) => ["confirmed", "accepted", "approved"].includes(normalizeStatus(status));
const isCompleted = (status) => ["completed", "complete", "served"].includes(normalizeStatus(status));

// Revenue is typically calculated from completed or successfully accepted bookings
const isRevenueEligible = (appointment) => isCompleted(appointment.status) || isConfirmed(appointment.status);

const getCustomerName = (appointment) =>
  appointment.user?.name || appointment.user?.username || appointment.username || appointment.customerName || appointment.name || "Unknown Customer";

const getServiceName = (appointment) =>
  appointment.serviceName || appointment.service?.name || (typeof appointment.service === "string" ? appointment.service : "") || "Salon Service";

// Bulletproof Date Parser for Charts and Daily Metrics
const getDateKey = (value, fallbackDate) => {
  const target = value || fallbackDate;
  if (!target) return "";
  
  const strVal = String(target);
  
  // YYYY-MM-DD format
  const matchYMD = strVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchYMD) return `${matchYMD[1]}-${matchYMD[2]}-${matchYMD[3]}`;
  
  // DD-MM-YYYY format
  const matchDMY = strVal.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (matchDMY) return `${matchDMY[3]}-${matchDMY[2]}-${matchDMY[1]}`;

  // JS Date fallback
  const date = new Date(target);
  if (!Number.isNaN(date.getTime())) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  }
  return "";
};

const getTodayKey = () => {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
};

const getAppointmentTimestamp = (appointment) => {
  if (appointment.createdAt) {
    const timestamp = new Date(appointment.createdAt).getTime();
    if (!Number.isNaN(timestamp)) return timestamp;
  }
  if (appointment.date) {
    const timestamp = new Date(`${appointment.date}T${appointment.time || "00:00"}:00`).getTime();
    if (!Number.isNaN(timestamp)) return timestamp;
  }
  return 0;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatTime = (value) => {
  if (!value) return "—";
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return value;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const getAvatarStyle = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_STYLES[hash % AVATAR_STYLES.length];
};

const getInitials = (name) => {
  const words = String(name || "Customer").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "C";
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join("");
};

const getStatusStyle = (status) => {
  if (isCompleted(status)) return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (isConfirmed(status)) return "bg-blue-50 text-blue-700 ring-blue-100";
  if (isCancelled(status)) return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-amber-50 text-amber-700 ring-amber-100";
};

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

// --- Subcomponents ---
function Avatar({ name, size = "md" }) {
  const style = getAvatarStyle(name);
  const sizeClass = size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${sizeClass}`}
      style={{ backgroundColor: style.background, color: style.color }}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}

function StatCard({ title, value, description, icon: Icon, iconBackground, iconColor }) {
  return (
    <motion.div variants={itemVariants} className="group rounded-2xl border border-[#F0E7E0] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#8C7A70]">{title}</p>
          <h3 className="mt-3 break-words text-2xl font-bold tracking-tight text-[#2D2623] sm:text-3xl">{value}</h3>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: iconBackground, color: iconColor }}>
          <Icon size={22} strokeWidth={1.8} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs leading-relaxed text-[#8C7A70]">{description}</span>
      </div>
    </motion.div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#F0E7E0] bg-white px-4 py-3 shadow-lg">
      <p className="text-xs font-medium text-[#8C7A70]">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="mt-1 text-sm font-bold text-[#2D2623]">{item.name}: {item.value}</p>
      ))}
    </div>
  );
}

function ChartCard({ title, subtitle, children, icon: Icon }) {
  return (
    <motion.section variants={itemVariants} className="rounded-2xl border border-[#F0E7E0] bg-white p-5 shadow-sm sm:p-6 flex flex-col">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#2D2623]">{title}</h2>
          <p className="mt-1 text-sm text-[#8C7A70]">{subtitle}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E8] text-[#C56E4E]">
          <Icon size={20} />
        </div>
      </div>
      <div className="flex-1 w-full min-h-[290px]">
        {children}
      </div>
    </motion.section>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="flex h-[270px] flex-col items-center justify-center text-center">
      <Activity size={30} className="text-[#C8B9AE]" />
      <p className="mt-3 text-sm font-medium text-[#8C7A70]">{message}</p>
    </div>
  );
}

// --- Main Dashboard ---
export default function Dashboard() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAppointments = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);

    try {
      const response = await API.get("/api/appointments");
      const payload = response.data;
      const records = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.appointments) ? payload.appointments : [];
      setAppointments(records);
      setError("");
    } catch (err) {
      console.error("Dashboard API error:", err);
      setError(
        err.response?.status === 401 || err.response?.status === 403
          ? "Admin authentication failed. Check your login and API authorization."
          : err.response?.status === 404
          ? "Appointments API not found. Check the backend route."
          : "Unable to fetch live data. Check your backend server connection."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments(true);
    const interval = setInterval(() => fetchAppointments(false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  const todayKey = getTodayKey();

  const activeAppointments = useMemo(() => appointments.filter((appointment) => !isCancelled(appointment.status)), [appointments]);

  const metrics = useMemo(() => {
    const todayAppointments = activeAppointments.filter((a) => getDateKey(a.date, a.createdAt) === todayKey);
    
    // Calculates Total Revenue across ALL eligible bookings ensuring it matches the backend Payments controller
    const totalRevenue = activeAppointments
      .filter(isRevenueEligible)
      .reduce((sum, a) => sum + (Number(a.amount || a.price) || 0), 0);
      
    const pending = activeAppointments.filter((a) => normalizeStatus(a.status) === "pending").length;
    const confirmed = activeAppointments.filter((a) => isConfirmed(a.status) || isCompleted(a.status)).length;
    const homeBookings = activeAppointments.filter((a) => String(a.type || "").toUpperCase() === "HOME").length;

    return { 
      total: activeAppointments.length, 
      todayBookings: todayAppointments.length, 
      totalRevenue, 
      pending, 
      confirmed, 
      homeBookings 
    };
  }, [activeAppointments, todayKey]);

  const popularServices = useMemo(() => {
    const counts = {};
    activeAppointments.forEach((a) => {
      const service = getServiceName(a);
      counts[service] = (counts[service] || 0) + 1;
    });
    return Object.entries(counts).map(([service, bookings]) => ({ service, bookings })).sort((a, b) => b.bookings - a.bookings).slice(0, 6);
  }, [activeAppointments]);

  const bookingActivity = useMemo(() => {
    const days = [];
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      const key = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
      days.push({ key, day: date.toLocaleDateString("en-IN", { weekday: "short" }), bookings: 0 });
    }
    const lookup = new Map(days.map((day) => [day.key, day]));
    activeAppointments.forEach((a) => {
      const day = lookup.get(getDateKey(a.date, a.createdAt));
      if (day) day.bookings += 1;
    });
    return days;
  }, [activeAppointments]);

  const sortedAppointments = useMemo(() => [...activeAppointments].sort((a, b) => getAppointmentTimestamp(b) - getAppointmentTimestamp(a)), [activeAppointments]);
  
  const totalPages = Math.max(1, Math.ceil(sortedAppointments.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const visibleAppointments = sortedAppointments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <main className="min-h-screen bg-[#FCF9F6] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px]">
        
        {/* Animated Header */}
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#C56E4E]" />
              <p className="text-xs font-bold tracking-[0.2em] text-[#C56E4E]">BEAUTYVIBE ADMIN</p>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#2D2623] sm:text-3xl">Dashboard Overview</h1>
            <p className="mt-2 text-sm text-[#8C7A70]">Your business performance, bookings and revenue.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-[#F0E7E0] bg-white px-4 py-2.5 shadow-sm">
              <p className="text-xs text-[#8C7A70]">Today</p>
              <p className="mt-1 text-sm font-semibold text-[#2D2623]">
                {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchAppointments(false)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C56E4E] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#AE5B3D] disabled:opacity-60 active:scale-95 cursor-pointer"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh data"}
            </button>
          </div>
        </motion.header>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
                <AlertCircle size={20} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Unable to refresh dashboard</p>
                  <p className="mt-1">{error}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Metrics Grid */}
        <motion.section variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Bookings" value={loading ? "—" : metrics.total} description="All non-cancelled appointments" icon={CalendarDays} iconBackground="#FFF0E8" iconColor="#C56E4E" />
          <StatCard title="Total Revenue" value={loading ? "—" : formatCurrency(metrics.totalRevenue)} description="All confirmed & completed bookings" icon={IndianRupee} iconBackground="#EAF8EE" iconColor="#1E9E4A" />
          <StatCard title="Pending Requests" value={loading ? "—" : metrics.pending} description="Awaiting appointment confirmation" icon={Clock3} iconBackground="#FFF5DF" iconColor="#B7791F" />
          <StatCard title="Home Service Bookings" value={loading ? "—" : metrics.homeBookings} description="Non-cancelled home appointments" icon={Home} iconBackground="#F1EDFF" iconColor="#7454B8" />
        </motion.section>

        {/* Secondary Metrics */}
        <motion.section variants={containerVariants} initial="hidden" animate="show" className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <motion.div variants={itemVariants} className="flex items-center gap-4 rounded-2xl border border-[#F0E7E0] bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={22} /></div>
            <div>
              <p className="text-sm text-[#8C7A70]">Confirmed / Completed</p>
              <p className="mt-1 text-2xl font-bold text-[#2D2623]">{loading ? "—" : metrics.confirmed}</p>
            </div>
          </motion.div>
          <motion.div variants={itemVariants} className="flex items-center gap-4 rounded-2xl border border-[#F0E7E0] bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF0E8] text-[#C56E4E]"><TrendingUp size={22} /></div>
            <div>
              <p className="text-sm text-[#8C7A70]">Today's Bookings</p>
              <p className="mt-1 text-2xl font-bold text-[#2D2623]">{loading ? "—" : metrics.todayBookings}</p>
            </div>
          </motion.div>
        </motion.section>

        {/* Charts Section */}
        <motion.section variants={containerVariants} initial="hidden" animate="show" className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartCard title="Popular Services" subtitle="Most booked services across your business" icon={TrendingUp}>
            {loading ? <EmptyChart message="Loading service data..." /> : popularServices.length === 0 ? <EmptyChart message="No service bookings available" /> : (
              <ResponsiveContainer width="100%" height={290}>
                <BarChart data={popularServices} margin={{ top: 8, right: 8, left: -20, bottom: 45 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0E7E0" />
                  <XAxis dataKey="service" tick={{ fill: "#8C7A70", fontSize: 11 }} axisLine={false} tickLine={false} angle={-25} textAnchor="end" interval={0} />
                  <YAxis allowDecimals={false} tick={{ fill: "#8C7A70", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} content={<ChartTooltip />} />
                  <Bar dataKey="bookings" name="Bookings" fill="#C56E4E" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Booking Activity" subtitle="Daily appointment volume over the last 7 days" icon={Activity}>
            {loading ? <EmptyChart message="Loading booking activity..." /> : (
              <ResponsiveContainer width="100%" height={290}>
                <BarChart data={bookingActivity} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0E7E0" />
                  <XAxis dataKey="day" tick={{ fill: "#8C7A70", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "#8C7A70", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} content={<ChartTooltip />} />
                  <Bar dataKey="bookings" name="Bookings" fill="#DDA58E" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </motion.section>

        {/* Recent Appointments Table Section */}
        <motion.section variants={itemVariants} initial="hidden" animate="show" className="mt-6 overflow-hidden rounded-2xl border border-[#F0E7E0] bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-[#F0E7E0] p-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h2 className="text-lg font-bold text-[#2D2623]">Recent Appointments</h2>
              <p className="mt-1 text-sm text-[#8C7A70]">Customer details, booking dates and service information</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#8C7A70]">
              <Users size={16} />
              {sortedAppointments.length} appointments
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-[#8C7A70]">
              <RefreshCw size={18} className="animate-spin" />
              Loading appointments...
            </div>
          ) : sortedAppointments.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF0E8] text-[#C56E4E]">
                <Scissors size={25} />
              </div>
              <h3 className="mt-4 font-semibold text-[#2D2623]">No appointments yet</h3>
              <p className="mt-2 max-w-sm text-sm text-[#8C7A70]">Customer bookings will appear here when available in your database.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-left">
                  <thead>
                    <tr className="bg-[#FCF9F6]">
                      {["Client", "Service", "Booking Date", "Appointment Time", "Type", "Amount", "Status"].map((heading) => (
                        <th key={heading} className="whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[#8C7A70]">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5EEE9]">
                    {visibleAppointments.map((appointment, index) => {
                      const customer = getCustomerName(appointment);
                      const status = appointment.status || "Pending";

                      return (
                        <tr key={appointment._id || appointment.id || `${index}`} className="transition hover:bg-[#FFFCFA]">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={customer} />
                              <div className="min-w-0">
                                <p className="max-w-[180px] truncate text-sm font-semibold text-[#2D2623]">{customer}</p>
                                <p className="mt-1 text-xs text-[#8C7A70]">
                                  {appointment.passCode ? `#${appointment.passCode}` : appointment._id ? `#${String(appointment._id).slice(-8)}` : "Customer"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-[#51433C]">{getServiceName(appointment)}</p>
                            {appointment.category && <p className="mt-1 text-xs text-[#8C7A70]">{appointment.category}</p>}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-[#51433C]">
                              <CalendarDays size={15} className="text-[#C56E4E]" />
                              {formatDate(appointment.date)}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            <div className="flex items-center gap-2 text-sm text-[#51433C]">
                              <Clock3 size={15} className="text-[#8C7A70]" />
                              {formatTime(appointment.time)}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold ${String(appointment.type || "").toUpperCase() === "HOME" ? "bg-violet-50 text-violet-700" : "bg-orange-50 text-orange-700"}`}>
                              {String(appointment.type || "").toUpperCase() === "HOME" ? "Home Service" : "Salon"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#2D2623]">
                            {formatCurrency(appointment.amount || appointment.price || 0)}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ring-1 ring-inset ${getStatusStyle(status)}`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col justify-between gap-4 border-t border-[#F0E7E0] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                <p className="text-sm text-[#8C7A70]">
                  Showing <span className="font-semibold text-[#2D2623]">{(currentPage - 1) * PAGE_SIZE + 1}</span> –{" "}
                  <span className="font-semibold text-[#2D2623]">{Math.min(currentPage * PAGE_SIZE, sortedAppointments.length)}</span> of{" "}
                  <span className="font-semibold text-[#2D2623]">{sortedAppointments.length}</span> appointments
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#F0E7E0] px-3 py-2 text-sm font-medium text-[#51433C] transition hover:bg-[#FCF9F6] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <span className="min-w-16 text-center text-sm font-semibold text-[#2D2623]">{currentPage} / {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#F0E7E0] px-3 py-2 text-sm font-medium text-[#51433C] transition hover:bg-[#FCF9F6] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.section>

        <footer className="py-6 text-center text-xs text-[#A39185]">
          BeautyVibe Admin · Live appointment data · INR
        </footer>
      </div>
    </main>
  );
}