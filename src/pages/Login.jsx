import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole,
  Mail, Phone, RefreshCw, ShieldCheck, UserRound, X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../utils/axios";

export default function Login() {
  const navigate = useNavigate();
  const toastTimer = useRef(null);

  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const notify = (message, type = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return notify("Enter your email and password.", "error");
    }

    setLoading(true);

    try {
      if (mode === "register") {
        if (name.trim().length < 2) return notify("Please enter your full name.", "error");
        if (password.length < 6) return notify("Password must contain at least 6 characters.", "error");

        // CRITICAL FIX: Send 'phone' instead of 'mobile' to match backend model controller
        await API.post("/api/auth/register", {
          name, 
          email: normalizedEmail, 
          phone: mobile || "+91 98765 43210", 
          password, 
          role: "admin"
        });
        
        notify("Admin account created successfully! Please sign in.");
        setMode("login");
      } else {
        const res = await API.post("/api/auth/login", {
          email: normalizedEmail,
          password
        });

        // Robust payload extraction supporting nested Sequelize structures
        const responseData = res.data?.data || res.data || {};
        const role = responseData.role || res.data?.role;
        const token = responseData.token || res.data?.token;

        if (!token) {
          throw new Error("Authentication token missing from server response.");
        }

        if (role && role !== "admin") {
          throw new Error("Access Denied. Admin privileges required.");
        }

        // Save token using the exact key required by Axios interceptors
        localStorage.setItem("beautyvibe_admin_token", token);
        notify("Welcome back to BeautyVibe Admin.");
        
        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 400);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Authentication failed";
      notify(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FBF7F3] font-sans text-[#34251F] selection:bg-[#C99A83] selection:text-white">
      <motion.div aria-hidden="true" animate={{ x: [0, 22, 0], y: [0, 18, 0], scale: [1, 1.06, 1] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#F0D9CD]/70 blur-[110px]" />
      <motion.div aria-hidden="true" animate={{ x: [0, -18, 0], y: [0, -20, 0], scale: [1.05, 1, 1.05] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute -bottom-48 -right-40 h-[40rem] w-[40rem] rounded-full bg-[#E8C8B7]/50 blur-[120px]" />

      <div className="relative mx-auto grid min-h-screen max-w-[1440px] items-center gap-8 px-4 py-8 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-16">
        
        <section className="hidden min-h-[680px] flex-col justify-between py-8 lg:flex">
          <a href="/" aria-label="BeautyVibe home" className="flex w-fit items-center gap-4">
            <img src="/logo.png" alt="BeautyVibe" className="h-16 w-16 rounded-2xl object-contain" onError={(e) => e.currentTarget.style.display = "none"} />
            <div>
              <p className="font-serif text-3xl font-semibold tracking-tight">BeautyVibe</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9C7969]">Admin Portal</p>
            </div>
          </a>
          <div className="max-w-xl">
            <h1 className="font-serif text-6xl font-medium leading-[1.08] tracking-tight xl:text-7xl">
              Manage.<br />Organize.<br /><span className="italic text-[#A86D53]">Elevate.</span>
            </h1>
            <p className="mt-7 max-w-md text-base leading-7 text-[#856F63]">Access your command center to oversee bookings, manage services, and deliver exceptional experiences.</p>
          </div>
          <p className="text-xs text-[#A18B7F]">© {new Date().getFullYear()} BeautyVibe Admin.</p>
        </section>

        <section className="mx-auto w-full max-w-[470px]">
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="rounded-[30px] border border-white/90 bg-white/90 p-6 shadow-[0_24px_80px_rgba(91,54,38,0.10)] backdrop-blur-xl sm:p-9 relative">
            
            <div className="mb-7">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F8EEE8] text-[#A5654C]">
                <ShieldCheck size={23} />
              </div>
              <h2 className="font-serif text-3xl font-medium tracking-tight sm:text-[34px]">
                {mode === "login" ? "Admin Access" : "Create Admin"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#917B6F]">
                {mode === "login" ? "Securely sign in to the BeautyVibe management portal." : "Register a new administrator account."}
              </p>
            </div>

            <div className="mb-8 grid grid-cols-2 rounded-2xl bg-[#F8F1EC] p-1">
              <button type="button" onClick={() => setMode("login")} className={`rounded-xl px-4 py-3 text-sm font-semibold transition cursor-pointer ${mode === "login" ? "bg-white text-[#8F523B] shadow-sm" : "text-[#9A8377]"}`}>Sign in</button>
              <button type="button" onClick={() => setMode("register")} className={`rounded-xl px-4 py-3 text-sm font-semibold transition cursor-pointer ${mode === "register" ? "bg-white text-[#8F523B] shadow-sm" : "text-[#9A8377]"}`}>Create account</button>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <AnimatePresence initial={false}>
                {mode === "register" && (
                  <motion.div key="reg" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                    <InputField label="Full name" icon={<UserRound size={17} />} type="text" placeholder="Enter your full name" value={name} onChange={setName} required />
                    <InputField label="Mobile number" icon={<Phone size={17} />} type="tel" placeholder="10-digit mobile number" value={mobile} onChange={(v) => setMobile(v.replace(/\D/g, "").slice(0, 10))} maxLength={10} required />
                  </motion.div>
                )}
              </AnimatePresence>

              <InputField label="Email address" icon={<Mail size={17} />} type="email" placeholder="admin@example.com" value={email} onChange={setEmail} required />

              <div>
                <label className="mb-2 block text-xs font-semibold text-[#61483C]">Password</label>
                <div className="flex items-center rounded-xl border border-[#E9DDD5] bg-[#FFFCFA] transition focus-within:border-[#BD8A73]">
                  <span className="pl-4 text-[#B1846F]"><LockKeyhole size={17} /></span>
                  <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="min-w-0 flex-1 bg-transparent px-3 py-3.5 text-sm outline-none placeholder:text-[#B6A39A]" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="px-4 text-[#A78A7C] hover:text-[#7D5140] cursor-pointer">
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} disabled={loading} type="submit" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#9C6049] px-5 py-4 text-sm font-semibold text-white shadow-lg transition hover:bg-[#844D39] disabled:opacity-60 cursor-pointer">
                {loading ? <RefreshCw size={17} className="animate-spin" /> : <>{mode === "register" ? "Create admin account" : "Secure admin login"} <ArrowRight size={17} /></>}
              </motion.button>
            </form>

          </motion.div>
        </section>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className={`fixed bottom-5 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-3 rounded-2xl border bg-white px-4 py-4 shadow-2xl ${toast.type === "error" ? "border-red-200 text-red-700" : "border-[#E7D5CA] text-[#674637]"}`}>
            {toast.type === "error" ? <X size={18} className="text-red-500 mt-0.5" /> : <CheckCircle2 size={18} className="text-[#9C6049] mt-0.5" />}
            <p className="flex-1 text-sm">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function InputField({ label, icon, type, placeholder, value, onChange, required, maxLength }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-[#61483C]">{label}</label>
      <div className="flex items-center rounded-xl border border-[#E9DDD5] bg-[#FFFCFA] transition focus-within:border-[#BD8A73]">
        <span className="pl-4 text-[#B1846F]">{icon}</span>
        <input type={type} required={required} maxLength={maxLength} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full min-w-0 bg-transparent px-3 py-3.5 text-sm outline-none placeholder:text-[#B6A39A]" />
      </div>
    </div>
  );
}