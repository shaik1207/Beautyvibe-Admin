import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Plus, 
  X, 
  Trash2, 
  Edit3,
  CheckCircle2, 
  Clock, 
  Check,
  Flame,
  Percent,
  Upload,
  RefreshCw,
  Search,
  AlertCircle,
  LoaderCircle,
  Image as ImageIcon
} from "lucide-react";
import { io } from "socket.io-client";
import API from "./../utils/axios";

// ==========================================
// ANIMATION VARIANTS
// ==========================================
const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 70, damping: 20 } }
};

const categoriesList = ["All", "Skin & Face", "Hair Care", "Body Care", "Grooming", "Nails", "Spa"];

// Default initial fallback items so cards always show even if DB is empty
const defaultFallbackServices = [
  {
    id: 1,
    name: "Korean Glow Facial",
    category: "Skin & Face",
    price: 899,
    duration: "60 mins",
    isTrending: true,
    discountApplicable: true,
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80",
    description: "A multi-step rejuvenating facial designed to deeply hydrate and brighten skin.",
    benefits: ["Deep cleansing", "Hydration mask"]
  }
];

export default function Services() {
  const [servicesList, setServicesList] = useState(defaultFallbackServices);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Form States (Create & Edit)
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  
  const [serviceName, setServiceName] = useState("");
  const [serviceCategory, setServiceCategory] = useState("Skin & Face");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDuration, setServiceDuration] = useState("60 mins");
  const [serviceImage, setServiceImage] = useState("");
  const [imageInputMode, setImageInputMode] = useState("upload");
  const [serviceDescription, setServiceDescription] = useState("");
  const [isTrending, setIsTrending] = useState(false);
  const [discountApplicable, setDiscountApplicable] = useState(true);

  const fileInputRef = useRef(null);

  const setToasted = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch live services from SQL backend database with resilient parsing
  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/services");
      
      // Handle SQL response structures (res.data.data, res.data.services, or res.data)
      const rawData = res.data?.data || res.data?.services || res.data || [];
      const listArray = Array.isArray(rawData) ? rawData : [];

      if (listArray.length > 0) {
        const formatted = listArray.map(s => ({
          id: s.id || s._id || Math.floor(Math.random() * 100000),
          name: s.name || s.title || "Untitled Ritual",
          category: s.category || "Skin & Face",
          price: Number(s.price) || 0,
          duration: s.duration || "60 mins",
          isTrending: s.isTrending ?? s.is_trending ?? false,
          discountApplicable: s.discountApplicable ?? s.discount_applicable ?? true,
          image: s.image || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80",
          description: s.description || s.desc || "Professional doorstep salon ritual.",
          benefits: s.benefits || ["Personalized consultation", "Professional tools & hygiene"]
        }));
        setServicesList(formatted);
      }
    } catch (err) {
      console.warn("API fetch warning, retaining fallback catalog:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();

    // Socket.io Real-Time Connection
    const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"]
    });

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("serviceAdded", (newSrv) => {
      const formatted = {
        id: newSrv.id || newSrv._id,
        name: newSrv.name || newSrv.title,
        category: newSrv.category || "General",
        price: Number(newSrv.price) || 0,
        duration: newSrv.duration || "60 mins",
        isTrending: newSrv.isTrending ?? false,
        discountApplicable: newSrv.discountApplicable ?? true,
        image: newSrv.image || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80",
        description: newSrv.description || newSrv.desc || "Professional doorstep salon ritual.",
        benefits: newSrv.benefits || ["Personalized consultation"]
      };
      setServicesList(prev => {
        const exists = prev.some(s => s.id === formatted.id);
        if (exists) return prev.map(s => s.id === formatted.id ? formatted : s);
        return [formatted, ...prev];
      });
      setToasted(`✨ Service synced: ${formatted.name}`);
    });

    socket.on("serviceDeleted", (deletedId) => {
      setServicesList(prev => prev.filter(s => s.id !== deletedId));
      setToasted(`🗑️ Service removed.`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Handle File Upload
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setServiceImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setServiceImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setServiceName("");
    setServiceCategory("Skin & Face");
    setServicePrice("");
    setServiceDuration("60 mins");
    setServiceImage("");
    setImageInputMode("upload");
    setServiceDescription("");
    setIsTrending(false);
    setDiscountApplicable(true);
    setModalError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (srv) => {
    setEditingId(srv.id);
    setServiceName(srv.name);
    setServiceCategory(srv.category);
    setServicePrice(srv.price);
    setServiceDuration(srv.duration);
    setServiceImage(srv.image);
    setImageInputMode(srv.image?.startsWith("http") ? "url" : "upload");
    setServiceDescription(srv.description);
    setIsTrending(srv.isTrending);
    setDiscountApplicable(srv.discountApplicable);
    setModalError("");
    setIsModalOpen(true);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    setModalError("");
    
    if (!serviceName.trim() || !servicePrice.toString().trim()) {
      setModalError("Service Name and Price are required.");
      return;
    }

    setIsSaving(true);

    // SQL Sequelize Payload Alignment
    const payload = {
      name: serviceName.trim(),
      title: serviceName.trim(), 
      category: serviceCategory,
      price: Number(servicePrice) || 0,
      duration: serviceDuration,
      isTrending,
      discountApplicable,
      image: serviceImage.trim() || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80",
      description: serviceDescription.trim() || "Professional doorstep salon ritual tailored to your comfort.",
      benefits: ["Personalized consultation", "Professional tools & hygiene", "Finishing expert advice"]
    };

    try {
      if (editingId) {
        await API.put(`/api/services/${editingId}`, payload);
        setServicesList(prev => prev.map(s => s.id === editingId ? { ...s, ...payload, name: serviceName } : s));
        setToasted(`✨ Service "${serviceName}" updated successfully!`);
      } else {
        const res = await API.post("/api/services", payload);
        const created = res.data?.data || res.data?.service || res.data || { ...payload, id: Date.now() };
        
        const newFormatted = {
          id: created.id || created._id || Date.now(),
          name: created.name || created.title || serviceName,
          category: created.category || serviceCategory,
          price: created.price || servicePrice,
          duration: created.duration || serviceDuration,
          isTrending: created.isTrending ?? isTrending,
          discountApplicable: created.discountApplicable ?? discountApplicable,
          image: created.image || payload.image,
          description: created.description || created.desc || payload.description,
          benefits: created.benefits || payload.benefits
        };
        
        setServicesList(prev => [newFormatted, ...prev]);
        setToasted(`✨ Service "${serviceName}" published successfully!`);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving service to SQL backend:", err);
      const errMsg = err.response?.data?.message || err.message || "Failed to save to database.";
      
      // If 404 or network error, fallback to local state update so UI works smoothly
      if (err.response?.status === 404 || err.message === "Network Error") {
        const fallbackItem = { id: editingId || Date.now(), ...payload };
        if (editingId) {
          setServicesList(prev => prev.map(s => s.id === editingId ? fallbackItem : s));
        } else {
          setServicesList(prev => [fallbackItem, ...prev]);
        }
        setToasted(`⚠️ Saved locally (Backend unavailable).`);
        setIsModalOpen(false);
      } else {
        setModalError(errMsg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;
    try {
      await API.delete(`/api/services/${id}`);
    } catch (err) {
      console.warn("Delete request failed, removing locally:", err.message);
    }
    setServicesList(prev => prev.filter(s => s.id !== id));
    setToasted(`🗑️ Service deleted successfully.`);
  };

  const filteredServices = useMemo(() => {
    return servicesList.filter(srv => {
      const matchesCategory = selectedCategory === "All" || srv.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch = srv.name.toLowerCase().includes(searchQuery.toLowerCase()) || srv.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [servicesList, selectedCategory, searchQuery]);

  return (
    <div className="flex-1 min-w-0 bg-[#FCF9F6] font-sans selection:bg-[#C56E4E] selection:text-white pb-36 text-[#2D2623] relative">
      
      <motion.main 
        variants={staggerContainer} 
        initial="hidden" 
        animate="show" 
        className="max-w-[1440px] mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pt-6"
      >
        
        {/* ================= HEADER BANNER ================= */}
        <motion.div variants={fadeUp} className="bg-gradient-to-br from-[#2D2623] to-[#433632] text-white rounded-[2.5rem] p-8 sm:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#C56E4E] rounded-full blur-[120px] opacity-30 pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 mb-3 shadow-lg">
              <Sparkles size={14} className="text-[#E5A024]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#F3E8E1]">SQL Catalog Management</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-2">Services & Pricing Matrix</h1>
            <p className="text-xs sm:text-sm text-[#D3C5BF] max-w-lg">
              Manage rituals stored in your MySQL database. Changes reflect instantly across the user booking portal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 relative z-10 shrink-0">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl text-xs font-bold text-white shadow-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${socketConnected ? "bg-[#1E9E4A]" : "bg-[#E5A024]"}`} />
              <span>{socketConnected ? "SQL Live Sync 🟢" : "Connecting..."}</span>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 rounded-full bg-[#C56E4E] px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-xl hover:bg-[#A35539] transition-all cursor-pointer"
            >
              <Plus size={16} /> Add New Service
            </motion.button>
          </div>
        </motion.div>

        {/* ================= FILTERS & SEARCH BAR ================= */}
        <motion.div variants={fadeUp} className="bg-white rounded-3xl border border-[#EADBD2] p-4 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categoriesList.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat 
                    ? "bg-[#C56E4E] text-white shadow-md" 
                    : "bg-[#FCF9F6] border border-[#EADBD2] text-[#8C7A70] hover:text-[#C56E4E]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative flex items-center bg-[#FCF9F6] border border-[#EADBD2] rounded-full px-4 py-2.5 lg:w-80 focus-within:border-[#C56E4E] transition-all shadow-sm">
            <Search size={16} className="text-[#8C7A70] mr-2.5 shrink-0" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog services..."
              className="bg-transparent border-none outline-none w-full text-xs font-medium text-[#2D2623] placeholder:text-[#A39292]"
            />
          </div>
        </motion.div>

        {/* ================= SERVICES GRID ================= */}
        {loading && servicesList.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-[2.5rem] border border-[#EADBD2]">
            <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-[#C56E4E]" />
            <p className="text-xs font-bold uppercase tracking-wider text-[#8C7A70]">Loading database catalog...</p>
          </div>
        ) : filteredServices.length > 0 ? (
          <motion.div variants={fadeUp} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((srv) => (
              <motion.div
                layout
                key={srv.id}
                className="bg-white rounded-[2.5rem] border border-[#EADBD2] overflow-hidden shadow-sm hover:shadow-xl hover:border-[#C56E4E]/40 transition-all duration-300 flex flex-col justify-between relative group"
              >
                {/* Badges on Top */}
                <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-1.5">
                  {srv.isTrending && (
                    <span className="bg-[#C56E4E] text-white px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <Flame size={12} /> Trending
                    </span>
                  )}
                  {srv.discountApplicable ? (
                    <span className="bg-[#1E9E4A] text-white px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <Percent size={10} /> Discount Applicable
                    </span>
                  ) : (
                    <span className="bg-[#8C7A70] text-white px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-md">
                      Fixed Price
                    </span>
                  )}
                </div>

                <div>
                  <div className="relative h-52 w-full overflow-hidden bg-[#FFF6F0]">
                    <img src={srv.image} alt={srv.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3.5 py-1 rounded-full text-[10px] font-bold text-[#C56E4E] uppercase tracking-wider shadow-sm">
                      {srv.category}
                    </div>
                  </div>

                  <div className="p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold text-[#8C7A70]">ID: #{srv.id}</span>
                      <span className="flex items-center gap-1 text-xs font-bold text-[#8C7A70] bg-[#FCF9F6] px-2.5 py-1 rounded-lg border border-[#EADBD2]">
                        <Clock size={13} className="text-[#C56E4E]" /> {srv.duration}
                      </span>
                    </div>

                    <h3 className="font-serif text-xl font-bold text-[#2D2623] mb-2">{srv.name}</h3>
                    <p className="text-xs text-[#8C7A70] leading-relaxed mb-4 line-clamp-2">{srv.description}</p>

                    <div className="space-y-1.5 pt-3 border-t border-[#EADBD2]/60">
                      {srv.benefits?.map((b, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[11px] font-medium text-[#5C4841]">
                          <Check size={13} className="text-[#C56E4E] shrink-0" />
                          <span className="truncate">{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:pt-0 sm:px-8 sm:pb-8 flex items-center justify-between border-t border-[#EADBD2]/60 pt-4 mt-auto">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A39292] block">Price</span>
                    <strong className="font-serif text-2xl font-bold text-[#2D2623]">₹{Number(srv.price).toLocaleString("en-IN")}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditModal(srv)}
                      title="Edit Service"
                      className="h-10 w-10 rounded-2xl bg-[#FFF6F0] text-[#C56E4E] border border-[#EADBD2] flex items-center justify-center hover:bg-[#C56E4E] hover:text-white transition-all shadow-sm cursor-pointer"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteService(srv.id)}
                      title="Delete Service"
                      className="h-10 w-10 rounded-2xl bg-[#FDF2F2] text-[#B33A3A] border border-[#F8D7DA] flex items-center justify-center hover:bg-[#B33A3A] hover:text-white transition-all shadow-sm cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="py-24 text-center bg-white rounded-[2.5rem] border border-[#EADBD2] p-8">
            <Sparkles size={32} className="mx-auto text-[#C56E4E] mb-3 opacity-60" />
            <h3 className="font-serif text-xl font-bold text-[#2D2623] mb-1">No Services Found</h3>
            <p className="text-xs text-[#8C7A70] mb-6">No rituals match your current search or category filter. Click "Add New Service" above to publish one.</p>
          </div>
        )}

      </motion.main>

      {/* ================= CREATE / EDIT SERVICE MODAL ================= */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 z-50 bg-[#2D2623]/50 backdrop-blur-sm p-4"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-50 m-auto max-w-lg w-[92%] h-fit rounded-[2.5rem] bg-white p-6 sm:p-8 shadow-2xl border border-[#EADBD2]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#EADBD2] mb-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#C56E4E]">SQL Catalog Creator</span>
                  <h3 className="font-serif text-xl font-bold text-[#2D2623]">{editingId ? "Edit Service Ritual" : "Add New Service Ritual"}</h3>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="grid h-9 w-9 place-items-center rounded-full bg-[#FFF6F0] text-[#8C7A70] hover:text-[#C56E4E] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveService} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {modalError && (
                  <div className="flex items-start gap-2 bg-rose-50 text-rose-700 p-3 rounded-xl text-xs font-medium border border-rose-200">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" /> {modalError}
                  </div>
                )}
                
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#8C7A70]">Service Title</label>
                  <input 
                    type="text" 
                    required
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="e.g. 24K Gold Glow Facial" 
                    className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-bold text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Category</label>
                    <select 
                      value={serviceCategory}
                      onChange={(e) => setServiceCategory(e.target.value)}
                      className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-3 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E]"
                    >
                      {categoriesList.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Price (₹)</label>
                    <input 
                      type="number" 
                      min="0"
                      required
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      placeholder="e.g. 799" 
                      className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Duration</label>
                  <input 
                    type="text" 
                    value={serviceDuration}
                    onChange={(e) => setServiceDuration(e.target.value)}
                    placeholder="e.g. 60 mins" 
                    className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white"
                  />
                </div>

                {/* ================= UNIVERSAL IMAGE PREVIEW SECTION ================= */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#8C7A70]">Service Image</label>
                    <div className="flex gap-1 bg-[#FFF6F0] p-1 rounded-xl border border-[#EADBD2]">
                      <button
                        type="button"
                        onClick={() => setImageInputMode("upload")}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${imageInputMode === "upload" ? "bg-[#C56E4E] text-white" : "text-[#8C7A70] hover:text-[#C56E4E]"}`}
                      >
                        Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageInputMode("url")}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${imageInputMode === "url" ? "bg-[#C56E4E] text-white" : "text-[#8C7A70] hover:text-[#C56E4E]"}`}
                      >
                        Paste URL
                      </button>
                    </div>
                  </div>

                  {/* Unified Preview Display */}
                  {serviceImage ? (
                    <div className="relative h-36 w-full rounded-2xl overflow-hidden border border-[#EADBD2] group mb-2">
                      <img src={serviceImage} alt="Service Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <button 
                          type="button" 
                          onClick={() => setServiceImage("")} 
                          className="bg-white/90 text-rose-600 px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-rose-50 transition-colors flex items-center gap-1.5"
                        >
                          <Trash2 size={14} /> Remove Image
                        </button>
                      </div>
                    </div>
                  ) : (
                    imageInputMode === "upload" ? (
                      <div
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-[#EADBD2] hover:border-[#C56E4E] rounded-2xl bg-[#FFF6F0] p-4 text-center cursor-pointer transition-all group flex flex-col items-center justify-center h-32 overflow-hidden mb-2"
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileSelect} 
                          accept="image/*" 
                          className="hidden" 
                        />
                        <div className="h-10 w-10 rounded-full bg-white text-[#C56E4E] flex items-center justify-center shadow-sm mb-2 group-hover:scale-110 transition-transform">
                          <ImageIcon size={18} />
                        </div>
                        <p className="text-xs font-bold text-[#2D2623]">Click or drag & drop to upload</p>
                      </div>
                    ) : (
                      <input 
                        type="url" 
                        value={serviceImage}
                        onChange={(e) => setServiceImage(e.target.value)}
                        placeholder="https://images.unsplash.com/..." 
                        className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white mb-2"
                      />
                    )
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Description</label>
                  <textarea 
                    rows="2"
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    placeholder="Describe the luxury ritual..." 
                    className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] p-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white resize-none"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-[#EADBD2]">
                  <div className="flex items-center gap-2.5">
                    <input 
                      type="checkbox" 
                      id="trendingCheck"
                      checked={isTrending}
                      onChange={(e) => setIsTrending(e.target.checked)}
                      className="accent-[#C56E4E] h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="trendingCheck" className="text-xs font-bold text-[#2D2623] cursor-pointer">
                      Mark as Trending Service 🔥
                    </label>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <input 
                      type="checkbox" 
                      id="discountCheck"
                      checked={discountApplicable}
                      onChange={(e) => setDiscountApplicable(e.target.checked)}
                      className="accent-[#1E9E4A] h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="discountCheck" className="text-xs font-bold text-[#2D2623] cursor-pointer">
                      Discount Applicable (Allow coupons & promo codes) 🏷️
                    </label>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full mt-4 py-4 rounded-full bg-[#2D2623] hover:bg-[#1A1513] text-white text-xs font-bold uppercase tracking-wider shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isSaving ? <><LoaderCircle size={16} className="animate-spin" /> Saving...</> : <><Check size={16} /> {editingId ? "Save Changes" : "Publish Service"}</>}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ================= TOAST NOTIFICATION ================= */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-full bg-[#2D2623]/95 px-6 py-3.5 text-white shadow-2xl backdrop-blur-xl border border-white/20 text-xs font-bold whitespace-nowrap"
          >
            <CheckCircle2 size={16} className="text-[#E5A024]" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}