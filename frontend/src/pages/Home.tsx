import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { FilePlus2, FileSearch, FolderKanban, LayoutDashboard, ClipboardList } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

interface NavCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  ariaLabel: string;
}

function NavCard({ icon, title, description, onClick, ariaLabel }: NavCardProps) {
  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      role="button"
      tabIndex={0}
      className="card text-left hover:border-mustard transition-colors group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-mustard"
      aria-label={ariaLabel}
    >
      <div className="w-12 h-12 bg-mustard-50 dark:bg-mustard-100 rounded flex items-center justify-center mb-4 group-hover:bg-mustard transition-colors" aria-hidden="true">
        <span className="text-2xl text-mustard-700">{icon}</span>
      </div>
      <div className="text-lg font-semibold text-black dark:text-slate-100 mb-1" aria-hidden="true">{title}</div>
      <div className="text-sm text-black/60 dark:text-slate-300" aria-hidden="true">{description}</div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <Layout title="Home">
      <div className="max-w-4xl mx-auto pt-8">
        <h1 className="text-3xl font-semibold text-black dark:text-slate-100 mb-2">
          Welcome{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-black/60 dark:text-slate-300 mb-10">
          Choose what you'd like to do today.
        </p>

        {/* Primary action cards — 4 columns */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <NavCard
            icon={<FilePlus2 />}
            title="Add Client Record"
            description="Capture a new client requirement or import clients from Excel."
            onClick={() => navigate("/requirements/add")}
            ariaLabel="Add Client Record — capture a new client requirement or import clients from Excel"
          />
          <NavCard
            icon={<FileSearch />}
            title="Update Client Record"
            description="Search and edit existing client requirements."
            onClick={() => navigate("/requirements/search")}
            ariaLabel="Update Client Record — search and edit existing client requirements"
          />
          <NavCard
            icon={<FolderKanban />}
            title="Update Project"
            description="View and manage all active client projects."
            onClick={() => navigate("/crm/projects")}
            ariaLabel="Update Project — view and manage all active client projects"
          />
          <NavCard
            icon={<LayoutDashboard />}
            title="Dashboard"
            description="CRM overview — pipeline, project health, and key metrics."
            onClick={() => navigate("/crm/dashboard")}
            ariaLabel="Dashboard — CRM overview, pipeline, project health, and key metrics"
          />
        </div>

        {/* Task Tracker — full-width card below */}
        <div
          onClick={() => navigate("/tasks")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/tasks"); } }}
          role="button"
          tabIndex={0}
          className="card text-left hover:border-mustard transition-colors group cursor-pointer flex items-center gap-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-mustard"
          aria-label="Go to Task Tracker — view and update assigned stage tasks in real-time"
        >
          <div className="w-12 h-12 bg-mustard-50 dark:bg-mustard-100 rounded flex items-center justify-center shrink-0 group-hover:bg-mustard transition-colors" aria-hidden="true">
            <span className="text-2xl text-mustard-700"><ClipboardList /></span>
          </div>
          <div className="text-lg font-semibold text-black dark:text-slate-100 mb-0.5" aria-hidden="true">Task Tracker</div>
          <div className="text-sm text-black/60 dark:text-slate-300" aria-hidden="true">
            View and update all assigned stage tasks in real-time.
          </div>
        </div>
      </div>
    </Layout>
  );
}
