import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { StickyNote, FileSpreadsheet } from "lucide-react";

export default function RequirementsAdd() {
  const navigate = useNavigate();

  return (
    <Layout title="Add Record">
      <div className="max-w-2xl mx-auto pt-8">
        <h1 className="text-2xl font-bold text-black dark:text-white mb-2">Add Record</h1>
        <p className="text-sm text-black/60 dark:text-slate-300 mb-8">
          Choose how you'd like to add a new client record.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div
            onClick={() => navigate("/requirements/new")}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/requirements/new"); } }}
            role="button"
            tabIndex={0}
            className="card text-left hover:border-mustard transition-colors group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-mustard"
            aria-label="Capture new — fill in a new client requirement form step by step"
          >
            <div className="w-12 h-12 bg-mustard-50 dark:bg-mustard-100 rounded flex items-center justify-center mb-4 group-hover:bg-mustard transition-colors" aria-hidden="true">
              <span className="text-2xl text-mustard-700"><StickyNote /></span>
            </div>
            <div className="text-lg font-semibold text-black dark:text-slate-100 mb-1" aria-hidden="true">Capture New</div>
            <div className="text-sm text-black/60 dark:text-slate-300" aria-hidden="true">
              Fill in a new client requirement form step by step.
            </div>
          </div>

          <div
            onClick={() => navigate("/requirements/import")}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/requirements/import"); } }}
            role="button"
            tabIndex={0}
            className="card text-left hover:border-mustard transition-colors group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-mustard"
            aria-label="Import from Excel — bulk-import clients from a spreadsheet and browse all records"
          >
            <div className="w-12 h-12 bg-mustard-50 dark:bg-mustard-100 rounded flex items-center justify-center mb-4 group-hover:bg-mustard transition-colors" aria-hidden="true">
              <span className="text-2xl text-mustard-700"><FileSpreadsheet /></span>
            </div>
            <div className="text-lg font-semibold text-black dark:text-slate-100 mb-1" aria-hidden="true">Import from Excel</div>
            <div className="text-sm text-black/60 dark:text-slate-300" aria-hidden="true">
              Bulk-import clients from a spreadsheet and browse all records.
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
