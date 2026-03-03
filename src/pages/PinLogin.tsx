import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PinLogin = () => {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleDigit = (digit: string) => {
    if (pin.length < 6) setPin((p) => p + digit);
  };

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (pin.length < 4) {
      toast.error("Enter at least 4 digits");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-pin", {
        body: { pin },
      });
      if (error || !data?.valid) {
        toast.error("Invalid PIN");
        setPin("");
      } else {
        login(data.role, data.name);
        toast.success(`Welcome, ${data.name}!`);
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="font-display text-5xl font-bold gold-text">SMOKZY</h1>
          <p className="mt-2 text-sm text-muted-foreground tracking-widest uppercase">
            Sales Manager
          </p>
        </div>

        {/* PIN Display */}
        <div className="mb-8 flex justify-center gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`h-4 w-4 rounded-full border-2 transition-all duration-200 ${
                i < pin.length
                  ? "border-primary bg-primary gold-glow"
                  : "border-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {digits.map((d, i) => {
            if (d === "") return <div key={i} />;
            if (d === "⌫") {
              return (
                <button
                  key={i}
                  onClick={handleDelete}
                  className="flex h-16 items-center justify-center rounded-xl bg-secondary text-2xl text-foreground active:scale-95 transition-transform"
                >
                  ⌫
                </button>
              );
            }
            return (
              <button
                key={i}
                onClick={() => handleDigit(d)}
                className="flex h-16 items-center justify-center rounded-xl bg-secondary text-2xl font-semibold text-foreground active:scale-95 transition-transform hover:bg-secondary/80"
              >
                {d}
              </button>
            );
          })}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || pin.length < 4}
          className="mt-6 w-full rounded-xl gold-gradient py-4 text-lg font-bold uppercase tracking-wider text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-40"
        >
          {loading ? "Verifying..." : "Enter"}
        </button>
      </div>
    </div>
  );
};

export default PinLogin;
