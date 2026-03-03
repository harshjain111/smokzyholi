import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTimer } from "@/hooks/useTimer";

interface Order {
  id: string;
  customer_name: string;
  customer_number: string;
  table_number: string | null;
  pot_number: string | null;
  item_id: string;
  session_count: number;
  current_session: number;
  price: number;
  payment_mode: string;
  status: string;
  created_by: string;
  session1_start: string | null;
  session1_end: string | null;
  session1_collected: string | null;
  session2_start: string | null;
  session2_end: string | null;
  session2_collected: string | null;
  created_at: string;
}

interface ItemMap { [id: string]: string }

const OrderCard = ({ order, itemName, onAction }: { order: Order; itemName: string; onAction: () => void }) => {
  const currentEnd = order.current_session === 1 ? order.session1_end :
                     order.current_session === 2 ? order.session2_end : null;
  const { formatted, status, secondsLeft } = useTimer(currentEnd);

  useEffect(() => {
    if (secondsLeft !== null && secondsLeft === 0) {
      try { navigator.vibrate?.([500, 200, 500, 200, 500]); } catch {}
    }
  }, [secondsLeft]);

  const bgClass = status === "red" ? "timer-pulse-red" : "";
  const timerColor = status === "green" ? "text-[hsl(var(--timer-green))]" :
                     status === "orange" ? "text-[hsl(var(--timer-orange))]" :
                     status === "red" ? "text-[hsl(var(--timer-red))]" : "text-muted-foreground";

  const handleMarkReady = async () => {
    const now = new Date().toISOString();
    const { data: cfg } = await supabase.from("timer_config").select("default_duration_mins").limit(1).maybeSingle();
    const duration = cfg?.default_duration_mins ?? 45;
    const end = new Date(Date.now() + duration * 60 * 1000).toISOString();
    await supabase.from("orders").update({
      current_session: 1, status: "session1_active", session1_start: now, session1_end: end,
    }).eq("id", order.id);
    onAction();
  };

  const handleCollect = async () => {
    const now = new Date().toISOString();
    const delay = currentEnd ? Math.max(0, Math.round((Date.now() - new Date(currentEnd).getTime()) / 60000)) : 0;
    if (order.current_session === 1) {
      if (order.session_count === 2) {
        const { data: cfg } = await supabase.from("timer_config").select("default_duration_mins").limit(1).maybeSingle();
        const duration = cfg?.default_duration_mins ?? 45;
        const end2 = new Date(Date.now() + duration * 60 * 1000).toISOString();
        await supabase.from("orders").update({
          session1_collected: now, session1_delay_mins: delay,
          current_session: 2, status: "session2_active", session2_start: now, session2_end: end2,
        }).eq("id", order.id);
      } else {
        await supabase.from("orders").update({
          session1_collected: now, session1_delay_mins: delay, status: "completed",
        }).eq("id", order.id);
      }
    } else if (order.current_session === 2) {
      await supabase.from("orders").update({
        session2_collected: now, session2_delay_mins: delay, status: "completed",
      }).eq("id", order.id);
    }
    toast.success("Pot collected! ✅");
    onAction();
  };

  return (
    <Card className={`${bgClass} border-border`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-display font-bold text-sm">{order.customer_name}</p>
            <p className="text-xs text-muted-foreground">{itemName} • {order.session_count}S • {order.payment_mode}</p>
            {order.table_number && <p className="text-xs text-muted-foreground">Table {order.table_number}</p>}
          </div>
          <div className="text-right">
            <p className={`font-display text-2xl font-bold ${timerColor}`}>{formatted}</p>
            <p className="text-xs text-muted-foreground">Session {order.current_session}/{order.session_count}</p>
          </div>
        </div>
        {order.status === "confirmed" && (
          <Button onClick={handleMarkReady} className="w-full gold-gradient text-primary-foreground font-bold">
            🔥 MARK READY
          </Button>
        )}
        {(order.status === "session1_active" || order.status === "session2_active") && secondsLeft !== null && secondsLeft <= 0 && (
          <Button onClick={handleCollect} className="w-full bg-destructive text-destructive-foreground font-bold animate-pulse">
            🫕 COLLECT POT
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

const ActiveOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [itemMap, setItemMap] = useState<ItemMap>({});

  const fetchOrders = useCallback(async () => {
    const { data: eventData } = await supabase.from("events").select("id").eq("is_active", true).limit(1).maybeSingle();
    if (!eventData) { setOrders([]); return; }
    const { data } = await supabase.from("orders").select("*")
      .eq("event_id", eventData.id)
      .neq("status", "completed")
      .order("created_at", { ascending: true });
    if (data) setOrders(data);
  }, []);

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase.from("items").select("id, name");
      if (data) {
        const map: ItemMap = {};
        data.forEach((i) => { map[i.id] = i.name; });
        setItemMap(map);
      }
    };
    fetchItems();
    fetchOrders();

    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl font-bold">Active Orders ({orders.length})</h2>
      {orders.length === 0 && <p className="text-center text-muted-foreground py-8">No active orders</p>}
      {orders.map((o) => (
        <OrderCard key={o.id} order={o} itemName={itemMap[o.item_id] || "Unknown"} onAction={fetchOrders} />
      ))}
    </div>
  );
};

export default ActiveOrders;
