import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AnimatePresence, motion } from "framer-motion";
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode";
import { io } from "socket.io-client";
import API from "../utils/axios";

import {
  Activity,
  AlertCircle,
  ArrowDownUp,
  CalendarDays,
  CalendarCheck,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Filter,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
  QrCode,
  ScanLine,
  ChevronFirst,
  ChevronLast,
} from "lucide-react";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const PAGE_SIZE = 10;

const FILTERS = [
  "All",
  "Pending",
  "Accepted",
  "Completed",
  "Rejected",
];

const STATUS_STYLES = {
  Pending: "bg-amber-50 text-amber-700 ring-amber-200",
  Accepted: "bg-blue-50 text-blue-700 ring-blue-200",
  Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 ring-rose-200",
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const getInitials = (name = "Customer") =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "CU";

const formatDate = (date, time) => {
  if (!date) return "Date not available";

  const parsed = new Date(`${date}T${time || "00:00"}`);

  if (Number.isNaN(parsed.getTime())) {
    return `${date}${time ? ` · ${time}` : ""}`;
  }

  const formatted = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);

  return `${formatted}${time ? ` · ${time}` : ""}`;
};

/**
 * Foolproof extraction of the real customer name regardless of backend shape.
 */
function getCustomerDetails(item) {
  if (typeof item.customer === "string") return { name: item.customer, avatar: item.avatar || "" };
  if (typeof item.user === "string") return { name: item.user, avatar: item.avatar || "" };

  const u = item.user || {};
  const c = item.customer || item.customerDetails || {};

  const name =
    u.name ||
    u.fullName ||
    c.name ||
    c.fullName ||
    item.customerName ||
    item.userName ||
    item.name ||
    [item.firstName, item.lastName].filter(Boolean).join(" ") ||
    "Client";

  const avatar = u.avatar || c.avatar || item.avatar || "";

  return {
    name: name.trim(),
    avatar,
  };
}

function normalizeAppointment(item) {
  const customer = getCustomerDetails(item);
  const rawId = item._id || item.appointmentId || item.id || "";
  const stringId = String(rawId);

  return {
    _id: rawId,
    id:
      item.passCode ||
      item.bookingCode ||
      (stringId.length >= 6 ? stringId.slice(-6).toUpperCase() : stringId.toUpperCase()) ||
      "Booking",
    passCode: item.passCode || item.requestId || "",
    customer: customer.name,
    avatar: customer.avatar,
    service:
      item.serviceName ||
      item.service?.name ||
      item.service?.serviceName ||
      "Beauty Service",
    type: item.type || "SALON",
    date: item.date || "",
    time: item.time || "",
    datetime: formatDate(item.date, item.time),
    amount: Number(item.amount ?? item.price ?? 0),
    status: item.status || "Pending",
    assignedStaff: item.assignedStaff || item.staff || "",
    createdAt: item.createdAt || null,
  };
}

const pageVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      staggerChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22 },
  },
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
        STATUS_STYLES[status] ||
        "bg-stone-50 text-stone-600 ring-stone-200"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function CustomerAvatar({ appointment }) {
  if (appointment.avatar) {
    return (
      <img
        src={appointment.avatar}
        alt={appointment.customer}
        className="h-10 w-10 shrink-0 rounded-full border border-[#EEE7E2] bg-[#F8F1EC] object-cover"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#EBDAD0] bg-[#FAEEE7] text-xs font-semibold text-[#A85E40]">
      {getInitials(appointment.customer)}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, description, iconStyle }) {
  return (
    <motion.div
      variants={itemVariants}
      className="rounded-2xl border border-[#EEE7E2] bg-white p-4 shadow-[0_2px_12px_rgba(49,36,28,0.025)] transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#8D7F75]">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[#302722] sm:text-[28px]">
            {value}
          </p>
          <p className="mt-1.5 text-[11px] leading-4 text-[#A09288]">{description}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}>
          <Icon size={19} strokeWidth={1.8} />
        </div>
      </div>
    </motion.div>
  );
}

function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange }) {
  if (totalItems === 0) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const visiblePages = [];
  let firstPage = Math.max(1, currentPage - 2);
  let lastPage = Math.min(totalPages, firstPage + 4);
  firstPage = Math.max(1, lastPage - 4);

  for (let page = firstPage; page <= lastPage; page += 1) {
    visiblePages.push(page);
  }

  const buttonBase =
    "flex h-9 min-w-9 items-center justify-center rounded-lg border text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <div className="flex flex-col gap-3 border-t border-[#F0EAE5] bg-[#FCFBFA] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-[11px] text-[#8D7F75]">
        Showing{" "}
        <span className="font-semibold text-[#51443B]">
          {start}–{end}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-[#51443B]">
          {totalItems}
        </span>{" "}
        appointments
      </p>

      <nav aria-label="Appointments pagination" className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(1)}
          aria-label="First page"
          className={`${buttonBase} border-[#EEE7E2] bg-white px-2 text-[#796B62] hover:bg-[#F7F1EC]`}
        >
          <ChevronFirst size={15} />
        </button>

        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
          className={`${buttonBase} gap-1 border-[#EEE7E2] bg-white px-2.5 text-[#796B62] hover:bg-[#F7F1EC]`}
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {firstPage > 1 && <span className="px-1 text-xs text-[#A09288]">…</span>}

        {visiblePages.map((page) => (
          <button
            type="button"
            key={page}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
            onClick={() => onPageChange(page)}
            className={`${buttonBase} ${
              page === currentPage
                ? "border-[#302722] bg-[#302722] text-white shadow-sm"
                : "border-[#EEE7E2] bg-white text-[#796B62] hover:bg-[#F7F1EC]"
            }`}
          >
            {page}
          </button>
        ))}

        {lastPage < totalPages && <span className="px-1 text-xs text-[#A09288]">…</span>}

        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
          className={`${buttonBase} gap-1 border-[#EEE7E2] bg-white px-2.5 text-[#796B62] hover:bg-[#F7F1EC]`}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={14} />
        </button>

        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(totalPages)}
          aria-label="Last page"
          className={`${buttonBase} border-[#EEE7E2] bg-white px-2 text-[#796B62] hover:bg-[#F7F1EC]`}
        >
          <ChevronLast size={15} />
        </button>
      </nav>
    </div>
  );
}

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortNewest, setSortNewest] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [socketConnected, setSocketConnected] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  const fetchStaffMembers = useCallback(async () => {
    try {
      const res = await API.get("/api/staff");
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const formattedStaff = list.map((s) => `${s.firstName || ""} ${s.lastName || ""} (${s.role || "Expert"})`.trim());
        setStaffList(formattedStaff);
      } else {
        setStaffList([
          "Sameer Shaik (Senior Aesthetician)",
          "Ananya Rao (Master Hair Stylist)",
          "Pooja Hegde (Spa & Massage Expert)",
        ]);
      }
    } catch (err) {
      setStaffList([
        "Sameer Shaik (Senior Aesthetician)",
        "Ananya Rao (Master Hair Stylist)",
        "Pooja Hegde (Spa & Massage Expert)",
      ]);
    }
  }, []);

  const fetchAppointments = useCallback(
    async (quiet = false) => {
      try {
        if (quiet) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await API.get("/api/appointments");
        const raw =
          response.data?.data ||
          response.data?.appointments ||
          response.data ||
          [];

        if (!Array.isArray(raw)) {
          throw new Error("The appointments API did not return an array.");
        }

        setAppointments(raw.map(normalizeAppointment));
      } catch (error) {
        console.error("Failed to fetch appointments:", error);
        showToast(
          error.response?.status === 401
            ? "Authentication required. Please sign in again."
            : "Unable to load appointments. Check your API connection.",
          "error"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    fetchAppointments();
    fetchStaffMembers();

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("newAppointment", (booking) => {
      const formatted = normalizeAppointment(booking);
      setAppointments((current) => {
        if (formatted._id && current.some((item) => item._id === formatted._id)) {
          return current;
        }
        return [formatted, ...current];
      });
      showToast(`New booking received: ${formatted.id}`);
    });

    socket.on("appointmentUpdated", (updated) => {
      setAppointments((current) =>
        current.map((item) => {
          const sameId = item._id && updated._id && String(item._id) === String(updated._id);
          const samePass = item.passCode && updated.passCode && item.passCode === updated.passCode;

          if (!sameId && !samePass) return item;

          const normalized = normalizeAppointment({
            ...item,
            ...updated,
            user: updated.user || {
              name: item.customer,
              avatar: item.avatar,
            },
          });

          return {
            ...item,
            ...normalized,
            status: updated.status || item.status,
            assignedStaff: updated.assignedStaff ?? item.assignedStaff,
          };
        })
      );
    });

    return () => {
      socket.disconnect();
      clearTimeout(toastTimer.current);
    };
  }, [fetchAppointments, fetchStaffMembers, showToast]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayString = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");

    const todayAppointments = appointments.filter((item) => item.date === todayString);

    return {
      total: appointments.length,
      pending: appointments.filter((item) => item.status === "Pending").length,
      accepted: appointments.filter((item) => item.status === "Accepted").length,
      todayRevenue: todayAppointments
        .filter((item) => item.status === "Completed")
        .reduce((sum, item) => sum + item.amount, 0),
    };
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const result = appointments.filter((item) => {
      const matchesFilter = filter === "All" || item.status === filter;
      const searchableText = [
        item.customer,
        item.id,
        item.passCode,
        item.service,
        item.assignedStaff,
        item.type,
      ]
        .join(" ")
        .toLowerCase();

      return matchesFilter && searchableText.includes(query);
    });

    return result.sort((a, b) => {
      const dateA = new Date(a.createdAt || `${a.date}T${a.time || "00:00"}`).getTime();
      const dateB = new Date(b.createdAt || `${b.date}T${b.time || "00:00"}`).getTime();
      return sortNewest ? dateB - dateA : dateA - dateB;
    });
  }, [appointments, filter, searchQuery, sortNewest]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery, sortNewest]);

  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedAppointments = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredAppointments.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredAppointments, currentPage]);

  const updateStatus = async (booking, status) => {
    if (!booking._id) {
      showToast("Booking database ID is missing.", "error");
      return;
    }

    setActionLoading(booking._id);

    try {
      await API.patch(`/api/appointments/${booking._id}/status`, { status });

      setAppointments((current) =>
        current.map((item) => (item._id === booking._id ? { ...item, status } : item))
      );

      showToast(
        status === "Accepted"
          ? "Booking accepted. You can now assign an expert."
          : status === "Rejected"
            ? "Booking rejected successfully."
            : "Service marked as completed."
      );
    } catch (error) {
      console.error("Status update failed:", error);
      showToast(error.response?.data?.message || "Could not update booking status.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const assignStaff = async (booking, staffName) => {
    if (!booking._id) {
      showToast("Booking database ID is missing.", "error");
      return;
    }

    setActionLoading(booking._id);

    try {
      await API.patch(`/api/appointments/${booking._id}/assign-staff`, { assignedStaff: staffName });

      setAppointments((current) =>
        current.map((item) => (item._id === booking._id ? { ...item, assignedStaff: staffName } : item))
      );

      setOpenDropdownId(null);
      showToast("Expert assigned successfully. QR scan pass is now unlocked.");
    } catch (error) {
      console.error("Staff assignment failed:", error);
      showToast(error.response?.data?.message || "Unable to assign staff.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const openScanner = (booking) => {
    setActiveBooking(booking);
    setScannerOpen(true);
  };

  const handleVerifiedScan = async (decodedText) => {
    if (!activeBooking) return;

    let scannedValue = decodedText.trim();

    try {
      const parsed = JSON.parse(decodedText);
      if (parsed && typeof parsed === "object") {
        scannedValue =
          parsed.passCode ||
          parsed.ticketId ||
          parsed.bookingId ||
          parsed.id ||
          parsed.code ||
          decodedText.trim();
      }
    } catch {
      // Plain text QR codes are supported.
    }

    const matches = [
      activeBooking.passCode,
      activeBooking.id,
      activeBooking._id,
    ].some((identifier) => identifier && String(identifier).toLowerCase() === String(scannedValue).toLowerCase());

    if (!matches) {
      showToast("QR code does not match this booking.", "error");
      return;
    }

    if (activeBooking.status !== "Accepted") {
      showToast("Only accepted bookings can be verified.", "error");
      return;
    }

    if (!activeBooking._id) {
      showToast("Booking database ID is missing.", "error");
      return;
    }

    setActionLoading(activeBooking._id);

    try {
      await API.patch(`/api/appointments/${activeBooking._id}/status`, { status: "Completed" });

      setAppointments((current) =>
        current.map((item) => (item._id === activeBooking._id ? { ...item, status: "Completed" } : item))
      );

      setScannerOpen(false);
      showToast("QR verified successfully. Service marked as completed.");
    } catch (error) {
      console.error("QR verification update failed:", error);
      showToast(error.response?.data?.message || "QR matched, but the server could not complete the booking.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen min-w-0 bg-[#FAF8F6] pb-10 text-[#302722]">
      <motion.main
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-[1600px] space-y-6 px-4 pb-10 pt-5 sm:px-6 sm:pt-7 lg:px-8"
      >
        <motion.header variants={itemVariants} className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#EDE1D9] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[1.6px] text-[#A7684D]">
              <Sparkles size={13} />
              Operations
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-[#302722] sm:text-3xl">
              Appointments
            </h1>

            <p className="mt-1.5 max-w-xl text-xs leading-5 text-[#8D7F75] sm:text-sm">
              Manage bookings, coordinate your experts, and verify customer passes in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#EDE7E2] bg-white px-3 text-xs text-[#6F6259]">
              <span className="relative flex h-2.5 w-2.5">
                {socketConnected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${socketConnected ? "bg-emerald-500" : "bg-amber-400"}`} />
              </span>
              {socketConnected ? "Live connected" : "Connecting"}
            </div>

            <button
              type="button"
              onClick={() => fetchAppointments(true)}
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#EDE7E2] bg-white px-3.5 text-xs font-medium text-[#6F6259] transition hover:border-[#D9B8A5] hover:text-[#B46546] disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </motion.header>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            icon={CalendarCheck}
            label="Total bookings"
            value={stats.total}
            description="All recorded appointments"
            iconStyle="bg-[#F9EDE5] text-[#B66B4B]"
          />
          <StatCard
            icon={Clock3}
            label="Awaiting action"
            value={stats.pending}
            description="Pending approval"
            iconStyle="bg-amber-50 text-amber-600"
          />
          <StatCard
            icon={Activity}
            label="Accepted bookings"
            value={stats.accepted}
            description="Ready for service"
            iconStyle="bg-blue-50 text-blue-600"
          />
          <StatCard
            icon={CreditCard}
            label="Today's revenue"
            value={formatCurrency(stats.todayRevenue)}
            description="Completed appointments dated today"
            iconStyle="bg-emerald-50 text-emerald-600"
          />
        </section>

        <motion.section
          variants={itemVariants}
          className="overflow-visible rounded-2xl border border-[#EEE7E2] bg-white shadow-[0_4px_24px_rgba(49,36,28,0.025)]"
        >
          <div className="space-y-4 border-b border-[#F0EAE5] p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-base font-semibold text-[#302722]">Booking management</h2>
                <p className="mt-1 text-xs text-[#96877D]">
                  {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? "s" : ""} found
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-[#EDE7E2] bg-[#FCFBFA] px-3 sm:w-[280px]">
                  <Search size={16} className="shrink-0 text-[#A09288]" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search customer, ID or service..."
                    className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[#B1A49A]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                      className="text-[#A09288] hover:text-[#302722]"
                    >
                      <X size={14} />
                    </button>
                  )}
                </label>

                <button
                  type="button"
                  onClick={() => setSortNewest((value) => !value)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#EDE7E2] bg-white px-3 text-xs text-[#6F6259] transition hover:bg-[#FAF8F6]"
                >
                  <ArrowDownUp size={14} />
                  {sortNewest ? "Newest first" : "Oldest first"}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Filter size={15} className="mr-1 shrink-0 text-[#A09288]" />
              {FILTERS.map((tab) => {
                const count =
                  tab === "All"
                    ? appointments.length
                    : appointments.filter((item) => item.status === tab).length;

                return (
                  <button
                    type="button"
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                      filter === tab
                        ? "bg-[#302722] text-white shadow-sm"
                        : "border border-[#EEE7E2] bg-white text-[#796B62] hover:bg-[#FAF8F6]"
                    }`}
                  >
                    {tab}
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                        filter === tab ? "bg-white/15 text-white" : "bg-[#F4F0EC] text-[#8D7F75]"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop Table View (Added pb-32 to prevent drawer clipping) */}
          <div className="hidden overflow-x-auto overflow-y-visible md:block pb-32">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#F0EAE5] bg-[#FCFBFA] text-[10px] font-semibold uppercase tracking-[1.1px] text-[#9B8D83]">
                  <th className="px-5 py-4 w-[15%]">Booking</th>
                  <th className="px-4 py-4 w-[20%]">Customer</th>
                  <th className="px-4 py-4 w-[20%]">Service</th>
                  <th className="px-4 py-4 w-[15%]">Schedule</th>
                  <th className="px-4 py-4 w-[10%]">Status</th>
                  <th className="px-4 py-4 w-[20%]">Assigned expert</th>
                  <th className="px-5 py-4 w-[15%] text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F2EDE9]">
                {loading && appointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-20">
                      <div className="flex flex-col items-center justify-center gap-3 text-center">
                        <RefreshCw size={24} className="animate-spin text-[#C56E4E]" />
                        <p className="text-sm text-[#8D7F75]">Loading appointments...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-20">
                      <div className="flex flex-col items-center justify-center text-center">
                        <CalendarDays size={25} className="text-[#B66B4B]" />
                        <p className="mt-4 text-sm font-semibold text-[#302722]">No appointments found</p>
                        <p className="mt-1 max-w-sm text-xs leading-5 text-[#9B8D83]">Try another filter or search term.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {paginatedAppointments.map((booking) => {
                      const isPending = booking.status === "Pending";
                      const isAccepted = booking.status === "Accepted";
                      const isCompleted = booking.status === "Completed";
                      const isRejected = booking.status === "Rejected";

                      return (
                        <motion.tr
                          layout
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          key={booking._id || booking.id}
                          className={`group transition-colors hover:bg-[#FCFAF8] relative ${openDropdownId === booking._id ? "z-50" : "z-0"}`}
                        >
                          <td className="px-5 py-4 align-middle">
                            <p className="font-mono text-xs font-semibold text-[#302722]">{booking.id}</p>
                            <p className="mt-1 text-[10px] text-[#A09288]">
                              {booking.type === "HOME" ? "Home service" : "Salon visit"}
                            </p>
                          </td>

                          <td className="px-4 py-4 align-middle">
                            <div className="flex items-center gap-3">
                              <CustomerAvatar appointment={booking} />
                              <div className="min-w-0">
                                <p className="max-w-[160px] truncate text-xs font-semibold text-[#302722]" title={booking.customer}>
                                  {booking.customer}
                                </p>
                                <p className="mt-1 text-[11px] text-[#A09288]">{formatCurrency(booking.amount)}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-middle">
                            <p className="max-w-[170px] truncate text-xs font-medium text-[#51443B]" title={booking.service}>{booking.service}</p>
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[#A09288]">
                              {booking.type === "HOME" ? <MapPin size={11} /> : <Sparkles size={11} />}
                              {booking.type === "HOME" ? "At home" : "In salon"}
                            </div>
                          </td>

                          <td className="px-4 py-4 align-middle">
                            <div className="flex items-center gap-2 text-xs text-[#62564D]">
                              <CalendarDays size={14} className="shrink-0 text-[#B66B4B]" />
                              <span className="whitespace-nowrap">{booking.datetime}</span>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-middle">
                            <StatusBadge status={booking.status} />
                          </td>

                          <td className="px-4 py-4 align-middle">
                            {isPending ? (
                              <span className="text-[11px] text-[#A09288]">-</span>
                            ) : isCompleted ? (
                              <span className="inline-flex max-w-[190px] items-center gap-1.5 text-xs text-emerald-700">
                                <ShieldCheck size={14} />
                                <span className="truncate">{booking.assignedStaff || "Unassigned"}</span>
                              </span>
                            ) : isRejected ? (
                              <span className="text-[11px] text-[#A09288]">-</span>
                            ) : (
                              // isAccepted Workflow: Assign Expert
                              <div className="relative w-full max-w-[200px]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenDropdownId(openDropdownId === booking._id ? null : booking._id)
                                  }
                                  disabled={actionLoading === booking._id}
                                  className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-[#EEE4DC] bg-white px-3 text-left text-[11px] text-[#67574D] transition hover:border-[#D6B5A2]"
                                >
                                  <span className="truncate">{booking.assignedStaff || "Assign Expert"}</span>
                                  <ChevronDown size={14} />
                                </button>

                                <AnimatePresence>
                                  {openDropdownId === booking._id && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                                      className="absolute left-0 top-full mt-2 w-[260px] rounded-xl border border-[#EEE7E2] bg-white p-2 shadow-xl"
                                    >
                                      <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-[#A09288]">
                                        SELECT REAL EXPERT
                                      </p>
                                      {staffList.map((staff) => (
                                        <button
                                          type="button"
                                          key={staff}
                                          onClick={() => assignStaff(booking, staff)}
                                          className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-left text-[11px] text-[#67574D] transition hover:bg-[#FAF3EE] hover:text-[#AD6243]"
                                        >
                                          <span>{staff}</span>
                                          {booking.assignedStaff === staff && <Check size={14} />}
                                        </button>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right align-middle">
                            {isPending && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateStatus(booking, "Accepted")}
                                  disabled={actionLoading === booking._id}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-50 px-2.5 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-600 hover:text-white disabled:opacity-50"
                                >
                                  <Check size={13} />
                                  Accept
                                </button>

                                <button
                                  type="button"
                                  onClick={() => updateStatus(booking, "Rejected")}
                                  disabled={actionLoading === booking._id}
                                  title="Reject booking"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition hover:bg-rose-600 hover:text-white disabled:opacity-50"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            )}

                            {isAccepted && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openScanner(booking)}
                                  disabled={!booking.assignedStaff}
                                  title={!booking.assignedStaff ? "Assign an expert first to unlock scanner" : "Scan customer pass"}
                                  className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-medium transition ${
                                    booking.assignedStaff
                                      ? "bg-[#302722] text-white hover:bg-[#B66B4B] shadow-sm cursor-pointer"
                                      : "bg-[#EADBD2] text-[#8D7F75] cursor-not-allowed opacity-60"
                                  }`}
                                >
                                  <QrCode size={14} />
                                  Scan Pass
                                </button>
                              </div>
                            )}

                            {isCompleted && (
                              <span className="inline-flex items-center justify-end gap-1.5 w-full text-[11px] font-medium text-emerald-700">
                                <CheckCircle2 size={14} />
                                Service completed
                              </span>
                            )}

                            {isRejected && (
                              <span className="text-[11px] text-rose-600 block w-full text-right">Rejected</span>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="space-y-3 p-3 md:hidden sm:p-4">
            {loading && appointments.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#8D7F75]">
                <RefreshCw size={17} className="animate-spin" />
                Loading appointments...
              </div>
            ) : paginatedAppointments.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <CalendarDays size={25} className="mx-auto text-[#B66B4B]" />
                <p className="mt-3 text-sm font-semibold">No appointments found</p>
                <p className="mt-1 text-xs text-[#96877D]">Try changing your search or filter.</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {paginatedAppointments.map((booking) => {
                  const isPending = booking.status === "Pending";
                  const isAccepted = booking.status === "Accepted";
                  const isCompleted = booking.status === "Completed";
                  const isRejected = booking.status === "Rejected";

                  return (
                    <motion.article
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      key={booking._id || booking.id}
                      className="rounded-xl border border-[#EEE7E2] bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <CustomerAvatar appointment={booking} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#302722]">{booking.customer}</p>
                            <p className="mt-1 truncate font-mono text-[10px] text-[#A09288]">{booking.id}</p>
                          </div>
                        </div>
                        <StatusBadge status={booking.status} />
                      </div>

                      <div className="my-4 h-px bg-[#F1ECE7]" />

                      <div className="grid grid-cols-2 gap-4">
                        <div className="min-w-0">
                          <p className="text-[10px] text-[#A09288]">Service</p>
                          <p className="mt-1 truncate text-xs font-medium text-[#51443B]">{booking.service}</p>
                          <p className="mt-1 text-[10px] text-[#A09288]">
                            {booking.type === "HOME" ? "Home service" : "Salon visit"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-[#A09288]">Amount</p>
                          <p className="mt-1 text-sm font-semibold text-[#302722]">{formatCurrency(booking.amount)}</p>
                        </div>

                        <div className="col-span-2">
                          <p className="text-[10px] text-[#A09288]">Schedule</p>
                          <p className="mt-1 flex items-center gap-2 text-xs text-[#67574D]">
                            <CalendarDays size={14} className="shrink-0 text-[#B66B4B]" />
                            {booking.datetime}
                          </p>
                        </div>

                        {booking.assignedStaff && (
                          <div className="col-span-2">
                            <p className="text-[10px] text-[#A09288]">Assigned expert</p>
                            <p className="mt-1 text-xs font-medium text-[#67574D]">{booking.assignedStaff}</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-[#F1ECE7] pt-3">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateStatus(booking, "Accepted")}
                              disabled={actionLoading === booking._id}
                              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 text-xs font-medium text-emerald-700 transition hover:bg-emerald-600 hover:text-white disabled:opacity-50"
                            >
                              <Check size={14} />
                              Accept
                            </button>

                            <button
                              type="button"
                              onClick={() => updateStatus(booking, "Rejected")}
                              disabled={actionLoading === booking._id}
                              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-rose-50 px-3 text-xs font-medium text-rose-600 transition hover:bg-rose-600 hover:text-white disabled:opacity-50"
                            >
                              <X size={14} />
                              Reject
                            </button>
                          </>
                        )}

                        {isAccepted && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setOpenDropdownId(openDropdownId === booking._id ? null : booking._id)
                              }
                              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-[#EEE7E2] px-3 text-xs text-[#67574D]"
                            >
                              <Users size={14} />
                              {booking.assignedStaff ? "Change Staff" : "Assign Staff"}
                            </button>

                            <button
                              type="button"
                              onClick={() => openScanner(booking)}
                              disabled={!booking.assignedStaff}
                              className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium transition ${
                                booking.assignedStaff
                                  ? "bg-[#302722] text-white hover:bg-[#B66B4B]"
                                  : "cursor-not-allowed bg-stone-200 text-stone-500"
                              }`}
                            >
                              <QrCode size={15} />
                              Scan QR
                            </button>
                          </>
                        )}

                        {isCompleted && (
                          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                            <CheckCircle2 size={15} />
                            Service completed
                          </div>
                        )}

                        {isRejected && (
                          <div className="text-xs text-rose-600">This appointment was rejected.</div>
                        )}
                      </div>

                      {isAccepted && openDropdownId === booking._id && (
                        <div className="mt-3 rounded-xl border border-[#EEE7E2] bg-[#FCFBFA] p-2">
                          <p className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#A09288]">
                            SELECT REAL EXPERT
                          </p>
                          {staffList.map((staff) => (
                            <button
                              type="button"
                              key={staff}
                              onClick={() => assignStaff(booking, staff)}
                              className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-left text-[11px] text-[#67574D] hover:bg-[#F8EFE8]"
                            >
                              {staff}
                              {booking.assignedStaff === staff && <Check size={14} />}
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {!loading && filteredAppointments.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAppointments.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          )}

          <div className="flex flex-col gap-2 border-t border-[#F0EAE5] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-[11px] text-[#9B8D83]">
              {filteredAppointments.length} filtered · {appointments.length} total appointments
            </p>
            <p className="flex items-center gap-1.5 text-[10px] text-[#9B8D83]">
              <Activity size={12} />
              {socketConnected ? "Real-time updates active" : "Waiting for live connection"}
            </p>
          </div>
        </motion.section>
      </motion.main>

      <AnimatePresence>
        {scannerOpen && activeBooking && (
          <QRScannerModal
            key={activeBooking._id || activeBooking.id}
            booking={activeBooking}
            onClose={() => setScannerOpen(false)}
            onVerified={handleVerifiedScan}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            className={`fixed bottom-5 left-1/2 z-[120] flex w-[calc(100%-32px)] max-w-md -translate-x-1/2 items-center gap-3 rounded-xl border px-4 py-3.5 shadow-xl sm:bottom-7 ${
              toast.type === "error" ? "border-rose-200 bg-white text-rose-700" : "border-emerald-200 bg-white text-[#355D43]"
            }`}
          >
            {toast.type === "error" ? <AlertCircle size={18} className="shrink-0" /> : <CheckCircle2 size={18} className="shrink-0" />}
            <p className="text-xs font-medium leading-5">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-auto shrink-0 opacity-60 hover:opacity-100"
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QRScannerModal({ booking, onClose, onVerified }) {
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cameraList, setCameraList] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [scanMessage, setScanMessage] = useState("Position the booking QR code inside the frame.");

  const scannerRef = useRef(null);
  const elementId = useRef(`beautyvibe-qr-${Math.random().toString(36).slice(2)}`);
  const processingRef = useRef(false);
  const mountedRef = useRef(true);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch (error) {
      console.warn("Scanner stop:", error);
    }

    try {
      scanner.clear();
    } catch {}

    scannerRef.current = null;
    if (mountedRef.current) {
      setScanning(false);
    }
  }, []);

  const startScanner = useCallback(
    async (cameraId) => {
      if (scannerRef.current) return;

      setCameraError("");
      setCameraReady(false);
      setScanMessage("Starting camera...");

      try {
        const scanner = new Html5Qrcode(elementId.current, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });

        scannerRef.current = scanner;

        await scanner.start(
          cameraId ? cameraId : { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.max(150, Math.floor(Math.min(width, height) * 0.7));
              return {
                width: Math.min(250, size),
                height: Math.min(250, size),
              };
            },
            aspectRatio: 1,
            disableFlip: false,
          },
          async (decodedText) => {
            if (processingRef.current) return;
            processingRef.current = true;

            if (mountedRef.current) {
              setProcessing(true);
              setScanMessage("QR detected. Verifying booking...");
            }

            try {
              await stopScanner();
              await onVerified(decodedText);
            } catch (error) {
              console.error("QR verification callback failed:", error);
            } finally {
              if (mountedRef.current) {
                setProcessing(false);
              }
            }
          },
          () => {}
        );

        if (mountedRef.current) {
          setCameraReady(true);
          setScanning(true);
          setScanMessage("Camera active. Scan the customer's QR pass.");
        }
      } catch (error) {
        console.error("Unable to start scanner:", error);
        scannerRef.current = null;

        if (!mountedRef.current) return;

        setCameraError(
          error?.name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access in your browser settings."
            : error?.name === "NotFoundError"
              ? "No camera was found on this device."
              : error?.name === "NotReadableError"
                ? "The camera is being used by another application."
                : "Could not start the camera. Use HTTPS or localhost and allow camera access."
        );
        setScanMessage("Camera could not be started.");
      }
    },
    [onVerified, stopScanner]
  );

  useEffect(() => {
    mountedRef.current = true;

    const initialize = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!mountedRef.current) return;
        setCameraList(cameras || []);

        const backCamera =
          cameras?.find((camera) => /back|rear|environment/i.test(camera.label)) || cameras?.[0];

        if (backCamera) {
          setSelectedCamera(backCamera.id);
          await startScanner(backCamera.id);
        } else {
          await startScanner("");
        }
      } catch (error) {
        if (!mountedRef.current) return;
        console.error("Camera initialization failed:", error);
        await startScanner("");
      }
    };

    initialize();

    return () => {
      mountedRef.current = false;
      const scanner = scannerRef.current;
      if (scanner) {
        if (scanner.isScanning) {
          scanner.stop().catch(() => {}).finally(() => {
            try { scanner.clear(); } catch {}
          });
        } else {
          try { scanner.clear(); } catch {}
        }
        scannerRef.current = null;
      }
    };
  }, [startScanner]);

  const changeCamera = async (event) => {
    const cameraId = event.target.value;
    await stopScanner();
    processingRef.current = false;
    setProcessing(false);
    setSelectedCamera(cameraId);

    window.setTimeout(() => {
      if (mountedRef.current) {
        startScanner(cameraId);
      }
    }, 200);
  };

  const restartScanner = async () => {
    await stopScanner();
    processingRef.current = false;
    setProcessing(false);
    setCameraError("");

    window.setTimeout(() => {
      if (mountedRef.current) {
        startScanner(selectedCamera);
      }
    }, 200);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[#241B17]/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.section
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.22 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scanner-title"
        className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-[24px] border border-[#EEE7E2] bg-white shadow-2xl sm:rounded-[24px]"
      >
        <div className="flex items-center justify-between border-b border-[#F0EAE5] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#302722] text-white">
              <QrCode size={20} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#B66B4B]">
                BeautyVibe verification
              </p>
              <h2 id="scanner-title" className="mt-0.5 text-base font-semibold text-[#302722]">
                Scan booking pass
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#EEE7E2] text-[#8D7F75] transition hover:bg-[#FAF8F6] hover:text-[#302722]"
            aria-label="Close scanner"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pt-5 sm:px-6">
          <div className="flex items-center gap-3 rounded-xl border border-[#EEE7E2] bg-[#FCFBFA] p-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F8EDE5] text-[#AD6546]">
              <UserRound size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#302722]">{booking.customer}</p>
              <p className="mt-1 truncate text-[11px] text-[#8D7F75]">
                {booking.service} · {booking.id}
              </p>
            </div>
            <StatusBadge status={booking.status} />
          </div>
        </div>

        <div className="px-5 pt-5 sm:px-6">
          <div className="overflow-hidden rounded-2xl border border-[#3A302A] bg-[#211B18] p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-[10px] font-medium text-white/75">
                <span className={`h-2 w-2 rounded-full ${cameraReady ? "animate-pulse bg-emerald-400" : "bg-amber-400"}`} />
                {cameraReady ? "Camera is active" : "Connecting camera"}
              </div>
              <span className="text-[10px] text-white/50">QR READER</span>
            </div>

            <div className="relative min-h-[260px] overflow-hidden rounded-xl bg-[#171310]">
              <div id={elementId.current} className="qr-reader-beautyvibe h-full w-full overflow-hidden" />

              {cameraReady && !processing && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                  <div className="relative h-[190px] w-[190px] max-w-[80%]">
                    <span className="absolute left-0 top-0 h-7 w-7 rounded-tl-xl border-l-[3px] border-t-[3px] border-[#E2B08F]" />
                    <span className="absolute right-0 top-0 h-7 w-7 rounded-tr-xl border-r-[3px] border-t-[3px] border-[#E2B08F]" />
                    <span className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-xl border-b-[3px] border-l-[3px] border-[#E2B08F]" />
                    <span className="absolute bottom-0 right-0 h-7 w-7 rounded-br-xl border-b-[3px] border-r-[3px] border-[#E2B08F]" />

                    <motion.div
                      animate={{ top: ["8%", "92%", "8%"] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                      className="absolute left-2 right-2 h-[2px] bg-[#E2B08F] shadow-[0_0_12px_rgba(226,176,143,0.9)]"
                    />
                  </div>
                </div>
              )}

              {processing && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#211B18]/90 text-center">
                  <RefreshCw size={27} className="animate-spin text-[#E2B08F]" />
                  <p className="mt-3 text-sm font-medium text-white">Verifying pass...</p>
                </div>
              )}
            </div>

            <p className="px-1 pb-1 pt-3 text-center text-[11px] leading-5 text-white/65">{scanMessage}</p>
          </div>

          {cameraError && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-rose-800">Camera unavailable</p>
                  <p className="mt-1 text-[11px] leading-5 text-rose-700">{cameraError}</p>
                  <button
                    type="button"
                    onClick={restartScanner}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-800 underline underline-offset-2"
                  >
                    <RefreshCw size={12} /> Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {cameraList.length > 1 && (
            <label className="mt-3 block">
              <span className="mb-1.5 block text-[11px] font-medium text-[#8D7F75]">Camera source</span>
              <select
                value={selectedCamera}
                onChange={changeCamera}
                className="h-10 w-full rounded-xl border border-[#EEE7E2] bg-white px-3 text-xs text-[#51443B] outline-none focus:border-[#C89A80]"
              >
                {cameraList.map((camera, index) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#EEE7E2] p-3">
              <p className="text-[10px] text-[#9B8D83]">Appointment date</p>
              <p className="mt-1.5 text-xs font-medium text-[#51443B]">{booking.datetime}</p>
            </div>
            <div className="rounded-xl border border-[#EEE7E2] p-3">
              <p className="text-[10px] text-[#9B8D83]">Booking amount</p>
              <p className="mt-1.5 text-xs font-semibold text-[#302722]">{formatCurrency(booking.amount)}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-3 border-t border-[#F0EAE5] px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-[#E9E1DA] text-xs font-medium text-[#67574D] transition hover:bg-[#FAF8F6]"
          >
            Close scanner
          </button>
          <div className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#302722] text-xs font-medium text-white">
            {processing ? <RefreshCw size={15} className="animate-spin" /> : cameraReady ? <ScanLine size={15} className="text-[#E2B08F]" /> : <Camera size={15} />}
            {processing ? "Verifying..." : scanning ? "Scanning live" : "Starting camera"}
          </div>
        </div>
      </motion.section>

      <style>{`
        .qr-reader-beautyvibe video {
          width: 100% !important;
          height: auto !important;
          min-height: 260px;
          max-height: 360px;
          object-fit: cover;
          border-radius: 12px;
        }
        .qr-reader-beautyvibe canvas,
        .qr-reader-beautyvibe img {
          display: none !important;
        }
        #${elementId.current}__dashboard,
        #${elementId.current}__header_message {
          display: none !important;
        }
        #${elementId.current}__scan_region {
          min-height: 260px;
          border: 0 !important;
        }
      `}</style>
    </motion.div>
  );
}