import { Plus, Sparkles, FolderOpen } from "lucide-react";

export default function HomePage() {
  return (
    <div className="page-container animate-fade">
      <div className="page-header">
        <h2>Home</h2>
        <p>Welcome to your new desktop workspace. Start building your application here.</p>
      </div>

      <div className="blank-slate-card">
        <div className="blank-slate-icon">
          <Sparkles size={28} />
        </div>
        <h3>Ready to Build</h3>
        <p>This is your clean workspace canvas. Add cards, grids, data tables, or forms.</p>
        <div className="blank-slate-actions">
          <button className="btn-primary">
            <Plus size={16} />
            <span>New Action</span>
          </button>
          <button className="btn-secondary">
            <FolderOpen size={16} />
            <span>Open Existing</span>
          </button>
        </div>
      </div>
    </div>
  );
}
