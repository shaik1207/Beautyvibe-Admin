import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Tag, 
  Sparkles, 
  Plus, 
  X, 
  Trash2, 
  CheckCircle2, 
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { io } from "socket.io-client";
import DataTable from "./../components/DataTable";
import API from "./../utils/axios";

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 70, damping: 20 } }
};

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // New Coupon Form State
  const [couponCode, setCouponCode] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState("Percentage");
  const [expiryDateInput, setExpiryDateInput] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/offers");
      const raw = res.data?.data || res.data || [];
      if (Array.isArray(raw)) {
        setOffers(raw);
        sessionStorage.setItem("beautyvibe_active_offers", JSON.stringify(raw.filter(o => o.status === "Active")));
      } else {
        setOffers([]);
      }
    } catch (err) {
      console.error("Failed to fetch offers:", err);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();

    const socket = io("http://localhost:5000", {
      transports: ["polling", "websocket"]
    });

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("offerUpdated", (updated) => {
      setOffers(prev => {
        const index = prev.findIndex(o => (o.id && o.id === updated.id) || o._id === updated._id);
        if (index !== -1) {
          const copy = [...prev];
          copy[index] = { ...copy[index], ...updated };
          return copy;
        }
        return [updated, ...prev];
      });
      showToast(`✨ Promo coupon published: ${updated.code}`);
    });

    socket.on("offerDeleted", (deletedId) => {
      setOffers(prev => prev.filter(o => o.id !== deletedId && o._id !== deletedId));
      showToast(`🗑️ Coupon removed.`);
    });

    socket.on("expiredOffersCleared", () => {
      fetchOffers();
      showToast(`🗑️ Expired coupons cleaned up.`);
    });

    return () => socket.disconnect();
  }, []);

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim() || !discountValue.trim() || !expiryDateInput) return;

    try {
      const payload = {
        code: couponCode.trim().toUpperCase(),
        discount: discountType === "Percentage" ? `${discountValue}% OFF` : `₹${discountValue} Flat`,
        type: discountType,
        expiryDate: expiryDateInput
      };

      const res = await API.post("/api/offers", payload);
      if (res.data?.success) {
        setCouponCode("");
        setDiscountValue("");
        setExpiryDateInput("");
        setIsModalOpen(false);
        showToast(`✨ Coupon "${payload.code}" created successfully!`);
        fetchOffers();
      }
    } catch (err) {
      console.error("Create offer error:", err);
      showToast("❌ Failed to create coupon.");
    }
  };

  const handleDeleteOffer = async (id) => {
    try {
      await API.delete(`/api/offers/${id}`);
      setOffers(prev => prev.filter(o => o.id !== id && o._id !== id));
      showToast(`🗑️ Coupon removed.`);
    } catch (err) {
      console.error("Delete offer error:", err);
      showToast("❌ Failed to delete offer.");
    }
  };

  const handleDeleteAllExpired = async () => {
    try {
      await API.delete("/api/offers/expired");
      setOffers(prev => prev.filter(o => o.status !== "Expired"));
      showToast(`🗑️ All expired coupons cleaned up successfully.`);
    } catch (err) {
      console.error("Bulk delete error:", err);
      showToast("❌ Failed to delete expired coupons.");
    }
  };

  const expiredCount = offers.filter(o => o.status === "Expired").length;

  const columns = [
    { 
      header: "Coupon Code", 
      accessor: "code",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-[#FFF6F0] text-[#C56E4E] flex items-center justify-center border border-[#EADBD2] shrink-0 font-bold text-xs shadow-sm">
            <Tag size={14} />
          </div>
          <strong className="font-mono text-base text-[#2D2623]">{row.code}</strong>
        </div>
      )
    },
    { 
      header: "Discount Value", 
      accessor: "discount",
      render: (row) => <span className="font-serif font-bold text-[#C56E4E] text-sm">{row.discount}</span>
    },
    { 
      header: "Offer Type", 
      accessor: "type",
      render: (row) => <span className="font-medium text-[#5C4841]">{row.type}</span>
    },
    { 
      header: "Expiry Date", 
      accessor: "expiry",
      render: (row) => <span className="font-medium text-[#8C7A70]">{row.expiry || row.expiryDate}</span>
    },
    { 
      header: "Usage Stats", 
      accessor: "usage",
      render: (row) => <span className="text-xs font-bold text-[#2D2623]">{row.usage || "0 redemptions"}</span>
    },
    { 
      header: "Status", 
      accessor: "status",
      render: (row) => (
        <span className={`text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
          row.status === "Active" 
            ? "bg-[#EBF7EE] text-[#1E9E4A] border border-[#D1EED7]" 
            : "bg-[#FDF2F2] text-[#B33A3A] border border-[#F8D7DA]"
        }`}>
          {row.status}
        </span>
      )
    },
    { 
      header: "Actions", 
      accessor: "actions",
      render: (row) => (
        <button
          onClick={() => handleDeleteOffer(row.id || row._id)}
          title="Delete Offer"
          className="h-8 w-8 rounded-xl bg-[#FDF2F2] text-[#B33A3A] border border-[#F8D7DA] flex items-center justify-center hover:bg-[#B33A3A] hover:text-white transition-all shadow-sm cursor-pointer"
        >
          <Trash2 size={14} />
        </button>
      )
    },
  ];

  return (
    <div className="flex-1 min-w-0 bg-[#FCF9F6] font-sans selection:bg-[#C56E4E] selection:text-white pb-28 text-[#2D2623] relative">
      <motion.main variants={staggerContainer} initial="hidden" animate="show" className="max-w-[1440px] mx-auto space-y-8 px-4 sm:px-6 pt-6">
        
        {/* Header & Controls */}
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-[2.5rem] border border-[#EADBD2] p-6 sm:p-8 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF6F0] border border-[#EADBD2] px-4 py-1.5 mb-3 shadow-sm">
              <Sparkles size={14} className="text-[#C56E4E]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C7A70]">Promotions Management</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2D2623]">Offers & Coupons</h1>
            <p className="text-xs text-[#8C7A70] mt-1">Live database promo codes with automated expiry tracking.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#FFF6F0] border border-[#EADBD2] px-4 py-2.5 rounded-2xl text-xs font-bold text-[#5C4841] shadow-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${socketConnected ? "bg-[#1E9E4A]" : "bg-[#E5A024]"}`} />
              <span>{socketConnected ? "Live 🟢" : "Connecting..."}</span>
            </div>
            <button onClick={fetchOffers} className="h-10 w-10 rounded-2xl bg-[#FFF6F0] border border-[#EADBD2] flex items-center justify-center text-[#C56E4E] hover:bg-[#C56E4E] hover:text-white transition-all cursor-pointer">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-full bg-[#C56E4E] px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg hover:bg-[#A35539] transition-all cursor-pointer">
              <Plus size={16} /> Create New Coupon
            </motion.button>
          </div>
        </motion.div>

        {/* Expired Coupons Notification Banner */}
        {expiredCount > 0 && (
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FDF2F2] border border-[#F8D7DA] p-4 sm:p-6 rounded-[2rem] shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#F8D7DA] text-[#B33A3A] flex items-center justify-center shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h4 className="font-serif text-sm font-bold text-[#B33A3A]">Expired Coupons Detected ({expiredCount})</h4>
                <p className="text-xs text-[#8C7A70]">Some promo codes have passed their expiry date and are no longer valid for checkout.</p>
              </div>
            </div>
            <button 
              onClick={handleDeleteAllExpired}
              className="px-5 py-2.5 rounded-full bg-[#B33A3A] text-white text-xs font-bold uppercase tracking-wider shadow-md hover:bg-[#992C2C] transition-colors cursor-pointer shrink-0"
            >
              Proceed to Delete Expired
            </button>
          </motion.div>
        )}

        {/* Data Table */}
        <motion.div variants={fadeUp}>
          {loading && offers.length === 0 ? (
            <div className="py-24 text-center bg-white rounded-[2.5rem] border border-[#EADBD2]">
              <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-[#C56E4E]" />
              <p className="text-xs font-bold uppercase tracking-wider text-[#8C7A70]">Loading real database coupons...</p>
            </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={offers} 
              searchKey="code" 
              searchPlaceholder="Search coupon code..." 
            />
          )}
        </motion.div>

      </motion.main>

      {/* CREATE COUPON MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="fixed inset-0 z-50 bg-[#2D2623]/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="fixed inset-0 z-50 m-auto max-w-md w-[92%] h-fit rounded-[2.5rem] bg-white p-6 sm:p-8 shadow-2xl border border-[#EADBD2]">
              <div className="flex items-center justify-between pb-4 border-b border-[#EADBD2] mb-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#C56E4E]">Promos</span>
                  <h3 className="font-serif text-xl font-bold text-[#2D2623]">Create Promo Coupon</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-[#FFF6F0] text-[#8C7A70] hover:text-[#C56E4E] transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateCoupon} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Coupon Code *</label>
                  <input type="text" required value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="e.g. SUMMER30" className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-bold uppercase text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white placeholder:normal-case" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Discount Type</label>
                    <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-3 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E]">
                      <option value="Percentage">Percentage (%)</option>
                      <option value="Flat Amount">Flat Amount (₹)</option>
                      <option value="First Booking">First Booking</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Discount Value *</label>
                    <input type="text" required value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountType === "Percentage" ? "e.g. 25" : "e.g. 200"} className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Expiry Date Selector *</label>
                  <input type="date" required value={expiryDateInput} onChange={(e) => setExpiryDateInput(e.target.value)} className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white" />
                </div>

                <button type="submit" className="w-full mt-4 py-3.5 rounded-full bg-[#C56E4E] text-white text-xs font-bold uppercase tracking-wider shadow-lg hover:bg-[#A35539] transition-colors flex items-center justify-center gap-2 cursor-pointer">
                  <Plus size={16} /> Save & Publish Coupon
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-full bg-[#2D2623]/95 px-6 py-3.5 text-white shadow-2xl backdrop-blur-xl border border-white/20 text-xs font-bold">
            <CheckCircle2 size={16} className="text-[#E5A024]" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}