import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit2, Check, X } from "lucide-react";

interface Event {
  id: string;
  name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const EventManager = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", event_date: "", start_time: "", end_time: "" });

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("*").order("event_date", { ascending: false });
    if (data) setEvents(data);
  };

  useEffect(() => { fetchEvents(); }, []);

  const resetForm = () => {
    setForm({ name: "", event_date: "", start_time: "", end_time: "" });
    setShowForm(false);
    setEditId(null);
  };

  const handleSave = async () => {
    if (!form.name || !form.event_date || !form.start_time || !form.end_time) {
      toast.error("All fields are required");
      return;
    }
    if (editId) {
      const { error } = await supabase.from("events").update(form).eq("id", editId);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Event updated");
    } else {
      const { error } = await supabase.from("events").insert(form);
      if (error) { toast.error("Failed to create"); return; }
      toast.success("Event created");
    }
    resetForm();
    fetchEvents();
  };

  const toggleActive = async (id: string, currentlyActive: boolean) => {
    if (!currentlyActive) {
      // Deactivate all others first
      await supabase.from("events").update({ is_active: false }).neq("id", id);
    }
    await supabase.from("events").update({ is_active: !currentlyActive }).eq("id", id);
    fetchEvents();
    toast.success(currentlyActive ? "Event deactivated" : "Event activated");
  };

  const startEdit = (e: Event) => {
    setForm({ name: e.name, event_date: e.event_date, start_time: e.start_time, end_time: e.end_time });
    setEditId(e.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Events</h2>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm" className="gold-gradient text-primary-foreground">
            <Plus className="h-4 w-4 mr-1" /> New Event
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{editId ? "Edit Event" : "New Event"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Event name" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="gold-gradient text-primary-foreground flex-1">
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
              <Button onClick={resetForm} variant="secondary">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {events.map((e) => (
        <Card key={e.id} className={e.is_active ? "border-primary/50 gold-glow" : ""}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-display font-semibold">{e.name}</p>
              <p className="text-xs text-muted-foreground">{e.event_date} • {e.start_time} – {e.end_time}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={e.is_active ? "default" : "secondary"} onClick={() => toggleActive(e.id, e.is_active)}>
                {e.is_active ? "Active" : "Activate"}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => startEdit(e)}>
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {events.length === 0 && !showForm && (
        <p className="text-center text-muted-foreground text-sm py-8">No events yet. Create one to get started.</p>
      )}
    </div>
  );
};

export default EventManager;
