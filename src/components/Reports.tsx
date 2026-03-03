import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Order {
  id: string;
  customer_name: string;
  customer_number: string;
  table_number: string | null;
  pot_number: string | null;
  item_id: string;
  session_count: number;
  price: number;
  payment_mode: string;
  created_by: string;
  status: string;
  session1_delay_mins: number | null;
  session2_delay_mins: number | null;
  created_at: string;
}

interface ItemMap { [id: string]: string }

const StatCard = ({ label, value }: { label: string; value: string | number }) => (
  <Card>
    <CardContent className="p-4 text-center">
      <p className="text-2xl font-bold gold-text">{value}</p>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
    </CardContent>
  </Card>
);

const Reports = () => {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [itemMap, setItemMap] = useState<ItemMap>({});
  const [activeEvent, setActiveEvent] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data: ev } = await supabase.from("events").select("id, name").eq("is_active", true).limit(1).single();
      if (ev) {
        setActiveEvent(ev);
        const { data } = await supabase.from("orders").select("*").eq("event_id", ev.id);
        if (data) setOrders(data);
      }
      const { data: items } = await supabase.from("items").select("id, name");
      if (items) {
        const m: ItemMap = {};
        items.forEach((i) => { m[i.id] = i.name; });
        setItemMap(m);
      }
    };
    fetch();
  }, []);

  const totalSales = orders.reduce((s, o) => s + Number(o.price), 0);
  const cashSales = orders.filter((o) => o.payment_mode === "Cash").reduce((s, o) => s + Number(o.price), 0);
  const upiSales = orders.filter((o) => o.payment_mode === "UPI").reduce((s, o) => s + Number(o.price), 0);
  const session1Count = orders.filter((o) => o.session_count === 1).length;
  const session2Count = orders.filter((o) => o.session_count === 2).length;

  // Item breakdown
  const itemBreakdown = orders.reduce((acc, o) => {
    const name = itemMap[o.item_id] || "Unknown";
    acc[name] = (acc[name] || 0) + Number(o.price);
    return acc;
  }, {} as Record<string, number>);

  // Staff breakdown
  const staffBreakdown = orders.reduce((acc, o) => {
    acc[o.created_by] = (acc[o.created_by] || 0) + Number(o.price);
    return acc;
  }, {} as Record<string, number>);

  // Delay stats
  const delays = orders
    .filter((o) => o.status === "completed")
    .flatMap((o) => [o.session1_delay_mins, o.session2_delay_mins])
    .filter((d): d is number => d !== null);
  const onTime = delays.filter((d) => d <= 0).length;
  const avgDelay = delays.length > 0 ? (delays.reduce((s, d) => s + d, 0) / delays.length).toFixed(1) : "N/A";

  const exportExcel = async () => {
    const { utils, writeFile } = await import("xlsx");
    const rows = orders.map((o) => ({
      Customer: o.customer_name, Phone: o.customer_number, Table: o.table_number || "",
      Pot: o.pot_number || "", Item: itemMap[o.item_id] || "", Sessions: o.session_count,
      Price: o.price, Payment: o.payment_mode, CreatedBy: o.created_by, Status: o.status,
      "Session1 Delay": o.session1_delay_mins ?? "", "Session2 Delay": o.session2_delay_mins ?? "",
      Created: o.created_at,
    }));
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Orders");
    writeFile(wb, `${activeEvent?.name || "orders"}_report.xlsx`);
    toast.success("Excel exported!");
  };

  const handleDeleteEvent = async () => {
    if (!activeEvent) return;
    await exportExcel();
    await supabase.from("deletion_log").insert({
      event_id: activeEvent.id, event_name: activeEvent.name, deleted_by: "Admin", order_count: orders.length,
    });
    // Delete orders then event
    await supabase.from("orders").delete().eq("event_id", activeEvent.id);
    await supabase.from("events").delete().eq("id", activeEvent.id);
    toast.success("Event deleted. Backup was downloaded.");
    setOrders([]);
    setActiveEvent(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-xl font-bold">Reports</h2>
        {isAdmin && (
          <Button size="sm" variant="secondary" onClick={exportExcel}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        )}
      </div>

      {activeEvent && <p className="text-sm text-muted-foreground">{activeEvent.name}</p>}

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Sales" value={`₹${totalSales}`} />
        <StatCard label="Orders" value={orders.length} />
        <StatCard label="Cash" value={`₹${cashSales}`} />
        <StatCard label="UPI" value={`₹${upiSales}`} />
        <StatCard label="1-Session" value={session1Count} />
        <StatCard label="2-Session" value={session2Count} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Item Breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {Object.entries(itemBreakdown).map(([name, total]) => (
            <div key={name} className="flex justify-between text-sm">
              <span>{name}</span><span className="font-semibold">₹{total}</span>
            </div>
          ))}
          {Object.keys(itemBreakdown).length === 0 && <p className="text-muted-foreground text-xs">No data</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Staff Breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {Object.entries(staffBreakdown).map(([name, total]) => (
            <div key={name} className="flex justify-between text-sm">
              <span>{name}</span><span className="font-semibold">₹{total}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Collection Stats</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between"><span>On-time</span><span>{delays.length > 0 ? `${Math.round(onTime / delays.length * 100)}%` : "N/A"}</span></div>
          <div className="flex justify-between"><span>Avg Delay</span><span>{avgDelay} min</span></div>
        </CardContent>
      </Card>

      {isAdmin && activeEvent && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">Delete Event & Data</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{activeEvent.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This will export a backup, then permanently delete all {orders.length} orders and the event. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteEvent}>Delete & Backup</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default Reports;
