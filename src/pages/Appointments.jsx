import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
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
  Copy,
  ExternalLink,
  Filter,
  MapPin,
  MapPinned,
  Navigation,
  Phone,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const PAGE_SIZE = 10;

const FILTERS = ["All", "Pending", "Accepted", "Completed", "Rejected"];

const STATUS_STYLES = {
  Pending: "bg-amber-50 text-amber-700 ring-amber-200",
  Accepted: "bg-blue-50 text-blue-700 ring-blue-200",
  Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  Cancelled: "bg-stone-100 text-stone-600 ring-stone-200",
};

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const clean = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string" && typeof value !== "number") return "";
  
  const result = String(value).trim();
  if (!result) return "";

  const lower = result.toLowerCase();
  
  // Destroy all variations of null/undefined bugs
  if (/^(null|undefined|n\/a|na|undefined undefined|null null)$/.test(lower)) return "";
  
  // Filter out dummy/mock phone numbers if desired, or keep valid strings
  if (
    result.includes("9876543210") || 
    result === "+91 98765 43210" || 
    result === "98765 43210"
  ) {
    return "";
  }

  return result;
};

const firstValue = (...values) => {
  for (const value of values) {
    const result = clean(value);
    if (result) return result;
  }
  return "";
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const getInitials = (name) =>
  clean(name)
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

function formatAddress(value) {
  if (!value) return "";

  if (typeof value === "string") return clean(value);

  if (Array.isArray(value)) {
    return value.map(formatAddress).filter(Boolean).join(", ");
  }

  if (!isObject(value)) return "";

  const direct = firstValue(
    value.fullAddress,
    value.address,
    value.formattedAddress,
    value.location
  );

  if (direct) return direct;

  return [
    value.houseNo,
    value.flatNumber,
    value.building,
    value.apartment,
    value.street,
    value.area,
    value.landmark,
    value.city,
    value.district,
    value.state,
    value.postalCode,
    value.pincode,
  ]
    .map(clean)
    .filter(Boolean)
    .join(", ");
}

function getUserAddress(user, appointment) {
  const candidates = [
    appointment.address,
    appointment.doorstepAddress,
    appointment.serviceAddress,
    appointment.customerAddress,
    appointment.userAddress,
    appointment.location,
    user.address,
    user.defaultAddress,
    user.location,
  ];

  for (const candidate of candidates) {
    const value = formatAddress(candidate);
    if (value) return value;
  }

  const addresses = user.addresses;

  if (Array.isArray(addresses)) {
    const selected =
      addresses.find((item) => item?.isDefault || item?.default) ||
      addresses[0];

    return formatAddress(selected);
  }

  if (isObject(addresses)) {
    return formatAddress(
      addresses.defaultAddress ||
      addresses.selectedAddress ||
      addresses
    );
  }

  return "";
}

function getCustomerDetails(item) {
  const user = isObject(item.user) ? item.user : {};
  const customer = isObject(item.customer) ? item.customer : {};
  const details = isObject(item.customerDetails)
    ? item.customerDetails
    : {};

  const fullName = firstValue(
    item.customerName,
    item.userName,
    item.name,
    details.name,
    customer.name,
    user.name,
    user.fullName,
    customer.fullName,
    [
      item.firstName || details.firstName || user.firstName || customer.firstName || "",
      item.lastName || details.lastName || user.lastName || customer.lastName || "",
    ].filter(Boolean).join(" ")
  ) || clean(user.email) || clean(customer.email) || "Client";

  const mobile = firstValue(
    item.mobileNumber,
    item.phone,
    item.phoneNumber,
    details.mobileNumber,
    details.phone,
    customer.mobileNumber,
    customer.phone,
    user.phone,
    user.mobileNumber,
    user.mobile
  );

  const address = getUserAddress(user, item);

  return {
    name: fullName,
    mobile,
    address,
    avatar: firstValue(item.avatar, user.avatar, customer.avatar),
  };
}

function getCoordinates(item) {
  const location = isObject(item.location) ? item.location : {};
  const coords =
    item.locationCoordinates ||
    item.coordinates ||
    location.coordinates ||
    location;

  const latitude = Number(
    coords?.latitude ?? coords?.lat
  );
  const longitude = Number(
    coords?.longitude ?? coords?.lng ?? coords?.long
  );

  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  ) {
    return { latitude, longitude };
  }

  return null;
}

function normalizeAppointment(item = {}) {
  const customer = getCustomerDetails(item);
  const rawId = item._id || item.appointmentId || item.id || "";
  const idString = String(rawId);

  const type = String(
    item.type || item.serviceType || ""
  ).toUpperCase();

  const isHomeService =
    type === "HOME" ||
    item.isHomeService === true;

  const status = firstValue(item.status, "Pending");

  return {
    _id: rawId,
    id: firstValue(
      item.passCode,
      item.bookingCode,
      idString.length >= 6
        ? idString.slice(-6).toUpperCase()
        : idString.toUpperCase()
    ),
    passCode: firstValue(item.passCode, item.requestId),
    customer: customer.name,
    mobile: customer.mobile,
    address: customer.address,
    avatar: customer.avatar,
    service: firstValue(
      item.serviceName,
      item.service?.name,
      item.service?.serviceName,
      item.service?.title,
      "Service name unavailable"
    ),
    type: isHomeService ? "HOME" : "SALON",
    coordinates: getCoordinates(item),
    date: item.date || "",
    time: item.time || "",
    datetime: formatDate(item.date, item.time),
    amount: Number(item.amount ?? item.price ?? item.service?.price ?? 0),
    status,
    assignedStaff: firstValue(
      item.assignedStaff,
      item.staff?.name,
      typeof item.staff === "string" ? item.staff : ""
    ),
    createdAt: item.createdAt || null,
  };
}

const pageVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, staggerChildren: 0.04 },
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
        alt={appointment.customer || "Customer"}
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
          <p className="mt-1.5 text-[11px] leading-4 text-[#A09288]">
            {description}
          </p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}>
          <Icon size={19} strokeWidth={1.8} />
        </div>
      </div>
    </motion.div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}) {
  if (totalItems === 0) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const pages = [];
  const first = Math.max(1, currentPage - 2);
  const last = Math.min(totalPages, first + 4);
  const adjustedFirst = Math.max(1, last - 4);

  for (let page = adjustedFirst; page <= last; page += 1) {
    pages.push(page);
  }

  const base =
    "flex h-9 min-w-9 items-center justify-center rounded-lg border text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <div className="flex flex-col gap-3 border-t border-[#F0EAE5] bg-[#FCFBFA] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-[11px] text-[#8D7F75]">
        Showing <b className="text-[#51443B]">{start}–{end}</b> of{" "}
        <b className="text-[#51443B]">{totalItems}</b> appointments
      </p>

      <nav className="flex flex-wrap items-center gap-1.5" aria-label="Pagination">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className={`${base} border-[#EEE7E2] bg-white px-2 text-[#796B62]`}
        >
          <ChevronLeft size={15} />
        </button>

        {pages.map((page) => (
          <button
            type="button"
            key={page}
            onClick={() => onPageChange(page)}
            className={`${base} ${
              currentPage === page
                ? "border-[#302722] bg-[#302722] text-white"
                : "border-[#EEE7E2] bg-white text-[#796B62]"
            }`}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className={`${base} border-[#EEE7E2] bg-white px-2 text-[#796B62]`}
        >
          <ChevronRight size={15} />
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
  const [scannerBooking, setScannerBooking] = useState(null);
  const [trackingBooking, setTrackingBooking] = useState(null);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchStaffMembers = useCallback(async () => {
    try {
      const response = await API.get("/api/staff");
      const payload =
        response.data?.data ??
        response.data?.staff ??
        response.data;

      if (!Array.isArray(payload)) {
        setStaffList([]);
        return;
      }

      const names = payload
        .map((staff) => {
          if (typeof staff === "string") return clean(staff);

          const name = firstValue(
            staff.name,
            `${staff.firstName || ""} ${staff.lastName || ""}`.trim(),
            staff.fullName
          );

          const role = clean(staff.role || staff.designation);
          return name ? (role ? `${name} (${role})` : name) : "";
        })
        .filter(Boolean);

      setStaffList([...new Set(names)]);
    } catch (error) {
      console.error("Staff API error:", error);
      setStaffList([]);
    }
  }, []);

  const fetchAppointments = useCallback(
    async (quiet = false) => {
      try {
        if (quiet) setRefreshing(true);
        else setLoading(true);

        const response = await API.get("/api/appointments");
        const payload =
          response.data?.data ??
          response.data?.appointments ??
          response.data;

        if (!Array.isArray(payload)) {
          throw new Error("Appointments API did not return an array.");
        }

        setAppointments(payload.map(normalizeAppointment));
      } catch (error) {
        console.error("Failed to fetch appointments:", error);
        showToast(
          error.response?.status === 401
            ? "Authentication required. Please sign in again."
            : error.response?.data?.message ||
              "Unable to load appointments. Check your API connection.",
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
        if (
          formatted._id &&
          current.some((item) => String(item._id) === String(formatted._id))
        ) {
          return current;
        }
        return [formatted, ...current];
      });

      showToast(`New booking received: ${formatted.id}`);
    });

    socket.on("appointmentUpdated", (updated) => {
      setAppointments((current) =>
        current.map((item) => {
          const sameId =
            item._id &&
            updated._id &&
            String(item._id) === String(updated._id);

          if (!sameId) return item;

          return {
            ...item,
            ...normalizeAppointment({ ...item, ...updated }),
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
    const today = new Date();
    const todayString = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    const todayAppointments = appointments.filter(
      (item) => item.date === todayString
    );

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

      const searchable = [
        item.customer,
        item.mobile,
        item.id,
        item.passCode,
        item.service,
        item.assignedStaff,
        item.type,
        item.address,
      ]
        .join(" ")
        .toLowerCase();

      return matchesFilter && searchable.includes(query);
    });

    return result.sort((a, b) => {
      const dateA = new Date(
        a.createdAt || `${a.date}T${a.time || "00:00"}`
      ).getTime();
      const dateB = new Date(
        b.createdAt || `${b.date}T${b.time || "00:00"}`
      ).getTime();

      return sortNewest ? dateB - dateA : dateA - dateB;
    });
  }, [appointments, filter, searchQuery, sortNewest]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery, sortNewest]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAppointments.length / PAGE_SIZE)
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAppointments.slice(start, start + PAGE_SIZE);
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
        current.map((item) =>
          String(item._id) === String(booking._id)
            ? { ...item, status }
            : item
        )
      );

      showToast(
        status === "Accepted"
          ? "Booking accepted successfully."
          : status === "Rejected"
            ? "Booking rejected successfully."
            : "Booking updated successfully."
      );
    } catch (error) {
      console.error("Status update failed:", error);
      showToast(
        error.response?.data?.message || "Could not update booking status.",
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const assignStaff = async (booking, staffName) => {
    if (!booking._id || !staffName) {
      showToast("Select a valid staff member.", "error");
      return;
    }

    setActionLoading(booking._id);

    try {
      await API.patch(
        `/api/appointments/${booking._id}/assign-staff`,
        { assignedStaff: staffName }
      );

      setAppointments((current) =>
        current.map((item) =>
          String(item._id) === String(booking._id)
            ? { ...item, assignedStaff: staffName }
            : item
        )
      );

      setOpenDropdownId(null);
      showToast("Staff member assigned successfully.");
    } catch (error) {
      console.error("Staff assignment failed:", error);
      showToast(
        error.response?.data?.message || "Unable to assign staff.",
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const copyAddress = async (address) => {
    if (!address) {
      showToast("No customer address is available.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(address);
      showToast("Address copied successfully.");
    } catch {
      showToast("Unable to copy address.", "error");
    }
  };

  const verifyQr = async (booking, scannedText) => {
    let scannedValue = scannedText.trim();

    try {
      const parsed = JSON.parse(scannedText);
      if (isObject(parsed)) {
        scannedValue =
          parsed.passCode ||
          parsed.ticketId ||
          parsed.bookingId ||
          parsed.id ||
          parsed.code ||
          scannedText.trim();
      }
    } catch {
      // Plain text QR codes are also supported.
    }

    const valid = [
      booking.passCode,
      booking.id,
      booking._id,
    ].some(
      (value) =>
        value &&
        String(value).toLowerCase() ===
          String(scannedValue).toLowerCase()
    );

    if (!valid) {
      showToast("QR code does not match this booking.", "error");
      return false;
    }

    if (booking.status !== "Accepted") {
      showToast("Only accepted bookings can be verified.", "error");
      return false;
    }

    try {
      await API.patch(`/api/appointments/${booking._id}/status`, {
        status: "Completed",
      });

      setAppointments((current) =>
        current.map((item) =>
          String(item._id) === String(booking._id)
            ? { ...item, status: "Completed" }
            : item
        )
      );

      showToast("QR verified. Appointment marked completed.");
      return true;
    } catch (error) {
      showToast(
        error.response?.data?.message || "Unable to complete booking.",
        "error"
      );
      return false;
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
        <motion.header
          variants={itemVariants}
          className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"
        >
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#EDE1D9] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[1.6px] text-[#A7684D]">
              <Sparkles size={13} />
              Operations
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-[#302722] sm:text-3xl">
              Appointments
            </h1>

            <p className="mt-1.5 max-w-xl text-xs leading-5 text-[#8D7F75] sm:text-sm">
              Manage bookings, coordinate service experts, and verify customer passes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#EDE7E2] bg-white px-3 text-xs text-[#6F6259]">
              <span className={`h-2.5 w-2.5 rounded-full ${socketConnected ? "bg-emerald-500" : "bg-amber-400"}`} />
              {socketConnected ? "Live connected" : "Connecting"}
            </div>

            <button
              type="button"
              onClick={() => {
                fetchAppointments(true);
                fetchStaffMembers();
              }}
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#EDE7E2] bg-white px-3.5 text-xs font-medium text-[#6F6259] transition hover:border-[#D9B8A5] hover:text-[#B46546] disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              Refresh
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
                <h2 className="text-base font-semibold text-[#302722]">
                  Booking management
                </h2>
                <p className="mt-1 text-xs text-[#96877D]">
                  {filteredAppointments.length} appointment(s) found
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-[#EDE7E2] bg-[#FCFBFA] px-3 sm:w-[300px]">
                  <Search size={16} className="shrink-0 text-[#A09288]" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search customer, mobile, ID or service..."
                    className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[#B1A49A]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                      className="text-[#A09288]"
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
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                      filter === tab
                        ? "bg-white/15 text-white"
                        : "bg-[#F4F0EC] text-[#8D7F75]"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto overflow-y-visible pb-20 md:block">
            <table className="w-full min-w-[1100px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#F0EAE5] bg-[#FCFBFA] text-[10px] font-semibold uppercase tracking-[1.1px] text-[#9B8D83]">
                  <th className="px-5 py-4">Booking</th>
                  <th className="px-4 py-4">Customer & Mobile</th>
                  <th className="px-4 py-4">Service & Address</th>
                  <th className="px-4 py-4">Schedule</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Assigned expert</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F2EDE9]">
                {loading && appointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-20 text-center text-sm text-[#8D7F75]">
                      <RefreshCw size={22} className="mx-auto mb-3 animate-spin text-[#C56E4E]" />
                      Loading appointments...
                    </td>
                  </tr>
                ) : paginatedAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-20 text-center">
                      <CalendarDays size={25} className="mx-auto text-[#B66B4B]" />
                      <p className="mt-4 text-sm font-semibold text-[#302722]">No appointments found</p>
                      <p className="mt-1 text-xs text-[#9B8D83]">Try another filter or search term.</p>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {paginatedAppointments.map((booking) => {
                      const pending = booking.status === "Pending";
                      const accepted = booking.status === "Accepted";
                      const completed = booking.status === "Completed";
                      const rejected = booking.status === "Rejected";

                      return (
                        <motion.tr
                          layout
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          key={booking._id || booking.id}
                          className="group transition-colors hover:bg-[#FCFAF8]"
                        >
                          <td className="px-5 py-4">
                            <p className="font-mono text-xs font-semibold text-[#302722]">
                              {booking.id || "Booking"}
                            </p>
                            <p className="mt-1 text-[10px] text-[#A09288]">
                              {booking.type === "HOME" ? "Home service" : "Salon appointment"}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <CustomerAvatar appointment={booking} />
                              <div className="min-w-0">
                                <p className="max-w-[160px] truncate text-xs font-semibold text-[#302722]">
                                  {booking.customer || "Not provided"}
                                </p>

                                {booking.mobile ? (
                                  <a
                                    href={`tel:${booking.mobile}`}
                                    className="mt-1 flex items-center gap-1 font-mono text-[11px] text-[#796B62] hover:text-[#C56E4E]"
                                  >
                                    <Phone size={11} />
                                    {booking.mobile}
                                  </a>
                                ) : (
                                  <p className="mt-1 text-[10px] text-[#A09288]">
                                    No phone provided
                                  </p>
                                )}

                                <p className="mt-1 text-[10px] text-[#A09288]">
                                  {formatCurrency(booking.amount)}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <p className="max-w-[220px] truncate text-xs font-semibold text-[#51443B]">
                              {booking.service}
                            </p>
                            <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-[#796B62]">
                              <MapPin size={13} className="mt-0.5 shrink-0 text-[#C56E4E]" />
                              <span className="line-clamp-2 leading-relaxed">
                                {booking.address || "Address not provided"}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <button
                                type="button"
                                disabled={!booking.address}
                                onClick={() => copyAddress(booking.address)}
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-[#C56E4E] hover:underline disabled:opacity-40"
                              >
                                <Copy size={11} /> Copy address
                              </button>
                              {booking.coordinates && (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                                  <MapPinned size={10} /> Coordinates saved
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2 text-xs text-[#62564D]">
                              <CalendarDays size={14} className="shrink-0 text-[#B66B4B]" />
                              <span className="whitespace-nowrap">{booking.datetime}</span>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <StatusBadge status={booking.status} />
                          </td>

                          <td className="px-4 py-4">
                            {pending || rejected ? (
                              <span className="text-[11px] text-[#A09288]">—</span>
                            ) : completed ? (
                              <span className="inline-flex max-w-[170px] items-center gap-1.5 text-xs text-emerald-700">
                                <ShieldCheck size={14} />
                                <span className="truncate">{booking.assignedStaff || "Unassigned"}</span>
                              </span>
                            ) : (
                              <div className="relative w-full max-w-[180px]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenDropdownId(
                                      openDropdownId === booking._id ? null : booking._id
                                    )
                                  }
                                  disabled={actionLoading === booking._id || staffList.length === 0}
                                  className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-[#EEE4DC] bg-white px-3 text-left text-[11px] text-[#67574D] hover:border-[#D6B5A2] disabled:opacity-50"
                                >
                                  <span className="truncate">
                                    {booking.assignedStaff || "Assign expert"}
                                  </span>
                                  <ChevronDown size={14} />
                                </button>

                                <AnimatePresence>
                                  {openDropdownId === booking._id && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 6 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: 6 }}
                                      className="absolute left-0 top-full z-50 mt-2 max-h-56 w-[240px] overflow-y-auto rounded-xl border border-[#EEE7E2] bg-white p-2 shadow-xl"
                                    >
                                      <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-[#A09288]">
                                        Select staff member
                                      </p>
                                      {staffList.map((staff) => (
                                        <button
                                          type="button"
                                          key={staff}
                                          onClick={() => assignStaff(booking, staff)}
                                          className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-left text-[11px] text-[#67574D] hover:bg-[#FAF3EE]"
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

                            {accepted && staffList.length === 0 && (
                              <p className="mt-1 max-w-[170px] text-[10px] text-amber-700">
                                No staff records available
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            {pending && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => updateStatus(booking, "Accepted")}
                                  disabled={actionLoading === booking._id}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-50 px-2.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-600 hover:text-white disabled:opacity-50"
                                >
                                  <Check size={13} /> Accept
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateStatus(booking, "Rejected")}
                                  disabled={actionLoading === booking._id}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white disabled:opacity-50"
                                  title="Reject booking"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            )}

                            {accepted && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setTrackingBooking(booking)}
                                  disabled={!booking.assignedStaff || !booking.address}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-50 px-2.5 text-[11px] font-medium text-blue-700 hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Navigation size={13} /> Route
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setScannerBooking(booking)}
                                  disabled={!booking.assignedStaff}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#302722] px-2.5 text-[11px] font-medium text-white hover:bg-[#B66B4B] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <QrCode size={13} /> Scan
                                </button>
                              </div>
                            )}

                            {completed && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                                <CheckCircle2 size={13} /> Done
                              </span>
                            )}

                            {rejected && (
                              <span className="text-[11px] text-rose-600">Rejected</span>
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

          {/* Mobile cards */}
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
              paginatedAppointments.map((booking) => (
                <motion.article
                  layout
                  key={booking._id || booking.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 rounded-xl border border-[#EEE7E2] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <CustomerAvatar appointment={booking} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#302722]">
                          {booking.customer || "Not provided"}
                        </p>
                        {booking.mobile ? (
                          <a
                            href={`tel:${booking.mobile}`}
                            className="mt-0.5 flex items-center gap-1 font-mono text-xs text-[#796B62]"
                          >
                            <Phone size={12} /> {booking.mobile}
                          </a>
                        ) : (
                          <p className="mt-0.5 text-[10px] text-[#A09288]">
                            No phone provided
                          </p>
                        )}
                        <p className="mt-0.5 font-mono text-[10px] text-[#A09288]">
                          {booking.id}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>

                  <div className="h-px bg-[#F1ECE7]" />

                  <div className="space-y-2 text-xs">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#A09288]">Service</p>
                      <p className="font-semibold text-[#51443B]">{booking.service}</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-wider text-[#A09288]">
                          Customer address
                        </p>
                        <button
                          type="button"
                          onClick={() => copyAddress(booking.address)}
                          disabled={!booking.address}
                          className="flex items-center gap-1 text-[10px] font-semibold text-[#C56E4E] disabled:opacity-40"
                        >
                          <Copy size={10} /> Copy
                        </button>
                      </div>
                      <div className="mt-1 flex items-start gap-1.5 rounded-lg border border-[#F0EAE5] bg-[#FCFBFA] p-2 text-xs text-[#796B62]">
                        <MapPin size={14} className="mt-0.5 shrink-0 text-[#C56E4E]" />
                        <span className="leading-relaxed">
                          {booking.address || "Address not provided"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#A09288]">Amount</p>
                        <p className="font-semibold text-[#302722]">
                          {formatCurrency(booking.amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#A09288]">Schedule</p>
                        <p className="font-medium text-[#67574D]">{booking.datetime}</p>
                      </div>
                    </div>

                    {booking.assignedStaff && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#A09288]">Assigned expert</p>
                        <p className="font-medium text-[#67574D]">{booking.assignedStaff}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-[#F1ECE7] pt-3">
                    {booking.status === "Pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateStatus(booking, "Accepted")}
                          disabled={actionLoading === booking._id}
                          className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-600 hover:text-white disabled:opacity-50"
                        >
                          <Check size={14} /> Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(booking, "Rejected")}
                          disabled={actionLoading === booking._id}
                          className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-rose-50 px-3 text-xs font-medium text-rose-600 hover:bg-rose-600 hover:text-white disabled:opacity-50"
                        >
                          <X size={14} /> Reject
                        </button>
                      </>
                    )}

                    {booking.status === "Accepted" && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenDropdownId(
                              openDropdownId === booking._id ? null : booking._id
                            )
                          }
                          disabled={staffList.length === 0}
                          className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-[#EEE7E2] px-3 text-xs text-[#67574D] disabled:opacity-40"
                        >
                          <Users size={14} /> Assign staff
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrackingBooking(booking)}
                          disabled={!booking.assignedStaff || !booking.address}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-medium text-blue-700 disabled:opacity-40"
                        >
                          <Navigation size={14} /> Route
                        </button>
                        <button
                          type="button"
                          onClick={() => setScannerBooking(booking)}
                          disabled={!booking.assignedStaff}
                          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#302722] px-3 text-xs font-medium text-white disabled:opacity-40"
                        >
                          <QrCode size={15} /> Scan
                        </button>
                      </>
                    )}

                    {booking.status === "Completed" && (
                      <span className="flex items-center gap-2 py-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 size={15} /> Service completed
                      </span>
                    )}

                    {booking.status === "Rejected" && (
                      <span className="py-1 text-xs text-rose-600">
                        This appointment was rejected.
                      </span>
                    )}
                  </div>

                  {booking.status === "Accepted" &&
                    openDropdownId === booking._id && (
                      <div className="rounded-xl border border-[#EEE7E2] bg-[#FCFBFA] p-2">
                        <p className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#A09288]">
                          Select staff member
                        </p>
                        {staffList.length ? (
                          staffList.map((staff) => (
                            <button
                              type="button"
                              key={staff}
                              onClick={() => assignStaff(booking, staff)}
                              className="flex w-full items-center justify-between rounded-lg px-2 py-2.5 text-left text-[11px] text-[#67574D] hover:bg-[#F8EFE8]"
                            >
                              {staff}
                              {booking.assignedStaff === staff && <Check size={14} />}
                            </button>
                          ))
                        ) : (
                          <p className="px-2 py-3 text-[11px] text-[#9B8D83]">
                            No staff records found. Add staff in the staff management section.
                          </p>
                        )}
                      </div>
                    )}
                </motion.article>
              ))
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
        {scannerBooking && (
          <QRScannerModal
            key={scannerBooking._id}
            booking={scannerBooking}
            onClose={() => setScannerBooking(null)}
            onVerified={verifyQr}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {trackingBooking && (
          <RouteModal
            booking={trackingBooking}
            onClose={() => setTrackingBooking(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            className={`fixed bottom-5 left-1/2 z-[120] flex w-[calc(100%-32px)] max-w-md -translate-x-1/2 items-center gap-3 rounded-xl border px-4 py-3.5 shadow-xl ${
              toast.type === "error"
                ? "border-rose-200 bg-white text-rose-700"
                : "border-emerald-200 bg-white text-[#355D43]"
            }`}
          >
            {toast.type === "error" ? (
              <AlertCircle size={18} className="shrink-0" />
            ) : (
              <CheckCircle2 size={18} className="shrink-0" />
            )}
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

function RouteModal({ booking, onClose }) {
  const destination = booking.coordinates
    ? `${booking.coordinates.latitude},${booking.coordinates.longitude}`
    : booking.address;

  const mapsUrl = destination
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end justify-center bg-[#241B17]/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 25, scale: 0.98 }}
        className="w-full max-w-lg overflow-hidden rounded-t-[26px] border border-[#EEE7E2] bg-white shadow-2xl sm:rounded-[26px]"
      >
        <div className="flex items-center justify-between border-b border-[#F0EAE5] bg-[#FCFBFA] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Navigation size={19} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-blue-600">
                Route navigation
              </p>
              <h2 className="text-base font-semibold text-[#302722]">
                Customer destination
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#EEE7E2] text-[#8D7F75]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <div className="rounded-2xl border border-[#EEE7E2] bg-[#FCFBFA] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8D7F75]">
              Customer
            </p>
            <p className="mt-1 text-sm font-semibold text-[#302722]">
              {booking.customer || "Not provided"}
            </p>
            {booking.mobile && (
              <a
                href={`tel:${booking.mobile}`}
                className="mt-1 inline-flex items-center gap-1.5 text-xs text-[#796B62]"
              >
                <Phone size={13} /> {booking.mobile}
              </a>
            )}
            <div className="mt-4 border-t border-[#EEE7E2] pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8D7F75]">
                Saved address
              </p>
              <p className="mt-1 flex items-start gap-2 text-xs leading-5 text-[#51443B]">
                <MapPin size={15} className="mt-0.5 shrink-0 text-[#C56E4E]" />
                {booking.address || "Address not provided"}
              </p>
            </div>
            {booking.coordinates && (
              <p className="mt-2 text-[10px] text-emerald-700">
                Coordinates: {booking.coordinates.latitude}, {booking.coordinates.longitude}
              </p>
            )}
          </div>

          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-blue-700"
            >
              Open destination in Google Maps <ExternalLink size={15} />
            </a>
          ) : (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              A customer address or saved coordinates are required to open navigation.
            </p>
          )}
        </div>

        <div className="border-t border-[#F0EAE5] bg-[#FCFBFA] p-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-xl border border-[#E9E1DA] text-xs font-medium text-[#67574D]"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function QRScannerModal({ booking, onClose, onVerified }) {
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cameraList, setCameraList] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");

  const scannerRef = useRef(null);
  const mountedRef = useRef(true);
  const processingRef = useRef(false);
  const elementId = useRef(`beautyvibe-qr-${Math.random().toString(36).slice(2)}`);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      if (scanner.isScanning) await scanner.stop();
    } catch (error) {
      console.warn("Scanner stop:", error);
    }

    try {
      scanner.clear();
    } catch {}

    scannerRef.current = null;
  }, []);

  const startScanner = useCallback(async (cameraId) => {
    if (scannerRef.current) return;

    setCameraError("");
    setCameraReady(false);

    try {
      const scanner = new Html5Qrcode(elementId.current, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      scannerRef.current = scanner;

      await scanner.start(
        cameraId || { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 230, height: 230 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          if (processingRef.current) return;
          processingRef.current = true;

          if (mountedRef.current) setProcessing(true);

          await stopScanner();

          try {
            await onVerified(booking, decodedText);
            if (mountedRef.current) onClose();
          } finally {
            if (mountedRef.current) setProcessing(false);
            processingRef.current = false;
          }
        },
        () => {}
      );

      if (mountedRef.current) setCameraReady(true);
    } catch (error) {
      console.error("QR camera error:", error);
      scannerRef.current = null;

      if (mountedRef.current) {
        setCameraError(
          error?.name === "NotAllowedError"
            ? "Camera permission denied. Allow camera access in browser settings."
            : error?.name === "NotFoundError"
              ? "No camera was found on this device."
              : "Unable to start camera. Use HTTPS or localhost and allow camera access."
        );
      }
    }
  }, [booking, onClose, onVerified, stopScanner]);

  useEffect(() => {
    mountedRef.current = true;

    const initialize = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!mountedRef.current) return;

        setCameraList(cameras || []);

        const backCamera =
          cameras?.find((camera) => /back|rear|environment/i.test(camera.label)) ||
          cameras?.[0];

        if (backCamera) {
          setSelectedCamera(backCamera.id);
          await startScanner(backCamera.id);
        } else {
          await startScanner("");
        }
      } catch (error) {
        console.error("Camera initialization error:", error);
        if (mountedRef.current) {
          setCameraError("Camera permission or device access is unavailable.");
        }
      }
    };

    initialize();

    return () => {
      mountedRef.current = false;
      const scanner = scannerRef.current;

      if (scanner) {
        if (scanner.isScanning) {
          scanner.stop().catch(() => {}).finally(() => {
            try {
              scanner.clear();
            } catch {}
          });
        } else {
          try {
            scanner.clear();
          } catch {}
        }
        scannerRef.current = null;
      }
    };
  }, [startScanner]);

  const changeCamera = async (event) => {
    const cameraId = event.target.value;
    await stopScanner();
    setSelectedCamera(cameraId);
    setCameraError("");

    window.setTimeout(() => {
      if (mountedRef.current) startScanner(cameraId);
    }, 200);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[#241B17]/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.section
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 25 }}
        role="dialog"
        aria-modal="true"
        className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-[26px] bg-white shadow-2xl sm:rounded-[26px]"
      >
        <div className="flex items-center justify-between border-b border-[#F0EAE5] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#302722] text-white">
              <QrCode size={20} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#B66B4B]">
                BeautyVibe verification
              </p>
              <h2 className="text-base font-semibold text-[#302722]">
                Scan booking pass
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#EEE7E2] text-[#8D7F75]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="mb-4 rounded-xl border border-[#EEE7E2] bg-[#FCFBFA] p-3">
            <p className="text-sm font-semibold text-[#302722]">
              {booking.customer || "Not provided"}
            </p>
            <p className="mt-1 text-xs text-[#796B62]">
              {booking.service} · {booking.id}
            </p>
            {booking.mobile && (
              <p className="mt-1 font-mono text-xs text-[#796B62]">
                {booking.mobile}
              </p>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl bg-[#211B18] p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="flex items-center gap-2 text-[10px] text-white/75">
                <span className={`h-2 w-2 rounded-full ${cameraReady ? "bg-emerald-400" : "bg-amber-400"}`} />
                {cameraReady ? "Camera active" : "Connecting camera"}
              </span>
              <span className="text-[10px] text-white/50">QR READER</span>
            </div>

            <div className="relative min-h-[260px] overflow-hidden rounded-xl bg-[#171310]">
              <div id={elementId.current} className="w-full overflow-hidden" />
              {processing && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#211B18]/90 text-white">
                  <RefreshCw size={27} className="animate-spin text-[#E2B08F]" />
                  <p className="mt-3 text-sm">Verifying booking...</p>
                </div>
              )}
            </div>
            <p className="px-1 pt-3 text-center text-[11px] text-white/65">
              Position the customer's QR code inside the camera frame.
            </p>
          </div>

          {cameraError && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700">
              {cameraError}
            </div>
          )}

          {cameraList.length > 1 && (
            <label className="mt-3 block">
              <span className="mb-1.5 block text-[11px] text-[#8D7F75]">
                Camera source
              </span>
              <select
                value={selectedCamera}
                onChange={changeCamera}
                className="h-10 w-full rounded-xl border border-[#EEE7E2] bg-white px-3 text-xs outline-none"
              >
                {cameraList.map((camera, index) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-xl border border-[#E9E1DA] text-xs font-medium text-[#67574D]"
            >
              Close
            </button>
            <div className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#302722] text-xs font-medium text-white">
              <Camera size={15} className="text-[#E2B08F]" />
              {processing ? "Verifying..." : cameraReady ? "Scanning live" : "Starting camera"}
            </div>
          </div>
        </div>
      </motion.section>

      <style>{`
        #${elementId.current} video {
          width: 100% !important;
          min-height: 260px;
          max-height: 360px;
          object-fit: cover;
          border-radius: 12px;
        }
        #${elementId.current}__dashboard,
        #${elementId.current}__header_message {
          display: none !important;
        }
      `}</style>
    </motion.div>
  );
}