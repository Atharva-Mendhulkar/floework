import { useState, useEffect, useCallback } from "react";
import { Play, Pause, AlertTriangle, Link2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

const generateQualityData = () =>
  Array.from({ length: 20 }, (_, i) => ({
    time: i,
    quality: Math.min(100, Math.max(30, 70 + Math.random() * 30 - (i > 14 ? 20 : 0))),
  }));

const FocusPage = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60);
  const [interrupts, setInterrupts] = useState(0);
  const [qualityData, setQualityData] = useState(generateQualityData);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Simulate quality updates while running
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setQualityData((prev) => {
        const next = [...prev.slice(1)];
        const last = prev[prev.length - 1];
        next.push({
          time: last.time + 1,
          quality: Math.min(100, Math.max(20, last.quality + (Math.random() - 0.45) * 12)),
        });
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleInterrupt = useCallback(() => {
    setInterrupts((i) => i + 1);
    setQualityData((prev) => {
      const next = [...prev.slice(1)];
      const last = prev[prev.length - 1];
      next.push({ time: last.time + 1, quality: Math.max(20, last.quality - 25) });
      return next;
    });
  }, []);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const progress = 1 - seconds / (25 * 60);
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 py-8">
      {/* Active task card */}
      <div className="bg-surface rounded-2xl shadow-card px-5 py-3 flex items-center gap-3">
        <Link2 size={16} className="text-focus" />
        <div>
          <p className="text-xs text-text-muted">Currently focused on</p>
          <p className="text-sm font-semibold text-foreground">Implement auth module</p>
        </div>
        <div className="w-7 h-7 rounded-lg bg-focus flex items-center justify-center text-focus-foreground text-[10px] font-semibold ml-2">
          MT
        </div>
      </div>

      {/* Timer ring */}
      <div className="relative w-[280px] h-[280px] flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 280 280">
          {/* Track */}
          <circle
            cx="140"
            cy="140"
            r="120"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
          />
          {/* Progress */}
          <circle
            cx="140"
            cy="140"
            r="120"
            fill="none"
            stroke={isRunning ? "hsl(var(--focus))" : "hsl(var(--muted-foreground))"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="flex flex-col items-center z-10">
          <span className="text-5xl font-bold text-foreground tabular-nums tracking-tight">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
          <span className="text-xs text-text-muted mt-1">
            {isRunning ? "Focus active" : "Ready to focus"}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-colors ${
            isRunning
              ? "bg-secondary text-foreground hover:bg-muted"
              : "bg-focus text-focus-foreground hover:opacity-90"
          }`}
        >
          {isRunning ? <Pause size={16} /> : <Play size={16} />}
          {isRunning ? "Pause" : "Start Focus"}
        </button>
        <button
          onClick={handleInterrupt}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
        >
          <AlertTriangle size={16} />
          Log Interrupt
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-center">
        <div>
          <p className="text-2xl font-bold text-foreground">{interrupts}</p>
          <p className="text-xs text-text-muted">Interrupts</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div>
          <p className="text-2xl font-bold text-foreground">{Math.round(qualityData[qualityData.length - 1].quality)}%</p>
          <p className="text-xs text-text-muted">Focus Quality</p>
        </div>
      </div>

      {/* Sparkline */}
      <div className="bg-surface rounded-2xl shadow-card p-5 w-full max-w-md">
        <p className="text-xs font-medium text-text-secondary mb-3">Focus Quality Over Time</p>
        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={qualityData}>
              <YAxis domain={[0, 100]} hide />
              <Line
                type="monotone"
                dataKey="quality"
                stroke="hsl(216, 38%, 68%)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default FocusPage;
