import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { SquarePen, StickyNotePlus } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const [showSoon, setShowSoon] = useState(false);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto pt-8">
        <h1 className="text-3xl font-semibold text-black mb-2">Welcome</h1>
        <p className="text-black/60 mb-10">
          Choose what you'd like to do today.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate("/requirements")}
            className="card text-left hover:border-mustard transition-colors group"
            aria-label="Capture client requirements">
            <div className="w-12 h-12 bg-mustard-50 rounded flex items-center justify-center mb-4 group-hover:bg-mustard transition-colors">
              <span className="text-2xl">
                <StickyNotePlus />
              </span>
            </div>
            <h2 className="text-lg font-semibold mb-1">Capture Requirement</h2>
            <p className="text-sm text-black/60">
              Create or edit client product requirements.
            </p>
          </button>

          <button
            onClick={() => setShowSoon(true)}
            className="card text-left hover:border-mustard transition-colors group"
            aria-label="Track project (coming soon)">
            <div className="w-12 h-12 bg-mustard-50 rounded flex items-center justify-center mb-4 group-hover:bg-mustard transition-colors">
              <span className="text-2xl">
                <SquarePen />
              </span>
            </div>
            <h2 className="text-lg font-semibold mb-1">Track Project</h2>
            <p className="text-sm text-black/60">Project tracking .</p>
          </button>
        </div>
      </div>

      {showSoon && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="soon-title"
          className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50"
          onClick={() => setShowSoon(false)}>
          <div
            className="card max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}>
            <h3 id="soon-title" className="text-lg font-semibold mb-2">
              Coming Soon
            </h3>
            <p className="text-sm text-black/70 mb-4">Coming Soon.</p>
            <button
              onClick={() => setShowSoon(false)}
              className="btn-primary w-full">
              OK
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
