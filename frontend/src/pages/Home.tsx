import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { SquarePen, StickyNotePlus, ClipboardList } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  return (
    <Layout title="Home">
      <div className="max-w-3xl mx-auto pt-8">
        <h1 className="text-3xl font-semibold text-black dark:text-slate-100 mb-2">Welcome</h1>
        <p className="text-black/60 dark:text-slate-300 mb-10">
          Choose what you'd like to do today.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div
            onClick={() => navigate("/requirements")}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate("/requirements"); } }}
            role="button"
            tabIndex={0}
            className="card text-left hover:border-mustard transition-colors group cursor-pointer"
            aria-label="Capture client requirements">
            <div className="w-12 h-12 bg-mustard-50 dark:bg-mustard-100 rounded flex items-center justify-center mb-4 group-hover:bg-mustard transition-colors">
              <span className="text-2xl text-mustard-700">
                <StickyNotePlus />
              </span>
            </div>
            <h2 className="text-lg font-semibold text-black dark:text-slate-100 mb-1">Capture Requirement</h2>
            <p className="text-sm text-black/60 dark:text-slate-300">
              Create or edit client product requirements.
            </p>
          </div>

          <div
            onClick={() => navigate("/crm/dashboard")}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate("/crm/dashboard"); } }}
            role="button"
            tabIndex={0}
            className="card text-left hover:border-mustard transition-colors group cursor-pointer"
            aria-label="Track project - go to CRM dashboard">
            <div className="w-12 h-12 bg-mustard-50 dark:bg-mustard-100 rounded flex items-center justify-center mb-4 group-hover:bg-mustard transition-colors">
              <span className="text-2xl text-mustard-700">
                <SquarePen />
              </span>
            </div>
            <h2 className="text-lg font-semibold text-black dark:text-slate-100 mb-1">Track Project</h2>
            <p className="text-sm text-black/60 dark:text-slate-300">Project tracking.</p>
          </div>

          <div
            onClick={() => navigate("/tasks")}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate("/tasks"); } }}
            role="button"
            tabIndex={0}
            className="card text-left hover:border-mustard transition-colors group cursor-pointer"
            aria-label="Go to Task Tracker">
            <div className="w-12 h-12 bg-mustard-50 dark:bg-mustard-100 rounded flex items-center justify-center mb-4 group-hover:bg-mustard transition-colors">
              <span className="text-2xl text-mustard-700">
                <ClipboardList />
              </span>
            </div>
            <h2 className="text-lg font-semibold text-black dark:text-slate-100 mb-1">Task Tracker</h2>
            <p className="text-sm text-black/60 dark:text-slate-300">
              View and update all assigned stage tasks in real-time.
            </p>
          </div>
        </div>
      </div>

    </Layout>
  );
}
