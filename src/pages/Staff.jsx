import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Plus, 
  X, 
  Trash2, 
  CheckCircle2, 
  Star, 
  RefreshCw,
  Camera,
  Upload,
  User,
  RotateCcw,
  Pencil,
  AlertCircle,
  Save
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

export default function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [toast, setToast] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [proofOfSubmission, setProofOfSubmission] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [gender, setGender] = useState("Female");
  const [workExperience, setWorkExperience] = useState("");
  const [role, setRole] = useState("Senior Aesthetician");

  // Profile Image States
  const [avatar, setAvatar] = useState("");
  const [imageSourceMode, setImageSourceMode] = useState("upload");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const toastTimerRef = useRef(null);

  const showToast = (message, type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type, id: Date.now() });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startCameraStream = async () => {
    setCameraError("");
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user", 
          width: { ideal: 640 }, 
          height: { ideal: 640 } 
        },
        audio: false
      });
      
      mediaStreamRef.current = stream;
      setIsCameraActive(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current
            .play()
            .catch((err) => console.error("Video play error:", err));
        }
      }, 100);

    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError(
        err?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow access."
          : "Camera access unavailable or not supported on this device."
      );
      setIsCameraActive(false);
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const capturedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setAvatar(capturedDataUrl);
    stopCameraStream();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file.", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image file size must be less than 5MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const resetAvatarState = () => {
    setAvatar("");
    setCameraError("");
    stopCameraStream();
  };

  const closeModal = () => {
    stopCameraStream();
    setIsModalOpen(false);
    setEditingStaffId(null);
    resetFormFields();
  };

  const resetFormFields = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setDob("");
    setProofOfSubmission("");
    setPermanentAddress("");
    setGender("Female");
    setWorkExperience("");
    setRole("Senior Aesthetician");
    resetAvatarState();
  };

  const handleOpenEditModal = (staff) => {
    const validId = staff.id || staff._id;
    setEditingStaffId(validId);
    setFirstName(staff.firstName || "");
    setLastName(staff.lastName || "");
    setEmail(staff.email || "");
    setPhone(staff.phone || "");
    setDob(staff.dob || "");
    setProofOfSubmission(staff.proofOfSubmission || "");
    setPermanentAddress(staff.permanentAddress || "");
    setGender(staff.gender || "Female");
    setWorkExperience(staff.workExperience || "");
    setRole(staff.role || "Senior Aesthetician");
    setAvatar(staff.avatar || "");
    setIsModalOpen(true);
  };

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/staff").catch(() => API.get("/staff"));
      const raw = res.data?.data || res.data?.staff || res.data || [];
      setStaffList(Array.isArray(raw) ? raw : []);
    } catch (err) {
      console.error("Failed to fetch staff:", err);
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();

    const socket = io("http://localhost:5000", {
      transports: ["polling", "websocket"]
    });

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("staffUpdated", (updated) => {
      setStaffList((prev) => {
        const index = prev.findIndex(
          (s) => String(s.id || s._id) === String(updated.id || updated._id)
        );
        if (index !== -1) {
          const copy = [...prev];
          copy[index] = { ...copy[index], ...updated };
          return copy;
        }
        return [updated, ...prev];
      });
      showToast(`Expert profile synced: ${updated.firstName || ''} ${updated.lastName || ''}`);
    });

    socket.on("staffDeleted", (deletedId) => {
      setStaffList((prev) => prev.filter((s) => String(s.id || s._id) !== String(deletedId)));
      showToast(`Expert profile removed.`, "error");
    });

    return () => {
      stopCameraStream();
      socket.disconnect();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    setSubmitting(true);

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      dob: dob.trim() || null,
      proofOfSubmission: proofOfSubmission.trim() || "Verified",
      permanentAddress: permanentAddress.trim(),
      gender,
      workExperience: workExperience.trim() || "2 Years",
      role,
      avatar: avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&q=80"
    };

    try {
      if (editingStaffId) {
        let res;
        try {
          res = await API.put(`/api/staff/${editingStaffId}`, payload);
        } catch (err) {
          if (err.response?.status === 404) {
            res = await API.put(`/staff/${editingStaffId}`, payload);
          } else {
            throw err;
          }
        }

        if (res.data?.success || res.status === 200) {
          showToast(`Profile updated for ${payload.firstName} ${payload.lastName}`);
          fetchStaff();
        }
      } else {
        let res;
        try {
          res = await API.post("/api/staff", payload);
        } catch (err) {
          if (err.response?.status === 404) {
            res = await API.post("/staff", payload);
          } else {
            throw err;
          }
        }

        if (res.data?.success || res.status === 201 || res.status === 200) {
          showToast(`Staff member "${payload.firstName} ${payload.lastName}" added!`);
          fetchStaff();
        }
      }

      closeModal();
    } catch (err) {
      console.error("Save staff error response:", err.response || err);
      const backendMessage = err.response?.data?.message || err.response?.data?.error;
      showToast(
        backendMessage || (editingStaffId ? "Failed to update profile." : "Failed to add staff member."),
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id) => {
    try {
      await API.delete(`/api/staff/${id}`).catch(() => API.delete(`/staff/${id}`));
      setStaffList((prev) => prev.filter((s) => String(s.id || s._id) !== String(id)));
      showToast(`Staff member deleted.`, "error");
    } catch (err) {
      console.error("Delete staff error:", err);
      showToast("Failed to delete staff.", "error");
    }
  };

  const columns = [
    { 
      header: "Staff ID", 
      accessor: "id",
      render: (row) => <strong className="font-mono text-[11px] text-[#2D2623]">#{row.id || row._id}</strong>
    },
    { 
      header: "Expert Name & Role", 
      accessor: "firstName",
      render: (row) => (
        <div className="flex items-center gap-3">
          <img 
            src={row.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&q=80"} 
            alt={row.firstName} 
            className="h-10 w-10 rounded-full object-cover shrink-0 border border-[#EADBD2] shadow-sm bg-[#FFF6F0]" 
          />
          <div>
            <p className="font-bold text-[#2D2623]">{row.firstName} {row.lastName}</p>
            <span className="text-[10px] text-[#C56E4E] font-bold">{row.role} ({row.workExperience})</span>
          </div>
        </div>
      )
    },
    { 
      header: "Contact & Email", 
      accessor: "email",
      render: (row) => (
        <div>
          <p className="font-medium text-[#2D2623] text-xs">{row.phone}</p>
          <span className="text-[10px] text-[#8C7A70]">{row.email}</span>
        </div>
      )
    },
    { 
      header: "Gender & DOB", 
      accessor: "gender",
      render: (row) => (
        <div>
          <p className="text-xs font-bold text-[#5C4841]">{row.gender}</p>
          <span className="text-[10px] text-[#8C7A70]">{row.dob || "N/A"}</span>
        </div>
      )
    },
    { 
      header: "Rating", 
      accessor: "rating",
      render: (row) => (
        <span className="inline-flex items-center gap-1 font-bold text-[#2D2623]">
          <Star size={13} className="text-[#E5A024] fill-[#E5A024]" /> {row.rating || "5.0"}
        </span>
      )
    },
    { 
      header: "Status", 
      accessor: "status",
      render: (row) => (
        <span className="text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#EBF7EE] text-[#1E9E4A] border border-[#D1EED7]">
          {row.status || "Available"}
        </span>
      )
    },
    { 
      header: "Actions", 
      accessor: "actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenEditModal(row)}
            title="Edit Profile"
            className="h-8 w-8 rounded-xl bg-[#FFF6F0] text-[#C56E4E] border border-[#EADBD2] flex items-center justify-center hover:bg-[#C56E4E] hover:text-white transition-all shadow-sm cursor-pointer"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => handleDeleteStaff(row.id || row._id)}
            title="Delete Staff"
            className="h-8 w-8 rounded-xl bg-[#FDF2F2] text-[#B33A3A] border border-[#F8D7DA] flex items-center justify-center hover:bg-[#B33A3A] hover:text-white transition-all shadow-sm cursor-pointer"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )
    },
  ];

  return (
    <div className="flex-1 min-w-0 bg-[#FCF9F6] font-sans selection:bg-[#C56E4E] selection:text-white pb-28 text-[#2D2623] relative">
      <canvas ref={canvasRef} className="hidden" />

      <motion.main variants={staggerContainer} initial="hidden" animate="show" className="max-w-[1440px] mx-auto space-y-8 px-4 sm:px-6 pt-6">
        
        {/* Header & Controls */}
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-[2.5rem] border border-[#EADBD2] p-6 sm:p-8 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF6F0] border border-[#EADBD2] px-4 py-1.5 mb-3 shadow-sm">
              <Sparkles size={14} className="text-[#C56E4E]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C7A70]">Personnel Management</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2D2623]">Staff & Doorstep Experts</h1>
            <p className="text-xs text-[#8C7A70] mt-1">Live database roster of verified specialists and professionals.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#FFF6F0] border border-[#EADBD2] px-4 py-2.5 rounded-2xl text-xs font-bold text-[#5C4841] shadow-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${socketConnected ? "bg-[#1E9E4A]" : "bg-[#E5A024]"}`} />
              <span>{socketConnected ? "Live 🟢" : "Connecting..."}</span>
            </div>
            <button onClick={fetchStaff} className="h-10 w-10 rounded-2xl bg-[#FFF6F0] border border-[#EADBD2] flex items-center justify-center text-[#C56E4E] hover:bg-[#C56E4E] hover:text-white transition-all cursor-pointer">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <motion.button 
              whileTap={{ scale: 0.95 }} 
              onClick={() => {
                setEditingStaffId(null);
                resetFormFields();
                setIsModalOpen(true);
              }} 
              className="flex items-center gap-2 rounded-full bg-[#C56E4E] px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg hover:bg-[#A35539] transition-all cursor-pointer"
            >
              <Plus size={16} /> Add New Expert
            </motion.button>
          </div>
        </motion.div>

        {/* Data Table */}
        <motion.div variants={fadeUp}>
          {loading && staffList.length === 0 ? (
            <div className="py-24 text-center bg-white rounded-[2.5rem] border border-[#EADBD2]">
              <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-[#C56E4E]" />
              <p className="text-xs font-bold uppercase tracking-wider text-[#8C7A70]">Loading real staff roster...</p>
            </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={staffList} 
              searchKey="firstName" 
              searchPlaceholder="Search staff member name..." 
            />
          )}
        </motion.div>
      </motion.main>

      {/* ADD / EDIT STAFF MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="fixed inset-0 z-50 bg-[#2D2623]/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="fixed inset-0 z-50 m-auto max-w-xl w-[92%] h-[90vh] overflow-y-auto rounded-[2.5rem] bg-white p-6 sm:p-8 shadow-2xl border border-[#EADBD2]">
              
              <div className="flex items-center justify-between pb-4 border-b border-[#EADBD2] mb-6 sticky top-0 bg-white z-10">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#C56E4E]">
                    {editingStaffId ? "Edit Expert Profile" : "Personnel Registration"}
                  </span>
                  <h3 className="font-serif text-xl font-bold text-[#2D2623]">
                    {editingStaffId ? `Update ${firstName}'s Details` : "Add Expert Profile"}
                  </h3>
                </div>
                <button onClick={closeModal} className="grid h-9 w-9 place-items-center rounded-full bg-[#FFF6F0] text-[#8C7A70] hover:text-[#C56E4E] transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveStaff} className="space-y-5">
                
                {/* PROFILE IMAGE SELECTION SECTION */}
                <div className="rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] p-4 space-y-3">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70]">
                    Profile Photo *
                  </label>

                  {avatar ? (
                    <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-[#EADBD2]">
                      <img src={avatar} alt="Captured preview" className="h-20 w-20 rounded-full object-cover border-2 border-[#C56E4E] shadow-sm" />
                      <div>
                        <p className="text-xs font-bold text-[#2D2623]">Photo Selected</p>
                        <p className="text-[10px] text-[#8C7A70] mb-2">Ready to be saved with profile</p>
                        <button
                          type="button"
                          onClick={resetAvatarState}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B33A3A] hover:underline cursor-pointer"
                        >
                          <RotateCcw size={13} /> Change / Re-capture Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Mode Toggle */}
                      <div className="flex gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => {
                            stopCameraStream();
                            setImageSourceMode("upload");
                          }}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                            imageSourceMode === "upload"
                              ? "bg-[#C56E4E] text-white border-[#C56E4E]"
                              : "bg-white text-[#8C7A70] border-[#EADBD2]"
                          }`}
                        >
                          <Upload size={14} /> Upload Image
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageSourceMode("camera")}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                            imageSourceMode === "camera"
                              ? "bg-[#C56E4E] text-white border-[#C56E4E]"
                              : "bg-white text-[#8C7A70] border-[#EADBD2]"
                          }`}
                        >
                          <Camera size={14} /> Use Web Camera
                        </button>
                      </div>

                      {/* File Upload Mode */}
                      {imageSourceMode === "upload" && (
                        <div className="relative border-2 border-dashed border-[#EADBD2] rounded-2xl p-4 text-center bg-white hover:border-[#C56E4E] transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                          />
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <div className="h-10 w-10 rounded-full bg-[#FFF6F0] flex items-center justify-center text-[#C56E4E]">
                              <User size={20} />
                            </div>
                            <p className="text-xs font-bold text-[#2D2623]">Click or drag photo here to upload</p>
                            <p className="text-[10px] text-[#8C7A70]">Supports JPG, PNG, WEBP (Max 5MB)</p>
                          </div>
                        </div>
                      )}

                      {/* Camera Capture Mode */}
                      {imageSourceMode === "camera" && (
                        <div className="space-y-3 bg-white p-3 rounded-2xl border border-[#EADBD2]">
                          {!isCameraActive ? (
                            <div className="text-center py-4">
                              <p className="text-xs text-[#8C7A70] mb-3">Click below to activate live device camera</p>
                              <button
                                type="button"
                                onClick={startCameraStream}
                                className="px-5 py-2.5 rounded-full bg-[#2D2623] text-white text-xs font-bold inline-flex items-center gap-2 hover:bg-[#C56E4E] transition-colors cursor-pointer"
                              >
                                <Camera size={15} /> Turn On Camera
                              </button>
                              {cameraError && (
                                <p className="text-xs text-[#B33A3A] font-medium mt-2">{cameraError}</p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="relative overflow-hidden rounded-2xl bg-black aspect-square max-w-[240px] mx-auto border-2 border-[#C56E4E]">
                                <video 
                                  ref={videoRef} 
                                  autoPlay 
                                  playsInline 
                                  muted 
                                  onCanPlay={() => videoRef.current?.play()}
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                              <div className="flex justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={handleCapturePhoto}
                                  className="px-6 py-2.5 rounded-full bg-[#1E9E4A] text-white text-xs font-bold inline-flex items-center gap-2 hover:bg-[#18803C] shadow-md transition-all cursor-pointer"
                                >
                                  <Camera size={15} /> Capture Photo
                                </button>
                                <button
                                  type="button"
                                  onClick={stopCameraStream}
                                  className="px-4 py-2.5 rounded-full bg-[#FDF2F2] text-[#B33A3A] text-xs font-bold hover:bg-[#B33A3A] hover:text-white transition-all cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* FORM INPUT FIELDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">First Name *</label>
                    <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Swathi" className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-bold text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Last Name *</label>
                    <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Reddy" className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-bold text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Email Address *</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. swathi@beautyvibe.com" className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Mobile Number *</label>
                    <input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +91 98765 99999" className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Date of Birth (DOB)</label>
                    <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Gender</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-3 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E]">
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Specialization Role</label>
                    <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-3 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E]">
                      <option value="Senior Aesthetician">Senior Aesthetician</option>
                      <option value="Master Hair Stylist">Master Hair Stylist</option>
                      <option value="Spa & Massage Expert">Spa & Massage Expert</option>
                      <option value="Grooming Specialist">Grooming Specialist</option>
                      <option value="Nail Art Professional">Nail Art Professional</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Work Experience</label>
                    <input type="text" value={workExperience} onChange={(e) => setWorkExperience(e.target.value)} placeholder="e.g. 4 Years" className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Proof of Submission (ID Document / PAN)</label>
                  <input type="text" value={proofOfSubmission} onChange={(e) => setProofOfSubmission(e.target.value)} placeholder="e.g. ID Verified / ID-88291" className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Permanent Address</label>
                  <textarea rows={2} value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} placeholder="Enter full permanent residential address..." className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white resize-none" />
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full mt-4 py-3.5 rounded-full bg-[#C56E4E] text-white text-xs font-bold uppercase tracking-wider shadow-lg hover:bg-[#A35539] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : editingStaffId ? (
                    <>
                      <Save size={16} /> Save Changes & Update Profile
                    </>
                  ) : (
                    <>
                      <Plus size={16} /> Save & Verify Expert Profile
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* PREMIUM TOAST NOTIFICATION WITH TOP ANIMATED LOADING BAR */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.92 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 20, scale: 0.95 }} 
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[90%] overflow-hidden rounded-2xl bg-[#2D2623]/95 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl border border-white/20"
          >
            {/* Top Animated Countdown Bar */}
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 3.5, ease: "linear" }}
              className={`h-1 ${
                toast.type === "error" ? "bg-[#B33A3A]" : "bg-[#C56E4E]"
              }`}
            />

            <div className="flex items-center gap-3 px-5 py-3.5 text-xs font-bold">
              {toast.type === "error" ? (
                <AlertCircle size={17} className="text-[#B33A3A] shrink-0" />
              ) : (
                <CheckCircle2 size={17} className="text-[#E5A024] shrink-0" />
              )}
              <span className="flex-1 leading-snug">{toast.message}</span>
              <button 
                onClick={() => setToast(null)}
                className="text-white/60 hover:text-white transition-colors ml-2"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}