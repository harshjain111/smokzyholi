import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, ArrowLeft } from "lucide-react";
import EventManager from "@/components/EventManager";
import SettingsPage from "@/components/SettingsPage";
import AddSale from "@/components/AddSale";
import ActiveOrders from "@/components/ActiveOrders";
import Reports from "@/components/Reports";
import OrdersPage from "@/components/OrdersPage";

type View = "home" | "active" | "sale" | "reports" | "settings" | "events" | "orders";

const Dashboard = () => {
  const { role, staffName, logout, isAdmin } = useAuth();
  const [view, setView] = useState<View>("home");

  const renderView = () => {
    switch (view) {
      case "active": return <ActiveOrders />;
      case "sale": return <AddSale onComplete={() => setView("active")} />;
      case "orders": return <OrdersPage />;
      case "reports": return <Reports />;
      case "settings": return <SettingsPage />;
      case "events": return <EventManager />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          {view !== "home" && (
            <button onClick={() => setView("home")} className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="font-display text-2xl font-bold gold-text">SMOKZY</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{staffName} • {role}</p>
          </div>
        </div>
        <button onClick={logout} className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-foreground">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {view === "home" ? (
        <nav className="grid grid-cols-2 gap-3 p-4">
          <NavCard title="Active Orders" emoji="🔥" onClick={() => setView("active")} />
          <NavCard title="Add Sale" emoji="➕" onClick={() => setView("sale")} />
          <NavCard title="All Orders" emoji="📋" onClick={() => setView("orders")} />
          <NavCard title="Reports" emoji="📊" onClick={() => setView("reports")} />
          {isAdmin && <NavCard title="Settings" emoji="⚙️" onClick={() => setView("settings")} />}
          {isAdmin && <NavCard title="Events" emoji="📅" onClick={() => setView("events")} />}
        </nav>
      ) : (
        <div className="p-4">{renderView()}</div>
      )}
    </div>
  );
};

const NavCard = ({ title, emoji, onClick }: { title: string; emoji: string; onClick: () => void }) => (
  <button onClick={onClick} className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-6 text-card-foreground transition-all active:scale-95 hover:gold-border hover:gold-glow">
    <span className="text-3xl">{emoji}</span>
    <span className="font-display text-sm font-semibold uppercase tracking-wider">{title}</span>
  </button>
);

export default Dashboard;
