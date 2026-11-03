import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Scissors,
  RefreshCw,
  Package as PackageIcon,
  IndianRupee,
  AlertCircle,
  Image as ImageIcon,
  Layers3,
  ArrowUpRight,
  ShieldCheck,
  Crown,
  CircleCheck,
  TriangleAlert,
  Upload,
  Info,
} from "lucide-react";
import { io } from "socket.io-client";
import API from "./../utils/axios";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1000&q=85";

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const servicesCatalog = [
  { id: "SRV-101", name: "Korean Glow Facial", price: 899, duration: "60 mins", category: "Skin & Face" },
  { id: "SRV-102", name: "Deep Nourish Hair Spa", price: 499, duration: "60 mins", category: "Hair Care" },
  { id: "SRV-103", name: "Full Body Polishing", price: 1899, duration: "90 mins", category: "Body Care" },
  { id: "SRV-104", name: "Classic Mani-Pedi", price: 699, duration: "45 mins", category: "Nails" },
  { id: "SRV-105", name: "Rica Waxing Full Arms & Legs", price: 649, duration: "45 mins", category: "Grooming" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const extractPackages = (response) => {
  const candidates = [
    response,
    response?.data,
    response?.packages,
    response?.data?.packages,
    response?.data?.data,
    response?.result,
    response?.result?.packages,
  ];
  return candidates.find(Array.isArray) || [];
};

const getId = (pkg) => pkg?.id || pkg?._id || pkg?.packageId || null;

const resolveImageUrl = (rawImage) => {
  if (!rawImage || typeof rawImage !== "string" || !rawImage.trim()) {
    return DEFAULT_IMAGE;
  }
  const trimmed = rawImage.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const backendBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  return `${backendBase.replace(/\/+$/, "")}/${trimmed.replace(/^\/+/, "")}`;
};

const normalizePackage = (pkg) => ({
  ...pkg,
  id: getId(pkg),
  name: pkg?.name || pkg?.packageName || "Untitled Package",
  tagline: pkg?.tagline || pkg?.description || "A signature BeautyVibe experience.",
  price: pkg?.price ?? pkg?.amount ?? 0,
  originalPrice: pkg?.originalPrice ?? pkg?.originalAmount ?? "",
  image: resolveImageUrl(pkg?.image || pkg?.imageUrl),
  badge: pkg?.badge || pkg?.label || "Signature Collection",
  services: Array.isArray(pkg?.services)
    ? pkg.services.map((s) => (typeof s === "string" ? s : s?.name || "")).filter(Boolean)
    : [],
  duration: pkg?.duration || "Custom experience",
});

const formatPrice = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value ?? "0");
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(number);
};

const validateImage = (file) => {
  if (!file) throw new Error("Please select an image.");
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Choose JPG, PNG, WebP or GIF images only.");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image size must be 15 MB or smaller.");
  }
  return true;
};

export default function AdminPackages() {
  const [packagesList, setPackagesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState(null);

  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);

  const [packageName, setPackageName] = useState("");
  const [packageTagline, setPackageTagline] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [packageBadge, setPackageBadge] = useState("Signature Collection");
  const [selectedServices, setSelectedServices] = useState(["Korean Glow Facial"]);

  // Image upload state
  const [imageInputMode, setImageInputMode] = useState("upload"); // "upload" | "url"
  const [packageImage, setPackageImage] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const fileInputRef = useRef(null);
  const imagePreviewRef = useRef("");

  const showToast = useCallback((message, type = "success") => {
    setToast({ id: Date.now(), message, type });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    return () => {
      if (imagePreviewRef.current) {
        URL.revokeObjectURL(imagePreviewRef.current);
      }
    };
  }, []);

  const setLocalImagePreview = (file) => {
    if (imagePreviewRef.current) {
      URL.revokeObjectURL(imagePreviewRef.current);
      imagePreviewRef.current = "";
    }
    const previewUrl = URL.createObjectURL(file);
    imagePreviewRef.current = previewUrl;
    setPackageImage(previewUrl);
  };

  const clearLocalImagePreview = () => {
    if (imagePreviewRef.current) {
      URL.revokeObjectURL(imagePreviewRef.current);
      imagePreviewRef.current = "";
    }
  };

  const fetchPackages = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setErrorMessage("");

    try {
      const response = await API.get("/api/packages");
      const packages = extractPackages(response.data).map(normalizePackage);
      setPackagesList(packages);
    } catch (error) {
      console.error("[BeautyVibe] Package loading error:", error.response?.data || error.message);
      setErrorMessage(error.response?.data?.message || "We couldn't load your collection. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("packageAdded", (newPackage) => {
      if (!newPackage) return;
      const normalized = normalizePackage(newPackage);
      const id = getId(normalized);

      setPackagesList((previous) => {
        if (id && previous.some((pkg) => getId(pkg) === id)) {
          return previous.map((pkg) => (getId(pkg) === id ? normalized : pkg));
        }
        return [normalized, ...previous];
      });
      showToast("A new package has been published.");
    });

    socket.on("packageUpdated", (updatedPackage) => {
      if (!updatedPackage) return;
      const normalized = normalizePackage(updatedPackage);
      const id = getId(normalized);

      setPackagesList((previous) =>
        previous.map((pkg) => (getId(pkg) === id ? normalized : pkg))
      );
    });

    socket.on("packageDeleted", (deletedId) => {
      if (!deletedId) {
        fetchPackages(false);
        return;
      }
      setPackagesList((previous) => previous.filter((pkg) => String(getId(pkg)) !== String(deletedId)));
    });

    return () => socket.disconnect();
  }, [fetchPackages, showToast]);

  const resetForm = () => {
    clearLocalImagePreview();
    setEditingPackageId(null);
    setPackageName("");
    setPackageTagline("");
    setPackagePrice("");
    setPackageImage("");
    setSelectedImageFile(null);
    setImageInputMode("upload");
    setPackageBadge("Signature Collection");
    setSelectedServices(["Korean Glow Facial"]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (pkg) => {
    resetForm();
    setEditingPackageId(getId(pkg));
    setPackageName(pkg.name || "");
    setPackageTagline(pkg.tagline || "");
    setPackagePrice(String(pkg.price ?? ""));
    setPackageImage(pkg.image || "");
    setPackageBadge(pkg.badge || "Signature Collection");
    setSelectedServices(pkg.services?.length ? pkg.services : ["Korean Glow Facial"]);
    setImageInputMode("url");
    setIsModalOpen(true);
  };

  const applySelectedImage = (file) => {
    try {
      validateImage(file);
      setSelectedImageFile(file);
      setLocalImagePreview(file);
      setImageInputMode("upload");
    } catch (error) {
      showToast(error.message, "error");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    applySelectedImage(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    applySelectedImage(file);
  };

  const handleRemoveImage = () => {
    clearLocalImagePreview();
    setPackageImage("");
    setSelectedImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleToggleServiceSelection = (serviceName) => {
    setSelectedServices((previous) => {
      if (previous.includes(serviceName)) {
        if (previous.length === 1) {
          showToast("Please keep at least one treatment in your package.", "error");
          return previous;
        }
        return previous.filter((name) => name !== serviceName);
      }
      return [...previous, serviceName];
    });
  };

  const originalPrice = useMemo(
    () =>
      selectedServices.reduce((total, name) => {
        const service = servicesCatalog.find((item) => item.name === name);
        return total + (service?.price || 0);
      }, 0),
    [selectedServices]
  );

  const savings = Math.max(0, originalPrice - Number(packagePrice || 0));

  const handleSavePackage = async (event) => {
    event.preventDefault();

    if (!packageName.trim()) {
      showToast("Please enter a package name.", "error");
      return;
    }

    const numericPrice = Number(packagePrice);
    if (!packagePrice.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) {
      showToast("Please enter a valid package price.", "error");
      return;
    }

    if (selectedServices.length === 0) {
      showToast("Choose at least one treatment.", "error");
      return;
    }

    if (selectedImageFile) {
      try {
        validateImage(selectedImageFile);
      } catch (error) {
        showToast(error.message, "error");
        return;
      }
    }

    setSaving(true);

    const formData = new FormData();
    formData.append("name", packageName.trim());
    formData.append("tagline", packageTagline.trim() || "A signature salon and spa experience, thoughtfully curated for you.");
    formData.append("price", String(numericPrice));
    formData.append("originalPrice", String(originalPrice));
    formData.append("duration", `${selectedServices.length * 45} mins`);
    formData.append("badge", packageBadge.trim() || "Signature Collection");
    formData.append("isFeatured", "true");
    formData.append("services", JSON.stringify(selectedServices));

    if (selectedImageFile) {
      formData.append("image", selectedImageFile, selectedImageFile.name);
    } else if (packageImage.trim() && !packageImage.startsWith("blob:")) {
      formData.append("imageUrl", packageImage.trim());
    }

    try {
      const isEditing = Boolean(editingPackageId);

      if (isEditing) {
        await API.put(`/api/packages/${editingPackageId}`, formData);
      } else {
        await API.post("/api/packages", formData);
      }

      setIsModalOpen(false);
      resetForm();
      showToast(isEditing ? "Your changes have been saved successfully." : "Your new package is published successfully.");
      await fetchPackages(false);
    } catch (error) {
      console.error("[BeautyVibe] Save error:", error.response?.data || error.message);
      showToast(error.response?.data?.message || "Unable to save your package. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (pkg) => {
    const id = getId(pkg);
    if (!id) {
      showToast("This package has no valid database ID.", "error");
      return;
    }
    setDialog({ type: "delete", package: pkg });
  };

  const confirmDelete = async () => {
    const pkg = dialog?.package;
    const id = getId(pkg);
    if (!id) return;

    setDeletingId(id);
    setDialog(null);

    try {
      await API.delete(`/api/packages/${id}`);
      setPackagesList((previous) => previous.filter((item) => String(getId(item)) !== String(id)));
      showToast(`"${pkg.name}" has been deleted successfully.`);
    } catch (error) {
      console.error("[BeautyVibe] Delete error:", error.response?.data || error.message);
      showToast(error.response?.data?.message || "Unable to delete this package. Please try again.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const totalServices = packagesList.reduce((total, pkg) => total + (pkg.services?.length || 0), 0);
  const featuredPackages = packagesList.filter((pkg) => pkg.isFeatured !== false).length;

  return (
    <div className="relative min-h-screen overflow-hidden px-4 pb-16 pt-6 sm:px-6 lg:px-8 bg-[#FCF9F6] text-[#2D2623]">
      <div className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full blur-[110px] bg-[#C56E4E]/[0.04]" />
      <div className="pointer-events-none absolute -right-32 top-96 h-96 w-96 rounded-full blur-[120px] bg-[#8C7A70]/[0.05]" />

      <div className="relative z-10 mx-auto max-w-[1600px]">
        {/* HEADER */}
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#FFF6F0] border border-[#EADBD2] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8C7A70] shadow-sm">
              <Sparkles size={13} className="text-[#C56E4E]" />
              BeautyVibe Administration
            </div>
            <h1 className="text-3xl font-semibold tracking-[-1.2px] sm:text-4xl text-[#2D2623]">
              Package Collection
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#8C7A70]">
              Curate, manage, and refine your premium salon experiences with robust image uploads.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF6F0] border border-[#EADBD2] px-3.5 py-2.5 text-xs text-[#8C7A70] shadow-sm">
              <span className={`h-2 w-2 rounded-full ${socketConnected ? "bg-[#C56E4E] shadow-[0_0_10px_rgba(197,110,78,0.4)]" : "bg-[#8C7A70]"}`} />
              {socketConnected ? "Live connection" : "Connecting"}
            </div>

            <button
              type="button"
              onClick={() => fetchPackages()}
              disabled={loading}
              className="grid h-11 w-11 place-items-center rounded-full bg-[#FFF6F0] border border-[#EADBD2] text-[#2D2623] shadow-sm transition hover:opacity-90 disabled:opacity-50"
              title="Refresh packages"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#2D2623] px-5 text-sm font-semibold text-[#FCF9F6] shadow-md transition active:scale-[0.98]"
            >
              <Plus size={17} />
              New package
            </button>
          </div>
        </header>

        {/* SUMMARY */}
        <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Total packages", value: packagesList.length, icon: PackageIcon },
            { label: "Included treatments", value: totalServices, icon: Scissors },
            { label: "Featured packages", value: featuredPackages, icon: Crown },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center justify-between rounded-[22px] bg-[#FFF6F0] border border-[#EADBD2] p-5 shadow-sm">
                <div>
                  <p className="text-xs text-[#8C7A70]">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-[#2D2623]">{item.value}</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FCF9F6] border border-[#EADBD2] text-[#C56E4E]">
                  <Icon size={19} />
                </div>
              </div>
            );
          })}
        </section>

        {/* COLLECTION HEADING */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8C7A70]">YOUR COLLECTION</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#2D2623]">Available packages</h2>
          </div>
          <span className="rounded-full bg-[#FFF6F0] border border-[#EADBD2] px-3 py-1.5 text-xs text-[#8C7A70] shadow-sm">
            {packagesList.length} {packagesList.length === 1 ? "package" : "packages"}
          </span>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="animate-pulse overflow-hidden rounded-[30px] bg-[#FFF6F0] border border-[#EADBD2] p-2 shadow-sm">
                <div className="h-[170px] rounded-[24px] bg-[#EADBD2]" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-2/3 rounded bg-[#EADBD2]" />
                  <div className="h-3 w-full rounded bg-[#EADBD2]" />
                  <div className="h-9 rounded-full bg-[#EADBD2]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ERROR */}
        {!loading && errorMessage && (
          <div className="rounded-[26px] border border-rose-200 bg-rose-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5 shrink-0 text-rose-500" />
              <div className="flex-1">
                <h3 className="font-semibold text-rose-900">Unable to load packages</h3>
                <p className="mt-1 text-sm leading-6 text-rose-700">{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => fetchPackages()}
                  className="mt-4 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !errorMessage && packagesList.length === 0 && (
          <div className="flex min-h-[350px] flex-col items-center justify-center rounded-[30px] bg-[#FFF6F0] border border-dashed border-[#EADBD2] px-6 py-12 text-center shadow-sm">
            <div className="mb-5 grid h-16 w-16 place-items-center rounded-[22px] bg-[#FCF9F6] border border-[#EADBD2]">
              <PackageIcon size={27} className="text-[#8C7A70]" />
            </div>
            <h3 className="text-xl font-semibold text-[#2D2623]">Your collection starts here</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#8C7A70]">
              Create your first BeautyVibe package and showcase your signature salon experiences.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#2D2623] px-5 py-3 text-sm font-semibold text-[#FCF9F6] shadow-md transition hover:opacity-90"
            >
              <Plus size={16} /> Create first package
            </button>
          </div>
        )}

        {/* PACKAGE CARDS */}
        {!loading && !errorMessage && packagesList.length > 0 && (
          <motion.section variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {packagesList.map((pkg, index) => {
              const id = getId(pkg);
              const price = Number(pkg.price);
              const oldPrice = Number(pkg.originalPrice);
              const hasSavings = Number.isFinite(oldPrice) && oldPrice > price;
              const services = Array.isArray(pkg.services) ? pkg.services : [];

              return (
                <motion.article
                  layout
                  variants={itemVariants}
                  key={id || `package-${index}`}
                  className="group relative flex min-w-0 flex-col overflow-hidden rounded-[30px] bg-[#FFF6F0] border border-[#EADBD2] shadow-[0_10px_30px_rgba(45,38,35,0.04)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(45,38,35,0.08)]"
                >
                  <div className="relative m-[6px] h-[175px] overflow-hidden rounded-[25px] bg-[#EADBD2] sm:h-[185px]">
                    <img
                      src={pkg.image || DEFAULT_IMAGE}
                      alt={pkg.name}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_IMAGE;
                      }}
                      className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.045]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute left-3 top-3 max-w-[75%] truncate rounded-full border border-white/25 bg-black/40 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-white backdrop-blur-xl">
                      <Sparkles size={12} className="mr-1.5 inline-block text-[#FFF6F0]" />
                      {pkg.badge || "Signature Collection"}
                    </div>
                    {hasSavings && (
                      <div className="absolute right-3 top-3 rounded-full bg-[#C56E4E] px-3 py-1.5 text-[10px] font-semibold text-white shadow-lg backdrop-blur-xl">
                        Save ₹{formatPrice(oldPrice - price)}
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
                      <p className="mb-1 text-[9px] font-medium uppercase tracking-[0.2em] text-white/80">BEAUTYVIBE COLLECTION</p>
                      <h3 className="line-clamp-2 text-[19px] font-semibold leading-tight tracking-[-0.5px] text-white">{pkg.name}</h3>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col px-4 pb-3 pt-2 sm:px-5 sm:pb-4">
                    <p className="line-clamp-2 min-h-[36px] text-[12px] leading-[1.6] text-[#8C7A70]">
                      {pkg.tagline || "A signature salon and spa experience, thoughtfully curated for you."}
                    </p>

                    <div className="mb-2 mt-3 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#2D2623]">Included treatments</span>
                      <span className="shrink-0 rounded-full bg-[#FCF9F6] border border-[#EADBD2] px-2 py-0.5 text-[10px] text-[#8C7A70]">
                        {services.length} {services.length === 1 ? "service" : "services"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {services.length > 0 ? (
                        <>
                          {services.slice(0, 3).map((service, sIndex) => (
                            <span key={`${service}-${sIndex}`} title={service} className="max-w-full truncate rounded-lg bg-[#FCF9F6] border border-[#EADBD2] px-2 py-1 text-[10px] text-[#8C7A70]">
                              {service}
                            </span>
                          ))}
                          {services.length > 3 && (
                            <span className="rounded-lg bg-[#FCF9F6] border border-[#EADBD2] px-2 py-1 text-[10px] text-[#8C7A70]">
                              +{services.length - 3} more
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[11px] text-[#8C7A70]">No treatments listed</span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2 border-t border-[#EADBD2] pt-2.5 text-[11px] text-[#8C7A70]">
                      <Clock size={13} className="shrink-0 text-[#8C7A70]" />
                      <span>{pkg.duration || "Duration varies"}</span>
                      <span className="mx-1 h-1 w-1 rounded-full bg-[#8C7A70]" />
                      <ShieldCheck size={13} className="shrink-0 text-[#C56E4E]" />
                      <span>Premium service</span>
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="mb-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-[#8C7A70]">Package price</p>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-[24px] font-semibold tracking-[-0.8px] text-[#2D2623]">₹{formatPrice(pkg.price)}</span>
                          {hasSavings && <span className="text-xs line-through text-[#8C7A70]">₹{formatPrice(oldPrice)}</span>}
                        </div>
                      </div>
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FCF9F6] border border-[#EADBD2] text-[#2D2623] transition-all duration-300 group-hover:opacity-90">
                        <ArrowUpRight size={16} />
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="grid grid-cols-[1fr_40px] gap-2 border-t border-[#EADBD2] bg-[#EADBD2]/30 p-3">
                    <button
                      type="button"
                      onClick={() => openEditModal(pkg)}
                      className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-full bg-[#FCF9F6] border border-[#EADBD2] px-4 text-[12px] font-semibold text-[#2D2623] shadow-sm transition-all duration-300 hover:opacity-90"
                    >
                      <Edit3 size={13} /> Edit package
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDelete(pkg)}
                      disabled={deletingId === id || !id}
                      title="Delete package"
                      className="grid h-[38px] w-10 place-items-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 transition-all duration-300 hover:bg-rose-100 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {deletingId === id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </motion.section>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setIsModalOpen(false); }}>
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ duration: 0.22 }} className="my-auto w-full max-w-2xl overflow-hidden rounded-[28px] bg-[#FFF6F0] border border-[#EADBD2] shadow-2xl">
              <div className="flex items-start justify-between border-b border-[#EADBD2] p-5 sm:p-7">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C56E4E]">
                    <Sparkles size={13} /> BeautyVibe Studio
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight sm:text-2xl text-[#2D2623]">
                    {editingPackageId ? "Edit your package" : "Create a new package"}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-[#8C7A70]">Configure the details and media of your salon experience.</p>
                </div>
                <button type="button" onClick={() => !saving && setIsModalOpen(false)} disabled={saving} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FCF9F6] border border-[#EADBD2] text-[#8C7A70] transition hover:opacity-80 disabled:opacity-40">
                  <X size={17} />
                </button>
              </div>

              <form onSubmit={handleSavePackage} className="max-h-[75vh] space-y-5 overflow-y-auto p-5 sm:p-7">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-xs font-medium text-[#2D2623]">Package name *</span>
                    <input type="text" value={packageName} onChange={(e) => setPackageName(e.target.value)} placeholder="e.g. Luxury Glow Ritual" required maxLength={100} className="w-full rounded-xl bg-[#FCF9F6] border border-[#EADBD2] px-4 py-3 text-sm text-[#2D2623] outline-none transition focus:ring-1" />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-xs font-medium text-[#2D2623]">Short description</span>
                    <textarea value={packageTagline} onChange={(e) => setPackageTagline(e.target.value)} placeholder="Describe the experience..." rows={3} maxLength={300} className="w-full resize-y rounded-xl bg-[#FCF9F6] border border-[#EADBD2] px-4 py-3 text-sm leading-6 text-[#2D2623] outline-none transition" />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-medium text-[#2D2623]">Package price (₹) *</span>
                    <div className="relative">
                      <IndianRupee size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7A70]" />
                      <input type="number" min="1" step="1" value={packagePrice} onChange={(e) => setPackagePrice(e.target.value)} placeholder="1499" required className="w-full rounded-xl bg-[#FCF9F6] border border-[#EADBD2] py-3 pl-9 pr-3 text-sm text-[#2D2623] outline-none transition" />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-medium text-[#2D2623]">Package badge</span>
                    <input type="text" value={packageBadge} onChange={(e) => setPackageBadge(e.target.value)} placeholder="Signature Collection" maxLength={60} className="w-full rounded-xl bg-[#FCF9F6] border border-[#EADBD2] px-4 py-3 text-sm text-[#2D2623] outline-none transition" />
                  </label>

                  {/* ROBUST IMAGE UPLOAD SECTION */}
                  <div className="sm:col-span-2 rounded-2xl border border-[#EADBD2] bg-[#FCF9F6] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <span className="block text-xs font-medium text-[#2D2623]">Package image</span>
                        <p className="mt-0.5 text-[11px] text-[#8C7A70]">Upload a high-resolution image or provide a public URL.</p>
                      </div>

                      <div className="flex rounded-xl bg-[#FFF6F0] p-1 border border-[#EADBD2]">
                        <button
                          type="button"
                          onClick={() => setImageInputMode("upload")}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                            imageInputMode === "upload" ? "bg-[#2D2623] text-white shadow-sm" : "text-[#8C7A70]"
                          }`}
                        >
                          Upload file
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageInputMode("url")}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                            imageInputMode === "url" ? "bg-[#2D2623] text-white shadow-sm" : "text-[#8C7A70]"
                          }`}
                        >
                          Image URL
                        </button>
                      </div>
                    </div>

                    {packageImage && (
                      <div className="relative mb-3 h-40 overflow-hidden rounded-xl bg-[#EADBD2] border border-[#EADBD2]">
                        <img
                          src={packageImage}
                          alt="Preview"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = DEFAULT_IMAGE;
                          }}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-md backdrop-blur-md transition hover:bg-white"
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    )}

                    {imageInputMode === "upload" ? (
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#EADBD2] bg-[#FFF6F0] p-4 text-center transition hover:border-[#C56E4E]"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <Upload size={22} className="mb-2 text-[#C56E4E]" />
                        <p className="text-xs font-semibold text-[#2D2623]">Click or drag & drop image here</p>
                        <p className="mt-0.5 text-[10px] text-[#8C7A70]">Supports JPG, PNG, WebP, GIF (Max 15MB)</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <input
                          type="url"
                          value={packageImage.startsWith("blob:") ? "" : packageImage}
                          onChange={(e) => {
                            clearLocalImagePreview();
                            setSelectedImageFile(null);
                            setPackageImage(e.target.value);
                          }}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="w-full rounded-xl bg-white border border-[#EADBD2] px-4 py-3 text-sm text-[#2D2623] outline-none transition"
                        />
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#8C7A70]">
                      <Info size={13} className="shrink-0 text-[#C56E4E]" />
                      <span>Files are safely processed and stored in your backend upload directory.</span>
                    </div>
                  </div>
                </div>

                {/* SERVICE SELECTION */}
                <div className="rounded-2xl bg-[#FCF9F6] border border-[#EADBD2] p-4 sm:p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#2D2623]">
                        <Layers3 size={16} className="text-[#C56E4E]" /> Included treatments
                      </h3>
                      <p className="mt-1 text-xs text-[#8C7A70]">Select the treatments included in this package.</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#FFF6F0] border border-[#EADBD2] px-2.5 py-1 text-[10px] text-[#8C7A70] shadow-sm">
                      {selectedServices.length} selected
                    </span>
                  </div>

                  <div className="space-y-2">
                    {servicesCatalog.map((service) => {
                      const selected = selectedServices.includes(service.name);
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => handleToggleServiceSelection(service.name)}
                          className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? "bg-[#FFF6F0] border-[#C56E4E] shadow-sm" : "bg-[#FCF9F6] border-[#EADBD2] hover:opacity-80"}`}
                        >
                          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border" style={{ borderColor: selected ? "#C56E4E" : "#8C7A70", backgroundColor: selected ? "#C56E4E" : "transparent", color: "#FCF9F6" }}>
                            {selected && <Check size={13} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-medium text-[#2D2623]">{service.name}</span>
                            <span className="mt-1 block text-[10px] text-[#8C7A70]">{service.category} · {service.duration}</span>
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-[#2D2623]">₹{formatPrice(service.price)}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-[#FFF6F0] border border-[#EADBD2] p-3 shadow-sm">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[#8C7A70]">Combined service value</p>
                      <p className="mt-1 text-lg font-semibold text-[#2D2623]">₹{formatPrice(originalPrice)}</p>
                    </div>
                    <div className="rounded-xl bg-[#FFF6F0] border border-[#C56E4E] p-3">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[#C56E4E]">Customer savings</p>
                      <p className="mt-1 text-lg font-semibold text-[#C56E4E]">₹{formatPrice(savings)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-[#EADBD2] pt-5 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => !saving && setIsModalOpen(false)} disabled={saving} className="rounded-full bg-[#FCF9F6] border border-[#EADBD2] px-5 py-3 text-sm font-medium text-[#8C7A70] shadow-sm transition hover:opacity-80 disabled:opacity-40">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2D2623] px-6 py-3 text-sm font-semibold text-[#FCF9F6] shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                    {saving ? <><RefreshCw size={15} className="animate-spin" /> Saving...</> : <><CheckCircle2 size={16} /> {editingPackageId ? "Save changes" : "Create package"}</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION */}
      <AnimatePresence>
        {dialog?.type === "delete" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setDialog(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }} className="w-full max-w-md rounded-[28px] bg-[#FFF6F0] border border-[#EADBD2] p-6 shadow-2xl sm:p-7">
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600">
                <TriangleAlert size={23} />
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-[#2D2623]">Delete this package?</h2>
              <p className="mt-3 text-sm leading-6 text-[#8C7A70]">
                Are you sure you want to delete <span className="font-semibold text-[#2D2623]">{dialog.package?.name}</span>? This action cannot be undone.
              </p>
              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setDialog(null)} className="rounded-full bg-[#FCF9F6] border border-[#EADBD2] px-5 py-3 text-sm font-medium text-[#8C7A70] shadow-sm transition hover:opacity-80">
                  Keep package
                </button>
                <button type="button" onClick={confirmDelete} className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-rose-500">
                  <Trash2 size={15} /> Yes, delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICATIONS */}
      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} className="fixed bottom-5 left-1/2 z-[100] w-[calc(100%-32px)] max-w-md -translate-x-1/2">
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 shadow-xl backdrop-blur-xl ${toast.type === "error" ? "border-rose-200 bg-rose-50/95 text-rose-900" : "border-[#EADBD2] bg-[#FFF6F0]/95 text-[#2D2623]"}`}>
              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#EADBD2] bg-[#FCF9F6] ${toast.type === "error" ? "bg-rose-100 text-rose-600" : "text-[#C56E4E]"}`}>
                {toast.type === "error" ? <AlertCircle size={18} /> : <CircleCheck size={18} />}
              </div>
              <p className="min-w-0 flex-1 text-xs font-medium leading-5">{toast.message}</p>
              <button type="button" onClick={() => setToast(null)} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#8C7A70] transition hover:bg-black/5" aria-label="Dismiss notification">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}