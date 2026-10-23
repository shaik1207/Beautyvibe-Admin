import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CreditCard, 
  Sparkles, 
  RotateCcw, 
  Check, 
  X, 
  CheckCircle2, 
  IndianRupee, 
  ShieldCheck,
  RefreshCw 
} from "lucide-react";
import { io } from "socket.io-client";
import DataTable from "./../components/DataTable";
import StatCard from "./../components/StatCard";
import API from "./../utils/axios";

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 70, damping: 20 } }
};

export default function Payments() {
  const [activeTab, setActiveTab] = useState("Transactions");
  const [transactions, setTransactions] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: "₹0",
    successfulPayments: 0,
    pendingSettlements: "₹0",
    refundsIssued: "₹0"
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchFinancials = async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/payments");
      if (res.data?.success && res.data.data) {
        setTransactions(res.data.data.transactions || []);
        setRefunds(res.data.data.refunds || []);
        setStats(res.data.data.stats || {
          totalRevenue: "₹0",
          successfulPayments: 0,
          pendingSettlements: "₹0",
          refundsIssued: "₹0"
        });
      }
    } catch (err) {
      console.error("Failed to fetch financials:", err);
      showToast("⚠️ Unable to load live financial data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();

    const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
    const socket = io(socketUrl, {
      transports: ["polling", "websocket"]
    });

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));

    // Listen for booking updates to refresh revenue automatically
    socket.on("appointmentUpdated", () => {
      fetchFinancials();
    });

    socket.on("refundUpdated", (updated) => {
      setRefunds(prev => prev.map(r => ((r.id && r.id === updated.id) || r._id === updated._id || r.refundId === updated.refundId) ? updated : r));
      showToast(`✨ Refund request status updated.`);
      fetchFinancials();
    });

    return () => socket.disconnect();
  }, []);

  const handleUpdateRefund = async (id, status) => {
    try {
      const res = await API.patch(`/api/payments/refunds/${id}`, { status });
      if (res.data?.success) {
        setRefunds(prev => prev.map(r => ((r.id && r.id === id) || r._id === id || r.refundId === id ? res.data.data : r)));
        showToast(status === "Approved" ? `✨ Refund request approved!` : `❌ Refund request rejected.`);
        fetchFinancials();
      }
    } catch (err) {
      console.error("Update refund error:", err);
      showToast("❌ Failed to update refund status.");
    }
  };

  // Transaction Table Columns
  const transactionColumns = [
    { 
      header: "Transaction ID", 
      accessor: "transactionId",
      render: (row) => <strong className="font-mono text-xs text-[#2D2623]">{row.transactionId || `#${row.id || row._id}`}</strong>
    },
    { 
      header: "Customer & Service", 
      accessor: "customer",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <img src={row.avatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80"} alt={row.customer} className="h-8 w-8 rounded-full object-cover shrink-0 border border-[#EADBD2]" />
          <div>
            <p className="font-bold text-[#2D2623]">{row.customer || 'Client'}</p>
            <span className="text-[10px] text-[#8C7A70]">{row.service || 'Service Ritual'}</span>
          </div>
        </div>
      )
    },
    { 
      header: "Amount Paid", 
      accessor: "amount",
      render: (row) => <span className="font-serif font-bold text-[#C56E4E]">₹{Number(row.amount || 0).toLocaleString("en-IN")}</span>
    },
    { 
      header: "Payment Mode", 
      accessor: "method",
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFF6F0] text-[#C56E4E] border border-[#EADBD2]">
          <CreditCard size={12} /> {row.method || "UPI / GPay"}
        </span>
      )
    },
    { 
      header: "Status", 
      accessor: "status",
      render: (row) => (
        <span className={`text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
          row.status === "Success" || row.status === "Completed" ? "bg-[#EBF7EE] text-[#1E9E4A] border border-[#D1EED7]" :
          row.status === "Pending" ? "bg-[#FFF8E6] text-[#E5A024] border border-[#FEEFAB]" :
          "bg-[#FDF2F2] text-[#B33A3A] border border-[#F8D7DA]"
        }`}>
          {row.status || "Success"}
        </span>
      )
    },
  ];

  // Refund Table Columns
  const refundColumns = [
    { 
      header: "Refund ID", 
      accessor: "refundId",
      render: (row) => <strong className="font-mono text-xs text-[#2D2623]">{row.refundId || `#${row.id || row._id}`}</strong>
    },
    { 
      header: "Customer", 
      accessor: "customer",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <img src={row.avatar || "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&q=80"} alt={row.customer} className="h-8 w-8 rounded-full object-cover shrink-0 border border-[#EADBD2]" />
          <div>
            <p className="font-bold text-[#2D2623]">{row.customer || 'Client'}</p>
            <span className="text-[10px] text-[#8C7A70]">{row.service || 'Service'}</span>
          </div>
        </div>
      )
    },
    { 
      header: "Refund Amount", 
      accessor: "amount",
      render: (row) => <span className="font-serif font-bold text-[#C56E4E]">₹{Number(row.amount || 0).toLocaleString("en-IN")}</span>
    },
    { 
      header: "Reason", 
      accessor: "reason",
      render: (row) => <span className="font-medium text-[#5C4841] italic">"{row.reason || 'Booking Cancelled'}"</span>
    },
    { 
      header: "Status", 
      accessor: "status",
      render: (row) => (
        <span className={`text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
          row.status === "Approved" || row.status === "Processed" ? "bg-[#EBF7EE] text-[#1E9E4A] border border-[#D1EED7]" :
          row.status === "Pending" ? "bg-[#FFF8E6] text-[#E5A024] border border-[#FEEFAB]" :
          "bg-[#FDF2F2] text-[#B33A3A] border border-[#F8D7DA]"
        }`}>
          {row.status || 'Processed'}
        </span>
      )
    },
    { 
      header: "Actions", 
      accessor: "actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.status === "Pending" ? (
            <>
              <button
                onClick={() => handleUpdateRefund(row.id || row._id, "Approved")}
                title="Approve Refund"
                className="h-8 w-8 rounded-xl bg-[#EBF7EE] text-[#1E9E4A] border border-[#D1EED7] flex items-center justify-center hover:bg-[#1E9E4A] hover:text-white transition-all shadow-sm cursor-pointer"
              >
                <Check size={15} />
              </button>
              <button
                onClick={() => handleUpdateRefund(row.id || row._id, "Rejected")}
                title="Reject Refund"
                className="h-8 w-8 rounded-xl bg-[#FDF2F2] text-[#B33A3A] border border-[#F8D7DA] flex items-center justify-center hover:bg-[#B33A3A] hover:text-white transition-all shadow-sm cursor-pointer"
              >
                <X size={15} />
              </button>
            </>
          ) : (
            <span className="text-[10px] text-[#8C7A70] italic font-medium">Completed</span>
          )}
        </div>
      )
    },
  ];

  return (
    <div className="flex-1 min-w-0 bg-[#FCF9F6] font-sans selection:bg-[#C56E4E] selection:text-white pb-28 text-[#2D2623] relative">
      <motion.main variants={staggerContainer} initial="hidden" animate="show" className="max-w-[1440px] mx-auto space-y-8 px-4 sm:px-6 pt-6">
        
        {/* Header & Tabs */}
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-[2.5rem] border border-[#EADBD2] p-6 sm:p-8 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF6F0] border border-[#EADBD2] px-4 py-1.5 mb-3 shadow-sm">
              <Sparkles size={14} className="text-[#C56E4E]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C7A70]">Financial Management</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2D2623]">Payments & Refunds</h1>
            <p className="text-xs text-[#8C7A70] mt-1">Live database tracking of client transactions, payment modes, and refund requests.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[#FFF6F0] border border-[#EADBD2] px-4 py-2.5 rounded-2xl text-xs font-bold text-[#5C4841] shadow-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${socketConnected ? "bg-[#1E9E4A]" : "bg-[#E5A024]"}`} />
              <span>{socketConnected ? "Live 🟢" : "Connecting..."}</span>
            </div>
            <button onClick={fetchFinancials} className="h-10 w-10 rounded-2xl bg-[#FFF6F0] border border-[#EADBD2] flex items-center justify-center text-[#C56E4E] hover:bg-[#C56E4E] hover:text-white transition-all cursor-pointer">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <div className="flex gap-1.5 bg-[#FFF6F0] p-1.5 rounded-full border border-[#EADBD2]">
              {["Transactions", "Refund Requests"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab ? "bg-[#C56E4E] text-white shadow-md" : "text-[#8C7A70] hover:text-[#2D2623]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stat Cards */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard title="Total Revenue" value={stats.totalRevenue} change="Verified Revenue" isPositive={true} icon={IndianRupee} />
          <StatCard title="Successful Payments" value={stats.successfulPayments} change="Completed Services" isPositive={true} icon={CreditCard} />
          <StatCard title="Pending Settlements" value={stats.pendingSettlements} change="Awaiting Completion" isPositive={true} icon={ShieldCheck} />
          <StatCard title="Refunds Issued" value={stats.refundsIssued} change="Rejected/Cancelled" isPositive={false} icon={RotateCcw} />
        </motion.div>

        {/* Conditional Data Table */}
        <motion.div variants={fadeUp}>
          {loading && transactions.length === 0 ? (
            <div className="py-24 text-center bg-white rounded-[2.5rem] border border-[#EADBD2]">
              <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-[#C56E4E]" />
              <p className="text-xs font-bold uppercase tracking-wider text-[#8C7A70]">Loading financial records...</p>
            </div>
          ) : activeTab === "Transactions" ? (
            <DataTable 
              columns={transactionColumns} 
              data={transactions} 
              searchKey="customer" 
              searchPlaceholder="Search transaction by customer..." 
            />
          ) : (
            <DataTable 
              columns={refundColumns} 
              data={refunds} 
              searchKey="customer" 
              searchPlaceholder="Search refund request by customer..." 
            />
          )}
        </motion.div>

      </motion.main>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-full bg-[#2D2623]/95 px-6 py-3.5 text-white shadow-2xl backdrop-blur-xl border border-white/20 text-xs font-bold whitespace-nowrap">
            <CheckCircle2 size={16} className="text-[#E5A024]" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}