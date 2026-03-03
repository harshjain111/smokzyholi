import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface Item {
  id: string;
  name: string;
  price_1_session: number;
  price_2_sessions: number;
  default_duration_mins: number;
}

type Step = "customer" | "item" | "session" | "payment" | "confirm";

const AddSale = ({ onComplete }: { onComplete?: () => void }) => {
  const { staffName } = useAuth();
  const [step, setStep] = useState<Step>("customer");
  const [items, setItems] = useState<Item[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [paymentModes, setPaymentModes] = useState<string[]>(["Cash", "UPI"]);

  const [customerName, setCustomerName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [potNumber, setPotNumber] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [sessionCount, setSessionCount] = useState(1);
  const [paymentMode, setPaymentMode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: itemsData }, { data: eventData }, { data: payData }] = await Promise.all([
        supabase.from("items").select("*").eq("is_active", true).order("name"),
        supabase.from("events").select("id").eq("is_active", true).limit(1).maybeSingle(),
        supabase.from("app_config").select("value").eq("key", "payment_settings").maybeSingle(),
      ]);
      if (itemsData) setItems(itemsData);
      if (eventData) setActiveEventId(eventData.id);
      if (payData?.value) {
        const v = payData.value as { cash_enabled?: boolean; upi_enabled?: boolean };
        const modes: string[] = [];
        if (v.cash_enabled !== false) modes.push("Cash");
        if (v.upi_enabled !== false) modes.push("UPI");
        setPaymentModes(modes);
      }
    };
    fetchData();
  }, []);

  const price = selectedItem
    ? sessionCount === 1 ? selectedItem.price_1_session : selectedItem.price_2_sessions
    : 0;

  const handleConfirm = async () => {
    if (!activeEventId) { toast.error("No active event"); return; }
    if (!selectedItem) return;
    setLoading(true);
    const { error } = await supabase.from("orders").insert({
      customer_name: customerName,
      customer_number: customerNumber,
      table_number: tableNumber || null,
      pot_number: potNumber || null,
      item_id: selectedItem.id,
      session_count: sessionCount,
      price,
      payment_mode: paymentMode,
      event_id: activeEventId,
      created_by: staffName,
      status: "confirmed",
      current_session: 0,
    });
    setLoading(false);
    if (error) { toast.error("Failed to create order"); return; }
    toast.success("Order confirmed! ✅");
    onComplete?.();
  };

  if (!activeEventId && step === "customer") {
    return <p className="text-center text-destructive py-8 font-semibold">No active event. Ask admin to activate one.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {["customer", "item", "session", "payment", "confirm"].map((s, i) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= ["customer", "item", "session", "payment", "confirm"].indexOf(step) ? "gold-gradient" : "bg-muted"}`} />
        ))}
      </div>

      {step === "customer" && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold">Customer Details</h3>
          <div><Label>Name *</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" /></div>
          <div><Label>Phone *</Label><Input value={customerNumber} onChange={(e) => setCustomerNumber(e.target.value)} placeholder="Phone number" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Table #</Label><Input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder="Optional" /></div>
            <div><Label>Pot #</Label><Input value={potNumber} onChange={(e) => setPotNumber(e.target.value)} placeholder="Optional" /></div>
          </div>
          <Button className="w-full gold-gradient text-primary-foreground" disabled={!customerName || !customerNumber} onClick={() => setStep("item")}>
            Next →
          </Button>
        </div>
      )}

      {step === "item" && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold">Select Item</h3>
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <button key={item.id} onClick={() => { setSelectedItem(item); setStep("session"); }}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card p-5 text-card-foreground transition-all active:scale-95 hover:border-primary/50 hover:gold-glow">
                <span className="font-display font-semibold text-sm uppercase">{item.name}</span>
                <span className="text-xs text-muted-foreground">₹{item.price_1_session} / ₹{item.price_2_sessions}</span>
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => setStep("customer")}>← Back</Button>
        </div>
      )}

      {step === "session" && selectedItem && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold">Session Type</h3>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2].map((s) => (
              <button key={s} onClick={() => { setSessionCount(s); setStep("payment"); }}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-6 transition-all active:scale-95 ${sessionCount === s ? "border-primary gold-glow" : "border-border bg-card"}`}>
                <span className="text-3xl font-bold">{s}</span>
                <span className="font-display text-xs uppercase">Session{s > 1 ? "s" : ""}</span>
                <span className="text-lg font-bold gold-text">₹{s === 1 ? selectedItem.price_1_session : selectedItem.price_2_sessions}</span>
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => setStep("item")}>← Back</Button>
        </div>
      )}

      {step === "payment" && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold">Payment Mode</h3>
          <div className="grid grid-cols-2 gap-3">
            {paymentModes.map((mode) => (
              <button key={mode} onClick={() => { setPaymentMode(mode); setStep("confirm"); }}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-6 text-card-foreground transition-all active:scale-95 hover:border-primary/50 hover:gold-glow">
                <span className="text-3xl">{mode === "Cash" ? "💵" : "📱"}</span>
                <span className="font-display font-semibold uppercase">{mode}</span>
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => setStep("session")}>← Back</Button>
        </div>
      )}

      {step === "confirm" && selectedItem && (
        <div className="space-y-4">
          <h3 className="font-display font-semibold">Confirm Order</h3>
          <Card className="border-primary/30">
            <CardContent className="space-y-2 pt-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{customerName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{customerNumber}</span></div>
              {tableNumber && <div className="flex justify-between"><span className="text-muted-foreground">Table</span><span>{tableNumber}</span></div>}
              {potNumber && <div className="flex justify-between"><span className="text-muted-foreground">Pot</span><span>{potNumber}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Item</span><span>{selectedItem.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Sessions</span><span>{sessionCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span>{paymentMode}</span></div>
              <div className="flex justify-between border-t border-border pt-2 font-bold text-lg">
                <span>Total</span><span className="gold-text">₹{price}</span>
              </div>
            </CardContent>
          </Card>
          <Button onClick={handleConfirm} disabled={loading} className="w-full gold-gradient text-primary-foreground py-6 text-lg font-bold">
            {loading ? "Creating..." : "✅ CONFIRM PAYMENT"}
          </Button>
          <Button variant="secondary" onClick={() => setStep("payment")} className="w-full">← Back</Button>
        </div>
      )}
    </div>
  );
};

export default AddSale;
