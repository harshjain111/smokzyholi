import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface ExpiredOrder {
  id: string;
  customer_name: string;
  pot_number: string | null;
  table_number: string | null;
  current_session: number;
  session_count: number;
}

interface TimerExpiredAlertProps {
  expiredOrders: ExpiredOrder[];
  onCollect: (orderId: string) => void;
}

const useAlarmSound = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playBeep = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "square";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  }, []);

  const startAlarm = useCallback(() => {
    playBeep();
    intervalRef.current = setInterval(playBeep, 2000);
  }, [playBeep]);

  const stopAlarm = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopAlarm();
  }, [stopAlarm]);

  return { startAlarm, stopAlarm };
};

const TimerExpiredAlert = ({ expiredOrders, onCollect }: TimerExpiredAlertProps) => {
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set());
  const { startAlarm, stopAlarm } = useAlarmSound();
  const alarmActiveRef = useRef(false);

  const visibleOrders = expiredOrders.filter((o) => !snoozedIds.has(o.id));

  useEffect(() => {
    if (visibleOrders.length > 0 && !alarmActiveRef.current) {
      alarmActiveRef.current = true;
      startAlarm();
      try { navigator.vibrate?.([500, 300, 500, 300, 500, 300, 500]); } catch {}
    } else if (visibleOrders.length === 0 && alarmActiveRef.current) {
      alarmActiveRef.current = false;
      stopAlarm();
    }
  }, [visibleOrders.length, startAlarm, stopAlarm]);

  // Re-vibrate every 5 seconds while alert is showing
  useEffect(() => {
    if (visibleOrders.length === 0) return;
    const vibInterval = setInterval(() => {
      try { navigator.vibrate?.([500, 300, 500, 300, 500]); } catch {}
    }, 5000);
    return () => clearInterval(vibInterval);
  }, [visibleOrders.length]);

  const handleSnooze = (orderId: string) => {
    setSnoozedIds((prev) => {
      const next = new Set(prev);
      next.add(orderId);
      return next;
    });
    // Auto-unsnooze after 2 minutes
    setTimeout(() => {
      setSnoozedIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }, 2 * 60 * 1000);
  };

  const handleCollect = (orderId: string) => {
    setSnoozedIds((prev) => {
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
    onCollect(orderId);
  };

  // Clean up snoozed IDs for orders no longer expired
  useEffect(() => {
    const expiredIds = new Set(expiredOrders.map((o) => o.id));
    setSnoozedIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => { if (expiredIds.has(id)) next.add(id); });
      return next.size !== prev.size ? next : prev;
    });
  }, [expiredOrders]);

  if (visibleOrders.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 max-h-[80vh] overflow-y-auto">
        {visibleOrders.map((order) => (
          <div
            key={order.id}
            className="bg-destructive text-destructive-foreground rounded-xl p-6 space-y-4 animate-pulse"
          >
            <div className="text-center space-y-2">
              <p className="text-4xl">🔔</p>
              <h2 className="text-xl font-display font-bold">TIME'S UP!</h2>
              <p className="text-lg font-bold">{order.customer_name}</p>
              <div className="flex justify-center gap-3 text-sm opacity-90">
                {order.pot_number && <span>Pot #{order.pot_number}</span>}
                {order.table_number && <span>Table {order.table_number}</span>}
                <span>Session {order.current_session}/{order.session_count}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => handleSnooze(order.id)}
                variant="outline"
                className="flex-1 border-destructive-foreground/50 text-destructive-foreground hover:bg-destructive-foreground/10"
              >
                ⏸ Snooze 2m
              </Button>
              <Button
                onClick={() => handleCollect(order.id)}
                className="flex-1 bg-background text-foreground font-bold hover:bg-background/90"
              >
                🫕 COLLECT
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimerExpiredAlert;
