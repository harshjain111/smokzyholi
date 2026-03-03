import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import EventManager from "@/components/EventManager";
import SettingsPage from "@/components/SettingsPage";
import AddSale from "@/components/AddSale";
import ActiveOrders from "@/components/ActiveOrders";
import Reports from "@/components/Reports";
import OrdersPage from "@/components/OrdersPage";
import TimerExpiredAlert from "@/components/TimerExpiredAlert";

type View = "home" | "active" | "sale" | "reports" | "settings" | "events" | "orders";

interface ExpiredOrder {
  id: string;
  customer_name: string;
  pot_number: string | null;
  table_number: string | null;
  current_session: number;
  session_count: number;
  status: string;
  session1_end: string | null;
  session2_end: string | null;
  session1_collected: string | null;
  session2_collected: string | null;
  payment_mode: string;
}

const Dashboard = () => {
  const { role, staffName, logout, isAdmin } = useAuth();
  const [view, setView] = useState<View>("home");
  const [activeOrders, setActiveOrders] = useState<ExpiredOrder[]>([]);
  const [expiredOrders, setExpiredOrders] = useState<ExpiredOrder[]>([]);

  const fetchActiveOrders = useCallback(async () => {
    const { data: eventData } = await supabase.from("events").select("id").eq("is_active", true).limit(1).maybeSingle();
    if (!eventData) { setActiveOrders([]); return; }
    const { data } = await supabase.from("orders").select("*")
      .eq("event_id", eventData.id)
      .neq("status", "closed")
      .order("created_at", { ascending: true });
    if (data) setActiveOrders(data);
  }, []);

  // Realtime subscription for orders
  useEffect(() => {
    fetchActiveOrders();
    const channel = supabase
      .channel("global-orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchActiveOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchActiveOrders]);

  // Polling fallback every 5s
  useEffect(() => {
    const interval = setInterval(fetchActiveOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchActiveOrders]);

  // Track expired orders
  useEffect(() => {
    const checkExpired = () => {
      const now = Date.now();
      const expired = activeOrders.filter((o) => {
        const isActive = o.status === "session1_active" || o.status === "session2_active";
        if (!isActive) return false;
        const endTime = o.current_session === 1 ? o.session1_end :
                        o.current_session === 2 ? o.session2_end : null;
        if (!endTime) return false;
        return new Date(endTime).getTime() <= now;
      });
      setExpiredOrders(expired);
    };
    checkExpired();
    const interval = setInterval(checkExpired, 1000);
    return () => clearInterval(interval);
  }, [activeOrders]);

  const handleCollectFromAlert = async (orderId: string) => {
    const order = activeOrders.find((o) => o.id === orderId);
    if (!order) return;
    const now = new Date().toISOString();
    const endTime = order.current_session === 1 ? order.session1_end :
                    order.current_session === 2 ? order.session2_end : null;
    const delay = endTime ? Math.max(0, Math.round((Date.now() - new Date(endTime).getTime()) / 60000)) : 0;

    if (order.current_session === 1) {
      if (order.session_count === 2) {
        const { data: cfg } = await supabase.from("timer_config").select("default_duration_mins").limit(1).maybeSingle();
        const duration = cfg?.default_duration_mins ?? 45;
        const end2 = new Date(Date.now() + duration * 60 * 1000).toISOString();
        await supabase.from("orders").update({
          session1_collected: now, session1_delay_mins: delay,
          current_session: 2, status: "session2_active", session2_start: now, session2_end: end2,
        }).eq("id", orderId);
      } else {
        await supabase.from("orders").update({
          session1_collected: now, session1_delay_mins: delay, status: "closed",
        }).eq("id", orderId);
      }
    } else if (order.current_session === 2) {
      await supabase.from("orders").update({
        session2_collected: now, session2_delay_mins: delay, status: "closed",
      }).eq("id", orderId);
    }
    toast.success("Pot collected! ✅");
    fetchActiveOrders();
  };

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
      <TimerExpiredAlert expiredOrders={expiredOrders} onCollect={handleCollectFromAlert} />
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
