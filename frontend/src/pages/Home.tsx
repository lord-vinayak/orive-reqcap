import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { SquarePen, StickyNotePlus } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <Layout title="Home">
      <div className="max-w-3xl mx-auto pt-8">
        <h1 className="text-3xl font-semibold text-black dark:text-slate-100 mb-2">Welcome</h1>
        <p className="text-black/60 dark:text-slate-400 mb-10">
          Choose what you'd like to do today.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate("/requirements")}
            className="card text-left hover:border-mustard transition-colors group"
            aria-label="Capture client requirements">
            <div className="w-12 h-12 bg-mustard-50 dark:bg-mustard-100 rounded flex items-center justify-center mb-4 group-hover:bg-mustard transition-colors">
              <span className="text-2xl text-mustard-700">
                <StickyNotePlus />
              </span>
            </div>
            <h2 className="text-lg font-semibold text-black dark:text-slate-100 mb-1">Capture Requirement</h2>
            <p className="text-sm text-black/60 dark:text-slate-400">
              Create or edit client product requirements.
            </p>
          </button>

          <button
            ref={triggerRef}
            onClick={() => navigate("/crm/dashboard")}
            className="card text-left hover:border-mustard transition-colors group"
            aria-label="Track project - go to CRM dashboard">
            <div className="w-12 h-12 bg-mustard-50 dark:bg-mustard-100 rounded flex items-center justify-center mb-4 group-hover:bg-mustard transition-colors">
              <span className="text-2xl text-mustard-700">
                <SquarePen />
              </span>
            </div>
            <h2 className="text-lg font-semibold text-black dark:text-slate-100 mb-1">Track Project</h2>
            <p className="text-sm text-black/60 dark:text-slate-400">Project tracking.</p>
          </button>
        </div>
      </div>

    </Layout>
  );
}
