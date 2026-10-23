import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function StatCard({ title, value, change, isPositive = true, icon: Icon }) {
  return (
    <div className="bg-white rounded-[2rem] border border-[#EADBD2] p-6 shadow-sm hover:shadow-md hover:border-[#C56E4E]/40 transition-all flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C7A70]">{title}</span>
        <div className="h-11 w-11 rounded-2xl bg-[#FFF6F0] text-[#C56E4E] flex items-center justify-center border border-[#EADBD2] shadow-sm">
          <Icon size={20} />
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#2D2623]">{value}</h3>
        {change && (
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
            isPositive 
              ? "bg-[#EBF7EE] text-[#1E9E4A] border-[#D1EED7]" 
              : "bg-[#FDF2F2] text-[#B33A3A] border-[#F8D7DA]"
          }`}>
            {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {change}
          </span>
        )}
      </div>
    </div>
  );
}