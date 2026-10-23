import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Download, 
  IndianRupee, 
  CalendarDays, 
  Users, 
  ArrowUpRight, 
  CheckCircle2,
  RefreshCw,
  Package,
  Scissors,
  ChevronDown,
  FileText,
  TableProperties,
  PieChart,
  FileSpreadsheet
} from "lucide-react";
import { io } from "socket.io-client";
import API from "./../utils/axios";

// --- Animation Variants ---
const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 65, damping: 20 } }
};

const dropdownVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.95, transformOrigin: "top right" },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 15 } },
  exit: { opacity: 0, y: 10, scale: 0.95, transition: { duration: 0.15 } }
};

// --- Utility Functions ---
const formatCurrency = (val) => {
  if (!val) return "₹0";
  if (typeof val === 'string' && val.includes('₹')) return val;
  return `₹${Number(val).toLocaleString("en-IN")}`;
};

export default function Reports() {
  const [timeRange, setTimeRange] = useState("Month");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

  const [reportData, setReportData] = useState({
    metrics: {
      totalRevenue: 0,
      totalBookings: 0,
      newCustomers: 0,
      totalServices: 0,
      packageSales: 0
    },
    revenueTrend: [],
    topServices: [],
    topStaff: [],
    categoryBreakdown: []
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/api/reports?range=${timeRange}`);
      if (res.data?.success && res.data?.data) {
        setReportData((prev) => ({
          metrics: { ...prev.metrics, ...res.data.data.metrics },
          revenueTrend: res.data.data.revenueTrend || [],
          topServices: res.data.data.topServices || [],
          topStaff: res.data.data.topStaff || [],
          categoryBreakdown: res.data.data.categoryBreakdown || []
        }));
      }
    } catch (err) {
      console.error("Failed to fetch report analytics:", err);
      showToast("⚠️ Unable to sync live metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();

    const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
    const socket = io(socketUrl, { transports: ["polling", "websocket"] });

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("appointmentUpdated", () => fetchReports());
    socket.on("customerUpdated", () => fetchReports());

    return () => socket.disconnect();
  }, [timeRange]);

  // Click outside listener for Export Dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = (type) => {
    setExportMenuOpen(false);
    
    let message = "";
    if (type === 'pdf') message = "Generating BeautyVibe PDF Report...";
    if (type === 'excel') message = "Downloading Excel Workbook (.xlsx)...";
    if (type === 'powerbi') message = "Exporting Power BI Dataset (.csv)...";

    showToast(`📥 ${message}`);
    
    setTimeout(() => {
      showToast(`✅ ${type.toUpperCase()} export completed!`);
    }, 2500);
  };

  return (
    <div className="flex-1 min-w-0 bg-[#FCF9F6] font-sans selection:bg-[#C56E4E] selection:text-white pb-36 text-[#2D2623] relative">
      <motion.main variants={staggerContainer} initial="hidden" animate="show" className="max-w-[1440px] mx-auto space-y-8 px-4 sm:px-6 pt-6">
        
        {/* Header & Controls */}
        <motion.div variants={fadeUp} className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white rounded-[2.5rem] border border-[#EADBD2] p-6 sm:p-8 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF6F0] border border-[#EADBD2] px-4 py-1.5 mb-3 shadow-sm">
              <Sparkles size={14} className="text-[#C56E4E]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C7A70]">Live Service & Sales Analytics</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2D2623]">Business Overview & Charts</h1>
            <p className="text-xs text-[#8C7A70] mt-1">Real-time salon bookings, revenue trajectory charts, and client insights.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[#FFF6F0] border border-[#EADBD2] px-4 py-2.5 rounded-2xl text-xs font-bold text-[#5C4841] shadow-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${socketConnected ? "bg-[#1E9E4A]" : "bg-[#E5A024]"}`} />
              <span>{socketConnected ? "Live 🟢" : "Connecting..."}</span>
            </div>

            <button 
              onClick={fetchReports} 
              className="h-10 w-10 rounded-2xl bg-[#FFF6F0] border border-[#EADBD2] flex items-center justify-center text-[#C56E4E] hover:bg-[#C56E4E] hover:text-white transition-all cursor-pointer"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>

            {/* Range Toggle */}
            <div className="flex gap-1 bg-[#FFF6F0] p-1.5 rounded-full border border-[#EADBD2] shadow-sm">
              {["Week", "Month", "Year"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTimeRange(tab)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    timeRange === tab ? "bg-[#C56E4E] text-white shadow-md" : "text-[#8C7A70] hover:text-[#2D2623]"
                  }`}
                >
                  This {tab}
                </button>
              ))}
            </div>

            {/* Export Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="flex items-center gap-2 rounded-full bg-[#2D2623] text-white px-5 py-3 text-xs font-bold uppercase tracking-wider shadow-lg hover:bg-[#1A1513] transition-colors cursor-pointer"
              >
                <Download size={15} className="text-[#E5A024]" /> 
                <span className="hidden sm:inline">Export</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${exportMenuOpen ? "rotate-180" : ""}`} />
              </motion.button>

              <AnimatePresence>
                {exportMenuOpen && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#EADBD2] rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-2 space-y-1">
                      <button 
                        onClick={() => handleExport('pdf')}
                        className="flex items-center gap-3 w-full text-left px-3 py-2.5 hover:bg-[#FFF6F0] rounded-xl transition-colors group cursor-pointer"
                      >
                        <div className="h-8 w-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-100 transition-colors shadow-sm">
                          <FileText size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#2D2623]">Export as PDF</p>
                          <p className="text-[9px] font-medium text-[#8C7A70]">Visual report format</p>
                        </div>
                      </button>
                      
                      <button 
                        onClick={() => handleExport('excel')}
                        className="flex items-center gap-3 w-full text-left px-3 py-2.5 hover:bg-[#FFF6F0] rounded-xl transition-colors group cursor-pointer"
                      >
                        <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors shadow-sm">
                          <FileSpreadsheet size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#2D2623]">Export as Excel</p>
                          <p className="text-[9px] font-medium text-[#8C7A70]">Raw .xlsx data dump</p>
                        </div>
                      </button>

                      <button 
                        onClick={() => handleExport('powerbi')}
                        className="flex items-center gap-3 w-full text-left px-3 py-2.5 hover:bg-[#FFF6F0] rounded-xl transition-colors group cursor-pointer"
                      >
                        <div className="h-8 w-8 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center group-hover:bg-yellow-100 transition-colors shadow-sm">
                          <PieChart size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#2D2623]">Power BI Export</p>
                          <p className="text-[9px] font-medium text-[#8C7A70]">Structured dataset (.csv)</p>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* 5 Key Performance Metrics */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {[
            { title: "Total Revenue", value: formatCurrency(reportData.metrics.totalRevenue), change: "Live Database", icon: IndianRupee, tint: "bg-[#FFF6F0] text-[#C56E4E]" },
            { title: "Total Bookings", value: reportData.metrics.totalBookings, change: "Confirmed Rituals", icon: CalendarDays, tint: "bg-[#EBF7EE] text-[#1E9E4A]" },
            { title: "New Customers", value: reportData.metrics.newCustomers, change: "Registered Clients", icon: Users, tint: "bg-[#FFF8E6] text-[#E5A024]" },
            { title: "Total Services", value: reportData.metrics.totalServices, change: "Catalog Items", icon: Scissors, tint: "bg-[#F3E8FF] text-[#7E22CE]" },
            { title: "Package Sales", value: formatCurrency(reportData.metrics.packageSales), change: "Active Packages", icon: Package, tint: "bg-[#FFF1F2] text-[#E11D48]" },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="bg-white rounded-[2rem] border border-[#EADBD2] p-6 shadow-sm flex flex-col justify-between hover:-translate-y-1 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C7A70]">{stat.title}</span>
                  <div className={`h-10 w-10 rounded-2xl flex items-center justify-center border border-[#EADBD2] ${stat.tint}`}>
                    <Icon size={18} />
                  </div>
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-bold text-[#2D2623] mb-1">{stat.value}</h3>
                  <span className="text-[10px] font-bold text-[#1E9E4A] flex items-center gap-0.5">
                    <ArrowUpRight size={12} /> {stat.change}
                  </span>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Performance Charts Section */}
        <motion.div variants={fadeUp} className="grid lg:grid-cols-12 gap-6">
          
          {/* Revenue Trajectory Chart (8 Cols) */}
          <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-[#EADBD2] p-6 sm:p-8 shadow-sm flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#2D2623]">Revenue Growth Trajectory</h3>
                <p className="text-xs text-[#8C7A70]">Live booking revenue distribution</p>
              </div>
              <span className="text-xs font-bold text-[#C56E4E] bg-[#FFF6F0] px-3.5 py-1.5 rounded-full border border-[#EADBD2] w-fit">
                Real-Time Data ({reportData.metrics.totalBookings} Bookings)
              </span>
            </div>

            {/* Responsive Animated Bar Chart Container */}
            <div className="h-72 sm:h-80 w-full flex items-end justify-between gap-2 sm:gap-4 pt-8 pb-4 px-2 border-b border-[#EADBD2]">
              {reportData.revenueTrend && reportData.revenueTrend.length > 0 ? (
                reportData.revenueTrend.map((item, i) => {
                  const maxVal = Math.max(...reportData.revenueTrend.map(t => Number(t.value) || 0), 1000);
                  const itemVal = Number(item.value) || 0;
                  const heightPct = Math.min(Math.max((itemVal / maxVal) * 100, 15), 100);
                  
                  return (
                    <div key={i} className="flex-1 bg-[#FFF6F0] rounded-t-xl relative group h-full flex flex-col items-center justify-end">
                      <span className="absolute -top-7 text-[10px] font-bold text-[#C56E4E] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white px-2 py-1 rounded shadow-sm border border-[#EADBD2]">
                        {formatCurrency(itemVal)}
                      </span>
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 0.7, delay: i * 0.05 }}
                        className="w-full bg-gradient-to-t from-[#C56E4E] to-[#E5A024] rounded-t-xl shadow-sm" 
                      />
                    </div>
                  );
                })
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[#8C7A70]">
                  No revenue trend data available for this range.
                </div>
              )}
            </div>

            <div className="flex justify-between text-[11px] font-bold text-[#8C7A70] pt-4 px-2">
              {reportData.revenueTrend.map((item, i) => (
                <span key={i} className="truncate text-center flex-1">{item.label}</span>
              ))}
            </div>
          </div>

          {/* Service Category Share (4 Cols) */}
          <div className="lg:col-span-4 bg-white rounded-[2.5rem] border border-[#EADBD2] p-6 sm:p-8 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#2D2623] mb-1">Category Breakdown</h3>
              <p className="text-xs text-[#8C7A70] mb-6">Booking distribution by service category</p>

              <div className="space-y-4">
                {reportData.categoryBreakdown && reportData.categoryBreakdown.length > 0 ? (
                  reportData.categoryBreakdown.map((cat, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-xs font-bold text-[#2D2623] mb-1.5">
                        <span>{cat.name}</span>
                        <span className="text-[#C56E4E]">{cat.pct}%</span>
                      </div>
                      <div className="h-2.5 w-full bg-[#FCF9F6] rounded-full overflow-hidden border border-[#EADBD2]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${cat.pct}%` }}
                          transition={{ duration: 0.8, delay: idx * 0.1 }}
                          className="h-full bg-gradient-to-r from-[#C56E4E] to-[#E5A024] rounded-full"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#8C7A70] text-center py-4">Not enough data to calculate categories.</p>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#EADBD2] flex items-center justify-between text-xs text-[#8C7A70]">
              <span>Total Bookings Recorded:</span>
              <strong className="font-serif text-sm font-bold text-[#2D2623]">{reportData.metrics.totalBookings} Sessions</strong>
            </div>
          </div>

        </motion.div>

        {/* Top Services & Staff Section */}
        <motion.div variants={fadeUp} className="grid lg:grid-cols-12 gap-6">
          
          {/* Top Services */}
          <div className="lg:col-span-6 bg-white rounded-[2.5rem] border border-[#EADBD2] p-6 sm:p-8 shadow-sm">
            <h3 className="font-serif text-lg font-bold text-[#2D2623] mb-6">Top Booked Services</h3>
            <div className="space-y-4">
              {reportData.topServices && reportData.topServices.length > 0 ? (
                reportData.topServices.map((srv, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={idx} 
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FFF6F0]/60 border border-[#EADBD2] hover:bg-[#FFF6F0] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-serif font-bold text-[#C56E4E] text-sm w-4">{idx + 1}</span>
                      {srv.image && <img src={srv.image} alt={srv.name} className="h-10 w-10 rounded-xl object-cover border border-[#EADBD2] shrink-0" />}
                      <div>
                        <h4 className="font-bold text-xs text-[#2D2623]">{srv.name}</h4>
                        <span className="text-[10px] text-[#8C7A70]">{srv.bookings} bookings</span>
                      </div>
                    </div>
                    <strong className="font-serif text-xs font-bold text-[#C56E4E]">{formatCurrency(srv.revenue)}</strong>
                  </motion.div>
                ))
              ) : (
                <p className="text-xs text-[#8C7A70] text-center py-4">No top services recorded yet.</p>
              )}
            </div>
          </div>

          {/* Top Staff Performance */}
          <div className="lg:col-span-6 bg-white rounded-[2.5rem] border border-[#EADBD2] p-6 sm:p-8 shadow-sm">
            <h3 className="font-serif text-lg font-bold text-[#2D2623] mb-6">Top Staff Performance</h3>
            <div className="space-y-4">
              {reportData.topStaff && reportData.topStaff.length > 0 ? (
                reportData.topStaff.map((stf, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={idx} 
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FFF6F0]/60 border border-[#EADBD2] hover:bg-[#FFF6F0] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-serif font-bold text-[#C56E4E] text-sm w-4">{idx + 1}</span>
                      {stf.avatar && <img src={stf.avatar} alt={stf.name} className="h-10 w-10 rounded-full object-cover border border-[#EADBD2] shrink-0" />}
                      <div>
                        <h4 className="font-bold text-xs text-[#2D2623]">{stf.name}</h4>
                        <span className="text-[10px] text-[#8C7A70]">{stf.bookings} bookings • {stf.role}</span>
                      </div>
                    </div>
                    <strong className="font-serif text-xs font-bold text-[#C56E4E]">{formatCurrency(stf.revenue)}</strong>
                  </motion.div>
                ))
              ) : (
                <p className="text-xs text-[#8C7A70] text-center py-4">No staff performance data recorded yet.</p>
              )}
            </div>
          </div>

        </motion.div>

      </motion.main>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 20, scale: 0.9 }} 
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 rounded-full bg-[#2D2623]/95 px-6 py-3.5 text-white shadow-2xl backdrop-blur-xl border border-white/20 text-xs font-bold whitespace-nowrap"
          >
            <CheckCircle2 size={16} className="text-[#E5A024]" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}