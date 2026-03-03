import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";

const Dashboard = () => {
  const { role, staffName, logout, isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h1 className="font-display text-2xl font-bold gold-text">SMOKZY</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {staffName} • {role}
          </p>
        </div>
        <button
          onClick={logout}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-foreground"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Navigation */}
      <nav className="grid grid-cols-2 gap-3 p-4">
        <NavCard title="Active Orders" emoji="🔥" />
        <NavCard title="Add Sale" emoji="➕" />
        <NavCard title="Reports" emoji="📊" />
        {isAdmin && <NavCard title="Settings" emoji="⚙️" />}
        {isAdmin && <NavCard title="Events" emoji="📅" />}
      </nav>

      <div className="px-4 pt-4">
        <p className="text-center text-muted-foreground text-sm">
          Select an option above to get started
        </p>
      </div>
    </div>
  );
};

const NavCard = ({ title, emoji }: { title: string; emoji: string }) => (
  <button className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-6 text-card-foreground transition-all active:scale-95 hover:gold-border hover:gold-glow">
    <span className="text-3xl">{emoji}</span>
    <span className="font-display text-sm font-semibold uppercase tracking-wider">{title}</span>
  </button>
);

export default Dashboard;
