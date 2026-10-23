import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  Sparkles, 
  Save, 
  CheckCircle2, 
  Layout, 
  MessageSquare, 
  Megaphone,
  Image as ImageIcon
} from "lucide-react";

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 70, damping: 20 } }
};

export default function WebsiteContent() {
  // CMS Content States
  const [heroHeading, setHeroHeading] = useState("Your Personal Luxury Salon & Spa, Delivered to Your Doorstep.");
  const [heroSubtext, setHeroSubtext] = useState("Book expert stylists and premium skincare rituals at your home, hotel, or office.");
  const [announcementText, setAnnouncementText] = useState("✨ Special Offer: Use code WELCOME15 for 15% off your first luxury booking!");
  const [isAnnouncementActive, setIsAnnouncementActive] = useState(true);

  const [toast, setToast] = useState(null);

  const handleSaveContent = (e) => {
    e.preventDefault();
    setToast("✨ Website content updated and published live successfully!");
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
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C7A70]">CMS & Branding</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2D2623]">Website Content Management</h1>
        </motion.div>

        <form onSubmit={handleSaveContent} className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Hero Banner & Landing CMS (7 Cols) */}
          <motion.div variants={fadeUp} className="lg:col-span-7 space-y-6">
            
            <div className="bg-white rounded-[2.5rem] border border-[#EADBD2] p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-2xl bg-[#FFF6F0] text-[#C56E4E] flex items-center justify-center border border-[#EADBD2]">
                  <Layout size={20} />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#2D2623]">Hero Landing Banner</h2>
                  <p className="text-xs text-[#8C7A70]">Edit main headline text seen by customers on index page</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Main Headline</label>
                <textarea 
                  rows="2"
                  value={heroHeading}
                  onChange={(e) => setHeroHeading(e.target.value)}
                  className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] p-4 text-xs font-bold text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Sub-headline Description</label>
                <textarea 
                  rows="3"
                  value={heroSubtext}
                  onChange={(e) => setHeroSubtext(e.target.value)}
                  className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] p-4 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white resize-none"
                />
              </div>
            </div>

            {/* Testimonials Review Manager */}
            <div className="bg-white rounded-[2.5rem] border border-[#EADBD2] p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-2xl bg-[#FFF6F0] text-[#C56E4E] flex items-center justify-center border border-[#EADBD2]">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#2D2623]">Featured Testimonials</h2>
                  <p className="text-xs text-[#8C7A70]">Manage highlighted customer reviews</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FCF9F6] border border-[#EADBD2] space-y-2">
                <div className="flex justify-between items-center">
                  <strong className="text-xs font-bold text-[#2D2623]">Priya Sharma</strong>
                  <span className="text-[10px] font-bold text-[#E5A024]">★★★★★</span>
                </div>
                <p className="text-xs text-[#8C7A70] italic">"The doorstep facial was exceptionally relaxing. The expert arrived right on time with full hygiene gear!"</p>
              </div>
            </div>

          </motion.div>

          {/* Right Column: Announcement Bar & Save (5 Cols) */}
          <motion.div variants={fadeUp} className="lg:col-span-5 space-y-6">
            
            <div className="bg-white rounded-[2.5rem] border border-[#EADBD2] p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-2xl bg-[#FFF6F0] text-[#C56E4E] flex items-center justify-center border border-[#EADBD2]">
                  <Megaphone size={20} />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#2D2623]">Announcement Bar</h2>
                  <p className="text-xs text-[#8C7A70]">Top header ticker</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-[#EADBD2]/60">
                  <div>
                    <p className="text-xs font-bold text-[#2D2623]">Show Announcement Bar</p>
                    <p className="text-[10px] text-[#8C7A70]">Display ticker at top of user app</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsAnnouncementActive(!isAnnouncementActive)}
                    className={`w-12 h-6 rounded-full transition-colors relative p-1 ${isAnnouncementActive ? "bg-[#C56E4E]" : "bg-[#EADBD2]"}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isAnnouncementActive ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7A70] mb-1.5">Announcement Ticker Text</label>
                  <textarea 
                    rows="3"
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    className="w-full rounded-2xl border border-[#EADBD2] bg-[#FFF6F0] p-4 text-xs font-medium text-[#2D2623] outline-none focus:border-[#C56E4E] focus:bg-white resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-6 py-4 rounded-full bg-[#C56E4E] text-white text-xs font-bold uppercase tracking-wider shadow-xl hover:bg-[#A35539] transition-all flex items-center justify-center gap-2"
              >
                <Save size={16} /> Publish Changes Live
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