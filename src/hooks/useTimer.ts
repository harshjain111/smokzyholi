import { useState, useEffect, useRef } from "react";

export const useTimer = (endTime: string | null) => {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!endTime) { setSecondsLeft(null); return; }

    const calc = () => {
      const diff = Math.floor((new Date(endTime).getTime() - Date.now()) / 1000);
      setSecondsLeft(diff);
    };
    calc();
    intervalRef.current = setInterval(calc, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [endTime]);

  const formatTime = (s: number) => {
    const abs = Math.abs(s);
    const m = Math.floor(abs / 60);
    const sec = abs % 60;
    return `${s < 0 ? "-" : ""}${m}:${sec.toString().padStart(2, "0")}`;
  };

  const status: "green" | "orange" | "red" | null =
    secondsLeft === null ? null :
    secondsLeft > 600 ? "green" :
    secondsLeft > 0 ? "orange" : "red";

  return { secondsLeft, formatted: secondsLeft !== null ? formatTime(secondsLeft) : "--:--", status };
};
