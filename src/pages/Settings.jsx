import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings as SettingsIcon, 
  Sparkles, 
  Shield, 
  Bell, 
  Store, 
  Lock, 
  CheckCircle2, 
  Save, 
  Globe
} from "lucide-react";

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 70, damping: 20 } }
};

export default function Settings() {
  // Admin Settings States
  const [salonName, setSalonName] = useState("BeautyVibe Salon & Spa");
  const [supportEmail, setSupportEmail] = useState("support@beautyvibe.app");
  const [contactPhone, setContactPhone] = useState("+91 98765 43210");
  const [address, setAddress] = useState("ICMR National Institute of Nutrition Campus, Hyderabad");
  
  // Toggles
  const [onlineBookings, setOnlineBookings] = useState(true);
  const [doorstepDispatch, setDoorstepDispatch] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const [toast, setToast] = useState(null);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setToast("✨ Admin settings updated and saved successfully!");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="flex-1 min-w-0 bg-[#FCF9F6] font-sans selection:bg-[#C56E4E] selection:text-white pb-28 text-[#2D2623] relative">
      
      <motion.main 
        variants={staggerContainer} 
        initial="hidden" 
        animate="show" 
        className="max-w-[1240px] mx-auto space-y-8"
      >
        
        {/* ================= HEADER ================= */}
        <motion.div variants={fadeUp}>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF6F0] border border-[#EADBD2] px-4 py-1.5 mb-3 shadow-sm">
            <Sparkles size={14} className="text-[#C56E4E]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C7A70]">Platform Configuration</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2D2623]">Admin Settings</h1>
        </motion.div>

        <form onSubmit={handleSaveSettings} className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: General & Business Info (7 Cols) */}
          <motion.div variants={fadeUp} className="lg:col-span-7 space-y-6">
            
            <div className="bg-white rounded-[2.5rem] border border-[#EADBD2] p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-2xl bg-[#FFF6F0] text-[#C56E4E] flex items-center justify-center border border-[#EADBD2]">
                  <Store size={20} />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#2D2623]">Business Profile</h2>
                  <p className="text-xs text-[#8C7A70]">Manage your official salon & spa brand identity</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Salon Brand Name</label>
                <input 
                  type="text" 
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                  className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-bold text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Support Email</label>
                  <input 
                    type="email" 
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Contact Phone</label>
                  <input 
                    type="text" 
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Headquarters / Campus Address</label>
                <textarea 
                  rows="2"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] p-4 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white resize-none"
                />
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-white rounded-[2.5rem] border border-[#EADBD2] p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-2xl bg-[#FFF6F0] text-[#C56E4E] flex items-center justify-center border border-[#EADBD2]">
                  <Lock size={20} />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#2D2623]">Administrator Security</h2>
                  <p className="text-xs text-[#8C7A70]">Update master credentials</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">New Password</label>
                  <input type="password" placeholder="••••••••" className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs text-[#2D2623] outline-none focus:border-[#C56E4E]" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Confirm Password</label>
                  <input type="password" placeholder="••••••••" className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] px-4 py-3 text-xs text-[#2D2623] outline-none focus:border-[#C56E4E]" />
                </div>
              </div>
            </div>

          </motion.div>

          {/* Right Column: Operational Toggles & Save (5 Cols) */}
          <motion.div variants={fadeUp} className="lg:col-span-5 space-y-6">
            
            <div className="bg-white rounded-[2.5rem] border border-[#EADBD2] p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-2xl bg-[#FFF6F0] text-[#C56E4E] flex items-center justify-center border border-[#EADBD2]">
                  <SettingsIcon size={20} />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#2D2623]">Operations Control</h2>
                  <p className="text-xs text-[#8C7A70]">Platform switches</p>
                </div>
              </div>

              <div className="space-y-5">
                
                <div className="flex items-center justify-between pb-4 border-b border-[#EADBD2]/60">
                  <div>
                    <p className="text-xs font-bold text-[#2D2623]">Accept Online Bookings</p>
                    <p className="text-[10px] text-[#8C7A70]">Allow customers to schedule rituals</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setOnlineBookings(!onlineBookings)}
                    className={`w-12 h-6 rounded-full transition-colors relative p-1 ${onlineBookings ? "bg-[#C56E4E]" : "bg-[#EADBD2]"}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${onlineBookings ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between pb-4 border-b border-[#EADBD2]/60">
                  <div>
                    <p className="text-xs font-bold text-[#2D2623]">Doorstep Expert Dispatch</p>
                    <p className="text-[10px] text-[#8C7A70]">Enable home service geolocation routing</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setDoorstepDispatch(!doorstepDispatch)}
                    className={`w-12 h-6 rounded-full transition-colors relative p-1 ${doorstepDispatch ? "bg-[#C56E4E]" : "bg-[#EADBD2]"}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${doorstepDispatch ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between pb-4 border-b border-[#EADBD2]/60">
                  <div>
                    <p className="text-xs font-bold text-[#2D2623]">Automated SMS Alerts</p>
                    <p className="text-[10px] text-[#8C7A70]">Send VIP pass QR codes via SMS</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSmsAlerts(!smsAlerts)}
                    className={`w-12 h-6 rounded-full transition-colors relative p-1 ${smsAlerts ? "bg-[#C56E4E]" : "bg-[#EADBD2]"}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${smsAlerts ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#2D2623]">Maintenance Mode</p>
                    <p className="text-[10px] text-[#8C7A70]">Temporarily pause customer app</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setMaintenanceMode(!maintenanceMode)}
                    className={`w-12 h-6 rounded-full transition-colors relative p-1 ${maintenanceMode ? "bg-[#B33A3A]" : "bg-[#EADBD2]"}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${maintenanceMode ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>

              </div>

              <button
                type="submit"
                className="w-full mt-6 py-4 rounded-full bg-[#C56E4E] text-white text-xs font-bold uppercase tracking-wider shadow-xl hover:bg-[#A35539] transition-all flex items-center justify-center gap-2"
              >
                <Save size={16} /> Save Admin Settings
              </button>
            </div>

          </motion.div>

        </form>

      </motion.main>

      {/* ================= TOAST NOTIFICATION ================= */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-full bg-[#2D2623]/95 px-6 py-3.5 text-white shadow-2xl backdrop-blur-xl border border-white/20 text-xs font-bold"
          >
            <CheckCircle2 size={16} className="text-[#E5A024]" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}