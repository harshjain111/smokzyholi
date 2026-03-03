import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Check, X, Edit2 } from "lucide-react";

interface Item {
  id: string;
  name: string;
  price_1_session: number;
  price_2_sessions: number;
  default_duration_mins: number;
  is_active: boolean;
}

interface TimerCfg {
  id: string;
  default_duration_mins: number;
  reminder1_mins: number;
  reminder2_mins: number;
  escalation_mins: number;
  event_id: string | null;
}

const SettingsPage = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [timerCfg, setTimerCfg] = useState<TimerCfg | null>(null);
  const [paymentCfg, setPaymentCfg] = useState<{ cash_enabled: boolean; upi_enabled: boolean; upi_id: string }>({
    cash_enabled: true, upi_enabled: true, upi_id: "",
  });
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({ name: "", price_1_session: 0, price_2_sessions: 0, default_duration_mins: 45 });

  useEffect(() => {
    fetchItems();
    fetchTimerConfig();
    fetchPaymentConfig();
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase.from("items").select("*").order("name");
    if (data) setItems(data);
  };

  const fetchTimerConfig = async () => {
    const { data } = await supabase.from("timer_config").select("*").limit(1).maybeSingle();
    if (data) setTimerCfg(data);
  };

  const fetchPaymentConfig = async () => {
    const { data } = await supabase.from("app_config").select("value").eq("key", "payment_settings").maybeSingle();
    if (data?.value) {
      const v = data.value as { cash_enabled?: boolean; upi_enabled?: boolean; upi_id?: string };
      setPaymentCfg({ cash_enabled: v.cash_enabled ?? true, upi_enabled: v.upi_enabled ?? true, upi_id: v.upi_id ?? "" });
    }
  };

  const saveItem = async () => {
    if (!itemForm.name) { toast.error("Name required"); return; }
    if (editItemId) {
      await supabase.from("items").update(itemForm).eq("id", editItemId);
      toast.success("Item updated");
    } else {
      await supabase.from("items").insert(itemForm);
      toast.success("Item added");
    }
    setShowItemForm(false);
    setEditItemId(null);
    setItemForm({ name: "", price_1_session: 0, price_2_sessions: 0, default_duration_mins: 45 });
    fetchItems();
  };

  const saveTimerConfig = async () => {
    if (!timerCfg) return;
    const { id, ...rest } = timerCfg;
    await supabase.from("timer_config").update(rest).eq("id", id);
    toast.success("Timer config saved");
  };

  const savePaymentConfig = async () => {
    const { data: existing } = await supabase.from("app_config").select("id").eq("key", "payment_settings").maybeSingle();
    if (existing) {
      await supabase.from("app_config").update({ value: paymentCfg as any }).eq("key", "payment_settings");
    } else {
      await supabase.from("app_config").insert({ key: "payment_settings", value: paymentCfg as any });
    }
    toast.success("Payment settings saved");
  };

  return (
    <Tabs defaultValue="items" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="items">Items</TabsTrigger>
        <TabsTrigger value="timer">Timer</TabsTrigger>
        <TabsTrigger value="payment">Payment</TabsTrigger>
      </TabsList>

      <TabsContent value="items" className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-display font-semibold">Menu Items</h3>
          {!showItemForm && (
            <Button size="sm" className="gold-gradient text-primary-foreground" onClick={() => setShowItemForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          )}
        </div>

        {showItemForm && (
          <Card className="border-primary/30">
            <CardContent className="space-y-3 pt-4">
              <div>
                <Label>Item Name</Label>
                <Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>1-Session Price</Label>
                  <Input type="number" value={itemForm.price_1_session} onChange={(e) => setItemForm({ ...itemForm, price_1_session: +e.target.value })} />
                </div>
                <div>
                  <Label>2-Session Price</Label>
                  <Input type="number" value={itemForm.price_2_sessions} onChange={(e) => setItemForm({ ...itemForm, price_2_sessions: +e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Default Duration (mins)</Label>
                <Input type="number" value={itemForm.default_duration_mins} onChange={(e) => setItemForm({ ...itemForm, default_duration_mins: +e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveItem} className="gold-gradient text-primary-foreground flex-1">
                  <Check className="h-4 w-4 mr-1" /> Save
                </Button>
                <Button variant="secondary" onClick={() => { setShowItemForm(false); setEditItemId(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-muted-foreground">₹{item.price_1_session} / ₹{item.price_2_sessions} • {item.default_duration_mins}min</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => {
                setItemForm({ name: item.name, price_1_session: item.price_1_session, price_2_sessions: item.price_2_sessions, default_duration_mins: item.default_duration_mins });
                setEditItemId(item.id);
                setShowItemForm(true);
              }}>
                <Edit2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="timer" className="space-y-3">
        {timerCfg ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Timer Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Default Duration (mins)</Label>
                <Input type="number" value={timerCfg.default_duration_mins} onChange={(e) => setTimerCfg({ ...timerCfg, default_duration_mins: +e.target.value })} />
              </div>
              <div>
                <Label>Reminder 1 (mins)</Label>
                <Input type="number" value={timerCfg.reminder1_mins} onChange={(e) => setTimerCfg({ ...timerCfg, reminder1_mins: +e.target.value })} />
              </div>
              <div>
                <Label>Reminder 2 (mins)</Label>
                <Input type="number" value={timerCfg.reminder2_mins} onChange={(e) => setTimerCfg({ ...timerCfg, reminder2_mins: +e.target.value })} />
              </div>
              <div>
                <Label>Escalation (mins)</Label>
                <Input type="number" value={timerCfg.escalation_mins} onChange={(e) => setTimerCfg({ ...timerCfg, escalation_mins: +e.target.value })} />
              </div>
              <Button onClick={saveTimerConfig} className="w-full gold-gradient text-primary-foreground">Save Timer Config</Button>
            </CardContent>
          </Card>
        ) : (
          <p className="text-center text-muted-foreground py-8">No timer config found. Create an event first.</p>
        )}
      </TabsContent>

      <TabsContent value="payment" className="space-y-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Payment Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Cash Payments</Label>
              <Switch checked={paymentCfg.cash_enabled} onCheckedChange={(v) => setPaymentCfg({ ...paymentCfg, cash_enabled: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>UPI Payments</Label>
              <Switch checked={paymentCfg.upi_enabled} onCheckedChange={(v) => setPaymentCfg({ ...paymentCfg, upi_enabled: v })} />
            </div>
            {paymentCfg.upi_enabled && (
              <div>
                <Label>UPI ID</Label>
                <Input value={paymentCfg.upi_id} onChange={(e) => setPaymentCfg({ ...paymentCfg, upi_id: e.target.value })} placeholder="yourname@upi" />
              </div>
            )}
            <Button onClick={savePaymentConfig} className="w-full gold-gradient text-primary-foreground">Save Payment Settings</Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default SettingsPage;
