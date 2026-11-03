import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";

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
  Search,
  AlertCircle,
  LoaderCircle,
  RefreshCw,
  Upload,
  XCircle,
  Info,
  TriangleAlert,
  Image as ImageIcon,
} from "lucide-react";

import { io } from "socket.io-client";
import API from "./../utils/axios";

/* =========================================================
   CONSTANTS
========================================================= */

const categoriesList = [
  "All",
  "Skin & Face",
  "Hair Care",
  "Body Care",
  "Grooming",
  "Nails",
  "Spa",
];

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80";

const DEFAULT_BENEFITS = [
  "Personalized consultation",
  "Professional tools & hygiene",
  "Finishing expert advice",
];

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

/* =========================================================
   HELPERS
========================================================= */

const getServiceId = (service) => {
  const id = service?.id ?? service?._id;

  return id === undefined || id === null ? "" : String(id);
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  const normalized = String(value).trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;

  return fallback;
};

// BULLETPROOF IMAGE URL RESOLVER FOR FRONTEND
const resolveFrontendImageUrl = (rawImage) => {
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

  const backendBase =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  
  const cleanBase = backendBase.replace(/\/+$/, "");
  const cleanPath = trimmed.replace(/^\/+/, "");

  return `${cleanBase}/${cleanPath}`;
};

const normalizeService = (service) => {
  return {
    ...service,

    id: getServiceId(service),

    name: service?.name ?? service?.title ?? "Untitled Service",

    category: service?.category ?? "Skin & Face",

    price: Number(service?.price ?? 0),

    duration: service?.duration ?? "60 mins",

    isTrending: toBoolean(
      service?.isTrending ?? service?.is_trending,
      false
    ),

    discountApplicable: toBoolean(
      service?.discountApplicable ?? service?.discount_applicable,
      true
    ),

    image: resolveFrontendImageUrl(service?.image),

    description:
      service?.description ??
      service?.desc ??
      "Professional doorstep salon ritual.",

    benefits: Array.isArray(service?.benefits)
      ? service.benefits
      : DEFAULT_BENEFITS,
  };
};

const extractServices = (response) => {
  const body = response?.data;

  const data =
    body?.data ??
    body?.services ??
    body?.results ??
    body;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.rows)) return data.rows;

  return [];
};

const extractSavedService = (response) => {
  const body = response?.data;

  return (
    body?.data?.service ??
    body?.data ??
    body?.service ??
    body?.result ??
    body
  );
};

const getErrorMessage = (error, fallback) => {
  const status = error?.response?.status;

  const serverMessage =
    error?.response?.data?.message ??
    error?.response?.data?.error;

  if (serverMessage) return serverMessage;

  if (status === 400) {
    return "Please check the information you entered.";
  }

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (status === 404) {
    return "The service or API endpoint was not found.";
  }

  if (status === 413) {
    return "The image is too large. Choose an image smaller than 15 MB.";
  }

  if (status >= 500) {
    return "The server encountered an error. Please try again.";
  }

  if (!error?.response && error?.request) {
    return "Cannot reach the server. Check your backend connection.";
  }

  return error?.message || fallback;
};

const validateImage = (file) => {
  if (!file) {
    throw new Error("Please select an image.");
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Choose JPG, PNG, WebP or GIF images only.");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image size must be 15 MB or smaller.");
  }

  return true;
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Services() {
  /* ------------------ Service data ------------------ */

  const [servicesList, setServicesList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* ------------------ UI state ------------------ */

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [socketConnected, setSocketConnected] = useState(false);

  const [toast, setToast] = useState(null);

  const [dialog, setDialog] = useState(null); // Custom popup dialog state for delete confirmation

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("All");

  /* ------------------ Form state ------------------ */

  const [editingId, setEditingId] = useState(null);

  const [isSaving, setIsSaving] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  const [modalError, setModalError] = useState("");

  const [serviceName, setServiceName] = useState("");

  const [serviceCategory, setServiceCategory] =
    useState("Skin & Face");

  const [servicePrice, setServicePrice] = useState("");

  const [serviceDuration, setServiceDuration] = useState("60 mins");

  const [serviceImage, setServiceImage] = useState("");

  const [selectedImageFile, setSelectedImageFile] = useState(null);

  const [imageInputMode, setImageInputMode] = useState("upload");

  const [serviceDescription, setServiceDescription] = useState("");

  const [isTrending, setIsTrending] = useState(false);

  const [discountApplicable, setDiscountApplicable] = useState(true);

  /* ------------------ References ------------------ */

  const fileInputRef = useRef(null);

  const toastTimerRef = useRef(null);

  const imagePreviewRef = useRef("");

  /* =========================================================
     TOAST
  ========================================================= */

  const showToast = useCallback((message, type = "success") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({
      id: Date.now(),
      message,
      type,
    });

    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }

      if (imagePreviewRef.current) {
        URL.revokeObjectURL(imagePreviewRef.current);
      }
    };
  }, []);

  /* =========================================================
     IMAGE PREVIEW MANAGEMENT
  ========================================================= */

  const setLocalImagePreview = (file) => {
    if (imagePreviewRef.current) {
      URL.revokeObjectURL(imagePreviewRef.current);
      imagePreviewRef.current = "";
    }

    const previewUrl = URL.createObjectURL(file);

    imagePreviewRef.current = previewUrl;

    setServiceImage(previewUrl);
  };

  const clearLocalImagePreview = () => {
    if (imagePreviewRef.current) {
      URL.revokeObjectURL(imagePreviewRef.current);
      imagePreviewRef.current = "";
    }
  };

  /* =========================================================
     FETCH SERVICES
  ========================================================= */

  const fetchServices = useCallback(
    async (options = {}) => {
      const { silent = false } = options;

      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await API.get("/api/services");

        const rawServices = extractServices(response);

        const normalized = rawServices
          .map(normalizeService)
          .filter((service) => service.id !== "");

        setServicesList(normalized);

        return normalized;
      } catch (error) {
        console.error("Failed to fetch services:", error);

        showToast(
          getErrorMessage(error, "Could not load services."),
          "error"
        );

        throw error;
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast]
  );

  /* =========================================================
     SOCKET CONNECTION
  ========================================================= */

  useEffect(() => {
    fetchServices().catch(() => {});

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      "http://localhost:5000";

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socket.on("connect", () => {
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    const syncServices = () => {
      fetchServices({ silent: true }).catch(() => {});
    };

    socket.on("serviceAdded", syncServices);
    socket.on("serviceUpdated", syncServices);
    socket.on("serviceDeleted", syncServices);

    return () => {
      socket.off("connect");
      socket.off("disconnect");

      socket.off("serviceAdded", syncServices);
      socket.off("serviceUpdated", syncServices);
      socket.off("serviceDeleted", syncServices);

      socket.disconnect();
    };
  }, [fetchServices]);

  /* =========================================================
     RESET FORM
  ========================================================= */

  const resetForm = () => {
    clearLocalImagePreview();

    setEditingId(null);

    setServiceName("");
    setServiceCategory("Skin & Face");
    setServicePrice("");
    setServiceDuration("60 mins");

    setServiceImage("");
    setSelectedImageFile(null);

    setImageInputMode("upload");

    setServiceDescription("");

    setIsTrending(false);
    setDiscountApplicable(true);

    setModalError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* =========================================================
     OPEN CREATE MODAL
  ========================================================= */

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  /* =========================================================
     OPEN EDIT MODAL
  ========================================================= */

  const handleOpenEditModal = (service) => {
    resetForm();

    setEditingId(service.id);

    setServiceName(service.name);

    setServiceCategory(service.category);

    setServicePrice(String(service.price));

    setServiceDuration(service.duration);

    setServiceImage(
      service.image === DEFAULT_IMAGE ? "" : service.image
    );

    setSelectedImageFile(null);

    setImageInputMode("url");

    setServiceDescription(service.description);

    setIsTrending(service.isTrending);

    setDiscountApplicable(service.discountApplicable);

    setModalError("");

    setIsModalOpen(true);
  };

  /* =========================================================
     IMAGE UPLOAD
  ========================================================= */

  const applySelectedImage = (file) => {
    try {
      validateImage(file);

      setModalError("");

      setSelectedImageFile(file);

      setLocalImagePreview(file);

      setImageInputMode("upload");
    } catch (error) {
      setModalError(error.message);

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

    setServiceImage("");

    setSelectedImageFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageUrlChange = (event) => {
    clearLocalImagePreview();

    setSelectedImageFile(null);

    setServiceImage(event.target.value);
  };

  /* =========================================================
     SAVE SERVICE
  ========================================================= */

  const handleSaveService = async (event) => {
    event.preventDefault();

    setModalError("");

    if (isSaving) return;

    if (!serviceName.trim()) {
      setModalError("Please enter the service name.");
      return;
    }

    if (
      servicePrice === "" ||
      !Number.isFinite(Number(servicePrice)) ||
      Number(servicePrice) < 0
    ) {
      setModalError("Enter a valid service price.");
      return;
    }

    if (!serviceDuration.trim()) {
      setModalError("Please enter the service duration.");
      return;
    }

    if (
      editingId !== null &&
      !servicesList.some(
        (item) => String(item.id) === String(editingId)
      )
    ) {
      setModalError(
        "This service is no longer in the current catalog. Refresh and try again."
      );
      return;
    }

    if (selectedImageFile) {
      try {
        validateImage(selectedImageFile);
      } catch (error) {
        setModalError(error.message);
        return;
      }
    }

    setIsSaving(true);

    const formData = new FormData();

    formData.append("name", serviceName.trim());
    formData.append("title", serviceName.trim());
    formData.append("category", serviceCategory);
    formData.append("price", String(Number(servicePrice)));
    formData.append("duration", serviceDuration.trim());
    formData.append("isTrending", String(isTrending));
    formData.append("discountApplicable", String(discountApplicable));
    formData.append(
      "description",
      serviceDescription.trim() ||
        "Professional doorstep salon ritual tailored to your comfort."
    );
    formData.append("benefits", JSON.stringify(DEFAULT_BENEFITS));

    if (selectedImageFile) {
      formData.append(
        "image",
        selectedImageFile,
        selectedImageFile.name
      );
    } else if (serviceImage && !serviceImage.startsWith("blob:")) {
      formData.append("imageUrl", serviceImage.trim());
    }

    const isEditing = editingId !== null && editingId !== "";

    try {
      if (isEditing) {
        const id = encodeURIComponent(String(editingId));

        await API.put(`/api/services/${id}`, formData);

        await fetchServices({ silent: true });

        setIsModalOpen(false);

        resetForm();

        showToast(
          `"${serviceName.trim()}" updated successfully.`,
          "success"
        );
      } else {
        const response = await API.post(
          "/api/services",
          formData
        );

        const savedService = extractSavedService(response);

        const savedId = getServiceId(savedService);

        const refreshedServices = await fetchServices({
          silent: true,
        });

        const savedRecordExists = savedId
          ? refreshedServices.some(
              (item) => String(item.id) === savedId
            )
          : refreshedServices.some(
              (item) =>
                item.name === serviceName.trim() &&
                Number(item.price) === Number(servicePrice)
            );

        if (!savedRecordExists) {
          throw new Error(
            "The server accepted the request, but the saved service could not be verified. Refresh the catalog and check your database."
          );
        }

        setIsModalOpen(false);

        resetForm();

        showToast(
          `"${serviceName.trim()}" created successfully.`,
          "success"
        );
      }
    } catch (error) {
      console.error("Service save failed:", error);

      const message = getErrorMessage(
        error,
        "Could not save the service."
      );

      setModalError(message);

      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  /* =========================================================
     DELETE SERVICE & CONFIRMATION DIALOG
  ========================================================= */

  const requestDeleteService = (service) => {
    if (deletingId !== null) return;
    setDialog({ type: "delete", service });
  };

  const confirmDeleteService = async () => {
    const service = dialog?.service;
    if (!service) return;

    setDeletingId(service.id);
    setDialog(null);

    try {
      const id = encodeURIComponent(String(service.id));

      await API.delete(`/api/services/${id}`);

      setServicesList((previous) =>
        previous.filter(
          (item) => String(item.id) !== String(service.id)
        )
      );

      showToast(
        `"${service.name}" deleted successfully.`,
        "success"
      );
    } catch (error) {
      console.error("Service delete failed:", error);

      showToast(
        getErrorMessage(error, "Could not delete the service."),
        "error"
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* =========================================================
     FILTER SERVICES
  ========================================================= */

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return servicesList.filter((service) => {
      const matchesCategory =
        selectedCategory === "All" ||
        service.category.toLowerCase() ===
          selectedCategory.toLowerCase();

      const matchesSearch =
        service.name.toLowerCase().includes(query) ||
        service.category.toLowerCase().includes(query) ||
        service.description.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [servicesList, selectedCategory, searchQuery]);

  /* =========================================================
     IMAGE ERROR HANDLER
  ========================================================= */

  const handleImageError = (event) => {
    if (event.currentTarget.src !== DEFAULT_IMAGE) {
      event.currentTarget.src = DEFAULT_IMAGE;
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="relative min-h-screen flex-1 bg-[#FCF9F6] pb-32 font-sans text-[#2D2623] selection:bg-[#C56E4E] selection:text-white">

      <main className="mx-auto max-w-[1440px] space-y-7 px-4 pt-6 sm:px-6 lg:px-8">

        {/* HEADER */}

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#2D2623] to-[#433632] p-7 text-white shadow-xl sm:p-10 md:flex-row md:items-center"
        >
          <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-[#C56E4E] opacity-25 blur-[100px]" />

          <div className="relative z-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest">
              <Sparkles size={14} className="text-[#E5A024]" />
              BeautyVibe · Service Management
            </div>

            <h1 className="mb-2 font-serif text-3xl font-bold sm:text-4xl">
              Services & Pricing
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-[#D3C5BF]">
              Manage your salon services, pricing, images and
              customer-facing service catalog.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-semibold">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  socketConnected
                    ? "bg-green-400"
                    : "bg-amber-400"
                }`}
              />

              {socketConnected
                ? "Live connection"
                : "Reconnecting"}
            </div>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 rounded-full bg-[#C56E4E] px-6 py-3.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#A35539] focus:outline-none focus:ring-2 focus:ring-white"
            >
              <Plus size={16} />
              Add Service
            </button>
          </div>
        </motion.section>

        {/* FILTERS */}

        <section className="flex flex-col justify-between gap-4 rounded-3xl border border-[#EADBD2] bg-white p-4 shadow-sm lg:flex-row lg:items-center">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categoriesList.map((category) => (
              <button
                type="button"
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-bold transition ${
                  selectedCategory === category
                    ? "bg-[#C56E4E] text-white shadow"
                    : "border border-[#EADBD2] bg-[#FCF9F6] text-[#8C7A70] hover:text-[#C56E4E]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#EADBD2] bg-[#FCF9F6] px-4 py-3 lg:w-80">
            <Search
              size={16}
              className="shrink-0 text-[#8C7A70]"
            />

            <input
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              placeholder="Search services..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#A39292]"
            />
          </div>
        </section>

        {/* CATALOG STATUS */}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#8C7A70]">
            <strong className="text-[#2D2623]">
              {filteredServices.length}
            </strong>{" "}
            {filteredServices.length === 1
              ? "service"
              : "services"}{" "}
            found
          </p>

          <button
            type="button"
            disabled={refreshing || loading}
            onClick={() =>
              fetchServices({ silent: true }).catch(() => {})
            }
            className="flex items-center gap-2 rounded-full border border-[#EADBD2] bg-white px-4 py-2.5 text-xs font-bold text-[#8C7A70] transition hover:border-[#C56E4E] hover:text-[#C56E4E] disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh catalog
          </button>
        </div>

        {/* LOADING */}

        {loading && servicesList.length === 0 && (
          <div className="rounded-3xl border border-[#EADBD2] bg-white py-24 text-center">
            <LoaderCircle
              size={30}
              className="mx-auto mb-3 animate-spin text-[#C56E4E]"
            />

            <p className="text-sm font-semibold text-[#8C7A70]">
              Loading services from the server...
            </p>
          </div>
        )}

        {/* EMPTY STATE */}

        {!loading && filteredServices.length === 0 && (
          <div className="rounded-[2rem] border border-[#EADBD2] bg-white px-6 py-20 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#FFF0E8] text-[#C56E4E]">
              <Sparkles size={28} />
            </div>

            <h2 className="mb-2 font-serif text-2xl font-bold">
              {servicesList.length === 0
                ? "Your catalog is empty"
                : "No matching services"}
            </h2>

            <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-[#8C7A70]">
              {servicesList.length === 0
                ? "Create your first service to start building your BeautyVibe catalog."
                : "Try another search term or choose a different category."}
            </p>

            {servicesList.length === 0 && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 rounded-full bg-[#C56E4E] px-6 py-3 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#A35539]"
              >
                <Plus size={16} />
                Create first service
              </button>
            )}
          </div>
        )}

        {/* SERVICE CARDS */}

        <motion.section
          layout
          className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {filteredServices.map((service) => (
              <motion.article
                layout
                key={service.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="group flex min-w-0 flex-col overflow-hidden rounded-[2rem] border border-[#EADBD2] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-52 overflow-hidden bg-[#FFF6F0]">
                  <img
                    src={service.image}
                    alt={service.name}
                    onError={handleImageError}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />

                  <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#C56E4E] shadow-sm">
                    {service.category}
                  </span>

                  <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
                    {service.isTrending && (
                      <span className="flex items-center gap-1 rounded-full bg-[#C56E4E] px-3 py-1.5 text-[10px] font-bold text-white shadow">
                        <Flame size={12} />
                        Trending
                      </span>
                    )}

                    <span
                      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[9px] font-bold shadow ${
                        service.discountApplicable
                          ? "bg-green-600 text-white"
                          : "bg-[#2D2623] text-white"
                      }`}
                    >
                      <Percent size={11} />

                      {service.discountApplicable
                        ? "Discount eligible"
                        : "Fixed price"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="max-w-[55%] truncate font-mono text-[10px] text-[#A39292]">
                      ID: {service.id}
                    </span>

                    <span className="flex items-center gap-1 rounded-lg border border-[#EADBD2] bg-[#FCF9F6] px-2.5 py-1.5 text-[11px] font-semibold text-[#8C7A70]">
                      <Clock
                        size={13}
                        className="text-[#C56E4E]"
                      />

                      {service.duration}
                    </span>
                  </div>

                  <h2 className="mb-2 font-serif text-xl font-bold">
                    {service.name}
                  </h2>

                  <p className="mb-5 line-clamp-3 text-sm leading-relaxed text-[#8C7A70]">
                    {service.description}
                  </p>

                  <div className="mb-5 space-y-2 border-t border-[#EADBD2]/70 pt-4">
                    {service.benefits.map((benefit, index) => (
                      <div
                        key={`${service.id}-benefit-${index}`}
                        className="flex items-start gap-2 text-xs text-[#5C4841]"
                      >
                        <Check
                          size={14}
                          className="mt-0.5 shrink-0 text-[#C56E4E]"
                        />

                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto flex items-end justify-between gap-3 border-t border-[#EADBD2]/70 pt-5">
                    <div>
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[#A39292]">
                        Service price
                      </span>

                      <p className="font-serif text-2xl font-bold">
                        ₹{service.price.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        title="Edit service"
                        aria-label={`Edit ${service.name}`}
                        onClick={() =>
                          handleOpenEditModal(service)
                        }
                        disabled={deletingId === service.id}
                        className="grid h-10 w-10 place-items-center rounded-xl border border-[#EADBD2] bg-[#FFF6F0] text-[#C56E4E] transition hover:bg-[#C56E4E] hover:text-white disabled:opacity-40"
                      >
                        <Edit3 size={16} />
                      </button>

                      <button
                        type="button"
                        title="Delete service"
                        aria-label={`Delete ${service.name}`}
                        onClick={() =>
                          requestDeleteService(service)
                        }
                        disabled={deletingId !== null}
                        className="grid h-10 w-10 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {deletingId === service.id ? (
                          <LoaderCircle
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.section>
      </main>

      {/* CREATE / EDIT DRAWER */}

      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close service editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() =>
                !isSaving && setIsModalOpen(false)
              }
              className="fixed inset-0 z-50 cursor-default bg-[#211815]/55 backdrop-blur-sm"
            />

            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-labelledby="service-editor-title"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 32,
              }}
              className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-xl flex-col border-l border-[#EADBD2] bg-[#FCF9F6] shadow-2xl"
            >
              {/* DRAWER HEADER */}

              <header className="flex items-center justify-between border-b border-[#EADBD2] bg-white px-6 py-5 sm:px-8">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#C56E4E]">
                    BeautyVibe Catalog
                  </p>

                  <h2
                    id="service-editor-title"
                    className="font-serif text-2xl font-bold"
                  >
                    {editingId !== null
                      ? "Edit service"
                      : "Create service"}
                  </h2>

                  <p className="mt-1 text-xs text-[#8C7A70]">
                    Complete the details below and save your changes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    !isSaving && setIsModalOpen(false)
                  }
                  disabled={isSaving}
                  aria-label="Close"
                  className="grid h-10 w-10 place-items-center rounded-full bg-[#FFF0E8] text-[#8C7A70] hover:text-[#C56E4E] disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </header>

              {/* FORM */}

              <form
                onSubmit={handleSaveService}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6 sm:px-8">
                  {modalError && (
                    <div
                      role="alert"
                      className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                    >
                      <AlertCircle
                        size={18}
                        className="mt-0.5 shrink-0"
                      />

                      <span>{modalError}</span>
                    </div>
                  )}

                  {/* NAME */}

                  <div>
                    <label
                      htmlFor="service-name"
                      className="mb-2 block text-xs font-bold text-[#5C4841]"
                    >
                      Service name *
                    </label>

                    <input
                      id="service-name"
                      required
                      maxLength={150}
                      value={serviceName}
                      onChange={(event) =>
                        setServiceName(event.target.value)
                      }
                      placeholder="e.g. Korean Glow Facial"
                      className="w-full rounded-2xl border border-[#EADBD2] bg-white px-4 py-3.5 text-sm outline-none transition focus:border-[#C56E4E] focus:ring-2 focus:ring-[#C56E4E]/10"
                    />
                  </div>

                  {/* CATEGORY AND PRICE */}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="service-category"
                        className="mb-2 block text-xs font-bold text-[#5C4841]"
                      >
                        Category *
                      </label>

                      <select
                        id="service-category"
                        value={serviceCategory}
                        onChange={(event) =>
                          setServiceCategory(event.target.value)
                        }
                        className="w-full rounded-2xl border border-[#EADBD2] bg-white px-4 py-3.5 text-sm outline-none focus:border-[#C56E4E]"
                      >
                        {categoriesList
                          .filter((category) => category !== "All")
                          .map((category) => (
                            <option
                              key={category}
                              value={category}
                            >
                              {category}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="service-price"
                        className="mb-2 block text-xs font-bold text-[#5C4841]"
                      >
                        Price (₹) *
                      </label>

                      <input
                        id="service-price"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={servicePrice}
                        onChange={(event) =>
                          setServicePrice(event.target.value)
                        }
                        placeholder="899"
                        className="w-full rounded-2xl border border-[#EADBD2] bg-white px-4 py-3.5 text-sm outline-none focus:border-[#C56E4E]"
                      />
                    </div>
                  </div>

                  {/* DURATION */}

                  <div>
                    <label
                      htmlFor="service-duration"
                      className="mb-2 block text-xs font-bold text-[#5C4841]"
                    >
                      Duration *
                    </label>

                    <input
                      id="service-duration"
                      required
                      value={serviceDuration}
                      onChange={(event) =>
                        setServiceDuration(event.target.value)
                      }
                      placeholder="60 mins"
                      className="w-full rounded-2xl border border-[#EADBD2] bg-white px-4 py-3.5 text-sm outline-none focus:border-[#C56E4E]"
                    />
                  </div>

                  {/* IMAGE UPLOAD */}

                  <section className="rounded-2xl border border-[#EADBD2] bg-white p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold">
                          Service image
                        </h3>

                        <p className="mt-1 text-xs text-[#8C7A70]">
                          Upload an image or paste a public image URL.
                        </p>
                      </div>

                      <div className="flex rounded-xl bg-[#FCF9F6] p-1">
                        <button
                          type="button"
                          onClick={() =>
                            setImageInputMode("upload")
                          }
                          className={`rounded-lg px-3 py-2 text-xs font-bold ${
                            imageInputMode === "upload"
                              ? "bg-[#C56E4E] text-white"
                              : "text-[#8C7A70]"
                          }`}
                        >
                          Upload
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setImageInputMode("url")
                          }
                          className={`rounded-lg px-3 py-2 text-xs font-bold ${
                            imageInputMode === "url"
                              ? "bg-[#C56E4E] text-white"
                              : "text-[#8C7A70]"
                          }`}
                        >
                          Image URL
                        </button>
                      </div>
                    </div>

                    {/* IMAGE PREVIEW */}

                    {serviceImage && (
                      <div className="relative mb-4 h-44 overflow-hidden rounded-xl bg-[#FFF6F0]">
                        <img
                          src={serviceImage}
                          alt="Selected service preview"
                          onError={handleImageError}
                          className="h-full w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-red-600 shadow"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    )}

                    {/* FILE UPLOAD */}

                    {imageInputMode === "upload" ? (
                      <div
                        onDragOver={(event) =>
                          event.preventDefault()
                        }
                        onDrop={handleDrop}
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
                        className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#EADBD2] bg-[#FCF9F6] p-5 text-center transition hover:border-[#C56E4E]"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleFileSelect}
                          className="hidden"
                        />

                        <Upload
                          size={24}
                          className="mb-3 text-[#C56E4E]"
                        />

                        <p className="text-sm font-semibold">
                          Click or drag an image here
                        </p>

                        <p className="mt-1 text-xs text-[#8C7A70]">
                          JPG, PNG, WebP or GIF · Maximum 15 MB
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label
                          htmlFor="service-image-url"
                          className="text-xs font-bold text-[#5C4841]"
                        >
                          Public image URL
                        </label>

                        <input
                          id="service-image-url"
                          type="url"
                          value={
                            serviceImage.startsWith("blob:")
                              ? ""
                              : serviceImage
                          }
                          onChange={handleImageUrlChange}
                          placeholder="https://example.com/service.jpg"
                          className="w-full rounded-xl border border-[#EADBD2] bg-[#FCF9F6] px-4 py-3 text-sm outline-none focus:border-[#C56E4E]"
                        />
                      </div>
                    )}

                    <div className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-[#8C7A70]">
                      <Info
                        size={15}
                        className="mt-0.5 shrink-0"
                      />

                      <p>
                        Uploaded images are stored by your backend.
                        The image URL is saved with the service so
                        customers can view it on other devices.
                      </p>
                    </div>
                  </section>

                  {/* DESCRIPTION */}

                  <div>
                    <label
                      htmlFor="service-description"
                      className="mb-2 block text-xs font-bold text-[#5C4841]"
                    >
                      Description
                    </label>

                    <textarea
                      id="service-description"
                      rows={4}
                      maxLength={2000}
                      value={serviceDescription}
                      onChange={(event) =>
                        setServiceDescription(event.target.value)
                      }
                      placeholder="Describe this beauty ritual..."
                      className="w-full resize-y rounded-2xl border border-[#EADBD2] bg-white px-4 py-3.5 text-sm leading-relaxed outline-none focus:border-[#C56E4E]"
                    />
                  </div>

                  {/* OPTIONS */}

                  <div className="space-y-4 rounded-2xl border border-[#EADBD2] bg-white p-4">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isTrending}
                        onChange={(event) =>
                          setIsTrending(event.target.checked)
                        }
                        className="h-4 w-4 accent-[#C56E4E]"
                      />

                      <span className="text-sm font-semibold">
                        Mark as trending
                      </span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={discountApplicable}
                        onChange={(event) =>
                          setDiscountApplicable(event.target.checked)
                        }
                        className="h-4 w-4 accent-green-600"
                      />

                      <span className="text-sm font-semibold">
                        Allow discounts and promo codes
                      </span>
                    </label>
                  </div>
                </div>

                {/* FOOTER */}

                <footer className="border-t border-[#EADBD2] bg-white p-5 sm:px-8">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 rounded-full border border-[#EADBD2] px-4 py-3.5 text-sm font-bold text-[#8C7A70] transition hover:bg-[#FCF9F6] disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex flex-[1.5] items-center justify-center gap-2 rounded-full bg-[#2D2623] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#C56E4E] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? (
                        <>
                          <LoaderCircle
                            size={17}
                            className="animate-spin"
                          />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check size={17} />

                          {editingId !== null
                            ? "Save changes"
                            : "Publish service"}
                        </>
                      )}
                    </button>
                  </div>
                </footer>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION POPUP DIALOG */}
      <AnimatePresence>
        {dialog?.type === "delete" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setDialog(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              className="w-full max-w-md rounded-[28px] bg-white border border-[#EADBD2] p-6 shadow-2xl sm:p-7"
            >
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-red-200 bg-red-50 text-red-600">
                <TriangleAlert size={23} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[#2D2623]">
                Delete this service?
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#8C7A70]">
                Are you sure you want to delete <span className="font-semibold text-[#2D2623]">{dialog.service?.name}</span>? This action cannot be undone.
              </p>
              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  className="rounded-full border border-[#EADBD2] bg-[#FCF9F6] px-5 py-3 text-sm font-semibold text-[#8C7A70] shadow-sm transition hover:bg-[#EADBD2]/40"
                >
                  Keep service
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteService}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-red-500"
                >
                  <Trash2 size={15} /> Yes, delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICATIONS */}

      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-5 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
      >
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{
                opacity: 0,
                y: 20,
                scale: 0.97,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 10,
                scale: 0.97,
              }}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-4 shadow-2xl backdrop-blur-xl ${
                toast.type === "error"
                  ? "border-red-200 bg-white text-red-700"
                  : toast.type === "info"
                    ? "border-blue-200 bg-white text-blue-700"
                    : "border-green-200 bg-white text-[#2D2623]"
              }`}
            >
              {toast.type === "error" ? (
                <XCircle
                  size={20}
                  className="mt-0.5 shrink-0 text-red-600"
                />
              ) : toast.type === "info" ? (
                <Info
                  size={20}
                  className="mt-0.5 shrink-0 text-blue-600"
                />
              ) : (
                <CheckCircle2
                  size={20}
                  className="mt-0.5 shrink-0 text-green-600"
                />
              )}

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">
                  {toast.type === "error"
                    ? "Action failed"
                    : toast.type === "info"
                      ? "Information"
                      : "Success"}
                </p>

                <p className="mt-0.5 break-words text-xs leading-relaxed text-[#8C7A70]">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => setToast(null)}
                className="pointer-events-auto rounded-lg p-1 text-[#8C7A70] hover:bg-[#FCF9F6]"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}