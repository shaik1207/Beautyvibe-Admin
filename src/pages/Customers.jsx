import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Sparkles, 
  Plus, 
  X, 
  Trash2, 
  ShieldAlert,
  ShieldCheck, 
  CheckCircle2,
  RefreshCw,
  Shield,
  UserCheck
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

// Google SVG Icon for Firebase / Google Auth users
function GoogleIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" fill="#4285F4"/>
      <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.2v3.15C3.18 21.3 7.23 24 12 24z" fill="#34A853"/>
      <path d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.2C.44 8.1 0 9.99 0 12s.44 3.9 1.2 5.42l4.08-3.15z" fill="#FBBC05"/>
      <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.18 2.7 1.2 6.58l4.08 3.15c.95-2.83 3.6-4.98 6.72-4.98z" fill="#EA4335"/>
    </svg>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  
  // Role Filter State: 'all' | 'admin' | 'user'
  const [roleFilter, setRoleFilter] = useState("all");

  // New Customer Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState("user");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/customers");
      const raw = res.data?.data || res.data || [];
      if (Array.isArray(raw)) {
        setCustomers(raw);
      } else {
        setCustomers([]);
      }
    } catch (err) {
      console.error("Failed to fetch real customers:", err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const firebaseUserEmail = localStorage.getItem("beautyvibe_user_email") || localStorage.getItem("email") || "";
    const firebaseUserName = localStorage.getItem("beautyvibe_user_name") || localStorage.getItem("displayName") || "";
    const firebaseUserAvatar = localStorage.getItem("beautyvibe_user_avatar") || localStorage.getItem("photoURL") || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80";

    if (firebaseUserEmail) {
      API.post("/api/customers", {
        name: firebaseUserName || "Google User",
        email: firebaseUserEmail,
        avatar: firebaseUserAvatar,
        status: "VIP Member",
        authProvider: "google",
        role: "user"
      }).then(() => {
        fetchCustomers();
      }).catch(e => console.log("Firebase Auth sync error:", e));
    } else {
      fetchCustomers();
    }

    const socket = io("http://localhost:5000", {
      transports: ["polling", "websocket"]
    });

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("customerUpdated", (updated) => {
      setCustomers(prev => {
        const index = prev.findIndex(c => (c.id && c.id === updated.id) || c.email === updated.email);
        if (index !== -1) {
          const copy = [...prev];
          copy[index] = { ...copy[index], ...updated };
          return copy;
        }
        return [updated, ...prev];
      });
    });

    socket.on("customerDeleted", (deletedId) => {
      setCustomers(prev => prev.filter(c => c.id !== deletedId && c._id !== deletedId));
    });

    return () => socket.disconnect();
  }, []);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    try {
      const payload = {
        name: newName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim() || "+91 98765 43210",
        status: "Active",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80",
        authProvider: "local",
        role: newRole
      };

      const res = await API.post("/api/customers", payload);
      if (res.data?.success) {
        setNewName("");
        setNewEmail("");
        setNewPhone("");
        setNewRole("user");
        setIsModalOpen(false);
        showToast(`✨ Record for "${payload.name}" added successfully!`);
        fetchCustomers();
      }
    } catch (err) {
      console.error("Add customer error:", err);
      showToast("❌ Failed to add record.");
    }
  };

  const handleToggleBlock = async (cust) => {
    const newStatus = cust.status === "Blocked" ? "Active" : "Blocked";
    const customerId = cust.id || cust._id;
    try {
      const res = await API.patch(`/api/customers/${customerId}/status`, { status: newStatus });
      if (res.data?.success) {
        setCustomers(prev => prev.map(c => ((c.id || c._id) === customerId ? res.data.data : c)));
        showToast(newStatus === "Blocked" ? `🚫 User ${cust.name} has been blocked.` : `✅ User ${cust.name} unblocked.`);
      }
    } catch (err) {
      console.error("Status update error:", err);
      showToast("❌ Failed to update status.");
    }
  };

  const handleDeleteCustomer = async (id) => {
    try {
      await API.delete(`/api/customers/${id}`);
      setCustomers(prev => prev.filter(c => c.id !== id && c._id !== id));
      showToast(`🗑️ Record deleted successfully.`);
    } catch (err) {
      console.error("Delete error:", err);
      showToast("❌ Failed to delete record.");
    }
  };

  // Filter customers based on selected role tab
  const filteredCustomers = customers.filter(c => {
    if (roleFilter === "admin") return c.role === "admin";
    if (roleFilter === "user") return c.role === "user" || !c.role;
    return true; // 'all'
  });

  const columns = [
    { 
      header: "ID", 
      accessor: "id",
      render: (row) => <strong className="font-mono text-[11px] text-[#2D2623]">#{row.id || row._id}</strong>
    },
    { 
      header: "Profile & Authentication", 
      accessor: "name",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={row.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80"} alt={row.name} className="h-9 w-9 rounded-full object-cover shrink-0 border border-[#EADBD2] shadow-sm" />
            {row.authProvider === "google" && (
              <span className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow border border-[#EADBD2]" title="Authenticated via Google">
                <GoogleIcon size={11} />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-[#2D2623]">{row.name}</p>
              {row.authProvider === "google" && (
                <span className="bg-[#EBF7EE] text-[#1E9E4A] text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                  <GoogleIcon size={9} /> Google
                </span>
              )}
            </div>
            <span className="text-[10px] text-[#8C7A70]">{row.email}</span>
          </div>
        </div>
      )
    },
    {
      header: "System Role",
      accessor: "role",
      render: (row) => {
        const isAdmin = row.role === "admin";
        return (
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
            isAdmin ? "bg-[#FFF2EE] text-[#C56E4E] border-[#F8D7DA]" : "bg-[#F0F4F8] text-[#3B82F6] border-[#D2E3FC]"
          }`}>
            {isAdmin ? <Shield size={11} /> : <UserCheck size={11} />}
            {isAdmin ? "Admin" : "User"}
          </span>
        );
      }
    },
    { 
      header: "Phone", 
      accessor: "phone",
      render: (row) => <span className="font-medium text-[#5C4841]">{row.phone || "+91 98765 43210"}</span>
    },
    { 
      header: "Bookings", 
      accessor: "bookings",
      render: (row) => <span className="font-serif font-bold text-[#2D2623]">{row.bookings || 0} sessions</span>
    },
    { 
      header: "Spent", 
      accessor: "spent",
      render: (row) => <span className="font-serif font-bold text-[#C56E4E]">₹{Number(row.spent || 0).toLocaleString("en-IN")}</span>
    },
    { 
      header: "Status", 
      accessor: "status",
      render: (row) => (
        <span className={`text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
          row.status === "VIP Member" ? "bg-[#FFF6F0] text-[#C56E4E] border border-[#EADBD2]" :
          row.status === "Active" ? "bg-[#EBF7EE] text-[#1E9E4A] border border-[#D1EED7]" :
          row.status === "Blocked" ? "bg-[#FDF2F2] text-[#B33A3A] border border-[#F8D7DA]" :
          "bg-[#F0F4F8] text-[#3B82F6] border border-[#D2E3FC]"
        }`}>
          {row.status}
        </span>
      )
    },
    { 
      header: "Actions", 
      accessor: "actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleToggleBlock(row)}
            title={row.status === "Blocked" ? "Unblock User" : "Block User"}
            className={`h-8 px-3 rounded-xl border flex items-center gap-1 text-[10px] font-bold transition-all shadow-sm cursor-pointer ${
              row.status === "Blocked" 
                ? "bg-[#EBF7EE] text-[#1E9E4A] border-[#D1EED7] hover:bg-[#1E9E4A] hover:text-white" 
                : "bg-[#FFF8E6] text-[#E5A024] border-[#FEEFAB] hover:bg-[#E5A024] hover:text-white"
            }`}
          >
            {row.status === "Blocked" ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
            {row.status === "Blocked" ? "Unblock" : "Block"}
          </button>

          <button
            onClick={() => handleDeleteCustomer(row.id || row._id)}
            title="Delete Record"
            className="h-8 w-8 rounded-xl bg-[#FDF2F2] text-[#B33A3A] border border-[#F8D7DA] flex items-center justify-center hover:bg-[#B33A3A] hover:text-white transition-all shadow-sm cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </div>
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
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C7A70]">Directory & Role Management</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2D2623]">Manage Users & Customers</h1>
            <p className="text-xs text-[#8C7A70] mt-1">Filter accounts by role, oversee database records, and manage Google / Firebase Auth sync.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[#FFF6F0] border border-[#EADBD2] px-4 py-2.5 rounded-2xl text-xs font-bold text-[#5C4841] shadow-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${socketConnected ? "bg-[#1E9E4A]" : "bg-[#E5A024]"}`} />
              <span>{socketConnected ? "Live Sync 🟢" : "Connecting..."}</span>
            </div>
            <button onClick={fetchCustomers} className="h-10 w-10 rounded-2xl bg-[#FFF6F0] border border-[#EADBD2] flex items-center justify-center text-[#C56E4E] hover:bg-[#C56E4E] hover:text-white transition-all cursor-pointer">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-full bg-[#C56E4E] px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg hover:bg-[#A35539] transition-all cursor-pointer">
              <Plus size={16} /> Add Record
            </motion.button>
          </div>
        </motion.div>

        {/* Role Filter Tabs */}
        <motion.div variants={fadeUp} className="flex items-center gap-2 border-b border-[#EADBD2] pb-4">
          <span className="text-xs font-bold text-[#8C7A70] mr-2">Filter By Role:</span>
          <button 
            onClick={() => setRoleFilter("all")} 
            className={`px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${roleFilter === "all" ? "bg-[#C56E4E] text-white shadow-sm" : "bg-white text-[#8C7A70] border border-[#EADBD2] hover:border-[#C56E4E]"}`}
          >
            All Accounts ({customers.length})
          </button>
          <button 
            onClick={() => setRoleFilter("admin")} 
            className={`px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${roleFilter === "admin" ? "bg-[#C56E4E] text-white shadow-sm" : "bg-white text-[#8C7A70] border border-[#EADBD2] hover:border-[#C56E4E]"}`}
          >
            Admins ({customers.filter(c => c.role === "admin").length})
          </button>
          <button 
            onClick={() => setRoleFilter("user")} 
            className={`px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${roleFilter === "user" ? "bg-[#C56E4E] text-white shadow-sm" : "bg-white text-[#8C7A70] border border-[#EADBD2] hover:border-[#C56E4E]"}`}
          >
            Customers ({customers.filter(c => c.role === "user" || !c.role).length})
          </button>
        </motion.div>

        {/* Data Table */}
        <motion.div variants={fadeUp}>
          {loading && customers.length === 0 ? (
            <div className="py-24 text-center bg-white rounded-[2.5rem] border border-[#EADBD2]">
              <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-[#C56E4E]" />
              <p className="text-xs font-bold uppercase tracking-wider text-[#8C7A70]">Loading accounts and directory profiles...</p>
            </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={filteredCustomers} 
              searchKey="name" 
              searchPlaceholder="Search by name or email..." 
            />
          )}
        </motion.div>

      </motion.main>

      {/* Add Customer / Admin Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="fixed inset-0 z-50 bg-[#2D2623]/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="fixed inset-0 z-50 m-auto max-w-md w-[92%] h-fit rounded-[2.5rem] bg-white p-6 sm:p-8 shadow-2xl border border-[#EADBD2]">
              <div className="flex items-center justify-between pb-4 border-b border-[#EADBD2] mb-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#C56E4E]">Directory</span>
                  <h3 className="font-serif text-xl font-bold text-[#2D2623]">Add New Account</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-[#FFF6F0] text-[#8C7A70] hover:text-[#C56E4E] transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Full Name</label>
                  <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Ananya Rao" className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Email Address</label>
                  <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="e.g. ananya@gmail.com" className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Phone Number</label>
                  <input type="text" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="e.g. +91 98765 43215" className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Account Role</label>
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white cursor-pointer">
                    <option value="user">Customer / User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <button type="submit" className="w-full mt-4 py-3.5 rounded-full bg-[#C56E4E] text-white text-xs font-bold uppercase tracking-wider shadow-lg hover:bg-[#A35539] transition-colors flex items-center justify-center gap-2 cursor-pointer">
                  <Plus size={16} /> Save Record
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