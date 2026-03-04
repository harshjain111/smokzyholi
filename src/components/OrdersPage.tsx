import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Trash2, X } from "lucide-react";
import { format } from "date-fns";

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
  session1_delay_mins: number | null;
  session2_start: string | null;
  session2_end: string | null;
  session2_collected: string | null;
  session2_delay_mins: number | null;
  created_at: string;
  event_id: string;
}

interface ItemMap { [id: string]: string }

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    confirmed: "Confirmed",
    session1_active: "Session 1 Active",
    session1_ended: "Session 1 Ended",
    awaiting_session2: "Awaiting Session 2",
    session2_active: "Session 2 Active",
    session2_ended: "Session 2 Ended",
    closed: "Closed",
  };
  return map[s] || s;
};

const statusColor = (s: string) => {
  if (s === "closed") return "bg-muted text-muted-foreground";
  if (s.includes("active")) return "bg-[hsl(var(--timer-green))] text-primary-foreground";
  if (s === "confirmed") return "gold-gradient text-primary-foreground";
  return "bg-secondary text-secondary-foreground";
};

const formatTs = (ts: string | null) => ts ? format(new Date(ts), "dd MMM, hh:mm a") : "—";

const OrdersPage = () => {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [itemMap, setItemMap] = useState<ItemMap>({});
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    const { data: eventData } = await supabase.from("events").select("id").eq("is_active", true).limit(1).maybeSingle();
    if (!eventData) { setOrders([]); return; }
    const { data } = await supabase.from("orders").select("*")
      .eq("event_id", eventData.id)
      .order("created_at", { ascending: false });
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
  }, [fetchOrders]);

  const handleDelete = async () => {
    if (!deleteOrder) return;
    const { error } = await supabase.from("orders").delete().eq("id", deleteOrder.id);
    if (error) {
      toast.error("Failed to delete order");
    } else {
      toast.success("Order deleted");
      setDeleteOrder(null);
      setSelectedOrder(null);
      fetchOrders();
    }
  };

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return !q || o.customer_name.toLowerCase().includes(q) ||
      o.customer_number.includes(q) ||
      (o.pot_number && o.pot_number.includes(q)) ||
      (o.table_number && o.table_number.includes(q));
  });

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">All Orders ({orders.length})</h2>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, number, pot..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No orders found</p>}

      <div className="space-y-2">
        {filtered.map((o) => (
          <Card key={o.id} className="border-border cursor-pointer transition-all active:scale-[0.98]" onClick={() => setSelectedOrder(o)}>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display font-bold text-sm truncate">{o.customer_name}</p>
                  {o.pot_number && <span className="text-xs text-muted-foreground">Pot {o.pot_number}</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {itemMap[o.item_id] || "Unknown"} • {o.session_count}S • ₹{o.price} • {o.payment_mode === "cover_slip" ? "COVER SLIP" : o.payment_mode.toUpperCase()}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <Badge className={`${statusColor(o.status)} text-[10px] whitespace-nowrap`}>
                  {statusLabel(o.status)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Order Details</DialogTitle>
            <DialogDescription>Full summary of this order</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Detail label="Customer" value={selectedOrder.customer_name} />
                <Detail label="Phone" value={selectedOrder.customer_number} />
                <Detail label="Item" value={itemMap[selectedOrder.item_id] || "Unknown"} />
                <Detail label="Sessions" value={`${selectedOrder.session_count}`} />
                <Detail label="Price" value={`₹${selectedOrder.price}`} />
                <Detail label="Payment" value={selectedOrder.payment_mode === "cover_slip" ? "🎫 Cover Slip" : selectedOrder.payment_mode.toUpperCase()} />
                <Detail label="Status" value={statusLabel(selectedOrder.status)} />
                <Detail label="Created By" value={selectedOrder.created_by} />
                {selectedOrder.table_number && <Detail label="Table" value={selectedOrder.table_number} />}
                {selectedOrder.pot_number && <Detail label="Pot" value={selectedOrder.pot_number} />}
                <Detail label="Order Time" value={formatTs(selectedOrder.created_at)} />
              </div>

              {/* Session 1 Details */}
              {selectedOrder.session1_start && (
                <div className="border-t border-border pt-3">
                  <p className="font-display text-xs font-bold text-muted-foreground mb-2">SESSION 1</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Detail label="Started" value={formatTs(selectedOrder.session1_start)} />
                    <Detail label="End Time" value={formatTs(selectedOrder.session1_end)} />
                    <Detail label="Collected" value={formatTs(selectedOrder.session1_collected)} />
                    {selectedOrder.session1_delay_mins !== null && (
                      <Detail label="Delay" value={`${selectedOrder.session1_delay_mins} min`} />
                    )}
                  </div>
                </div>
              )}

              {/* Session 2 Details */}
              {selectedOrder.session2_start && (
                <div className="border-t border-border pt-3">
                  <p className="font-display text-xs font-bold text-muted-foreground mb-2">SESSION 2</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Detail label="Started" value={formatTs(selectedOrder.session2_start)} />
                    <Detail label="End Time" value={formatTs(selectedOrder.session2_end)} />
                    <Detail label="Collected" value={formatTs(selectedOrder.session2_collected)} />
                    {selectedOrder.session2_delay_mins !== null && (
                      <Detail label="Delay" value={`${selectedOrder.session2_delay_mins} min`} />
                    )}
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="border-t border-border pt-3">
                  <Button variant="destructive" className="w-full" onClick={() => setDeleteOrder(selectedOrder)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Order
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteOrder} onOpenChange={(open) => !open && setDeleteOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the order for <strong>{deleteOrder?.customer_name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="font-medium text-foreground">{value}</p>
  </div>
);

export default OrdersPage;
