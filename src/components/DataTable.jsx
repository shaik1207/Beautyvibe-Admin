import { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

export default function DataTable({ 
  columns, 
  data, 
  searchKey = "name", 
  searchPlaceholder = "Search records..." 
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // Filter data based on search input
  const filteredData = data.filter((item) => {
    if (!searchTerm) return true;
    const value = item[searchKey];
    return value && value.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredData.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="bg-white rounded-[2.5rem] border border-[#EADBD2] shadow-sm overflow-hidden">
      
      {/* Search Header Bar */}
      <div className="p-6 border-b border-[#EADBD2] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80 flex items-center bg-[#FCF9F6] border border-[#EADBD2] rounded-2xl px-4 py-2.5">
          <Search size={16} className="text-[#8C7A70] mr-2.5 shrink-0" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="bg-transparent border-none outline-none text-xs font-medium text-[#2D2623] placeholder:text-[#A39292] w-full"
          />
        </div>
        <span className="text-xs font-bold text-[#8C7A70]">
          Showing <strong className="text-[#2D2623]">{filteredData.length}</strong> entries
        </span>
      </div>

      {/* Table Structure */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FCF9F6] border-b border-[#EADBD2] text-[10px] font-bold uppercase tracking-widest text-[#8C7A70]">
              {columns.map((col, idx) => (
                <th key={idx} className="py-4 px-6">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EADBD2]/60 text-xs font-medium text-[#5C4841]">
            {currentRows.length > 0 ? (
              currentRows.map((row, rowIdx) => (
                <tr key={row.id || rowIdx} className="hover:bg-[#FCF9F6]/50 transition-colors">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="py-4 px-6">
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-xs text-[#8C7A70]">
                  No records found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 sm:p-6 border-t border-[#EADBD2] flex items-center justify-between bg-[#FCF9F6]/30">
        <span className="text-xs text-[#8C7A70] font-medium">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="h-9 w-9 rounded-xl border border-[#EADBD2] bg-white flex items-center justify-center text-[#2D2623] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#C56E4E] transition-all shadow-sm"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="h-9 w-9 rounded-xl border border-[#EADBD2] bg-white flex items-center justify-center text-[#2D2623] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#C56E4E] transition-all shadow-sm"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

    </div>
  );
}