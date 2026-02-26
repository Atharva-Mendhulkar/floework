import { useState, useEffect, useCallback } from "react";
import { Play, Pause, AlertTriangle, ChevronDown, Zap } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from "recharts";
import { useStartFocusSessionMutation, useStopFocusSessionMutation, useLogProductivityMutation } from "@/store/api";
import { toast } from "sonner";

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
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [startSessionApi] = useStartFocusSessionMutation();
  const [stopSessionApi] = useStopFocusSessionMutation();
  const [logProductivityApi] = useLogProductivityMutation();

  const staticTaskId = "3aefbbe9-a1cc-41b5-a4e7-22e3e1d2f809";

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

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
  const circumference = 2 * Math.PI * 110;
  const strokeDashoffset = circumference * (1 - progress);
  const currentQuality = Math.round(qualityData[qualityData.length - 1].quality);

  const handleTimerToggle = async () => {
    try {
      if (!isRunning) {
        const res = await startSessionApi(staticTaskId).unwrap();
        setActiveSessionId(res.data.id);
        setIsRunning(true);
        toast.info("Focus session started.");
      } else {
        setIsRunning(false);
        if (activeSessionId) {
          await stopSessionApi(activeSessionId).unwrap();
          setActiveSessionId(null);
          toast.success("Session saved!");
          const finalScore = Math.round(qualityData[qualityData.length - 1].quality);
          await logProductivityApi({ metric: "focus_quality", value: finalScore }).unwrap();
          toast.success(`Focus quality ${finalScore}% logged.`);
        }
      }
    } catch {
      toast.error("Could not sync with server.");
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8 px-4">

      {/* Active task chip */}
      <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm">
        <div className="w-6 h-6 rounded-lg bg-[#007dff] flex items-center justify-center">
          <Zap size={12} className="text-white" fill="white" />
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Anchored task</p>
          <p className="text-[13px] font-semibold text-slate-900">Component Library Pipeline</p>
        </div>
        <button className="ml-2 flex items-center gap-1 text-[12px] text-slate-400 hover:text-slate-600 transition-colors">
          Change <ChevronDown size={11} />
        </button>
      </div>

      {/* Timer ring */}
      <div className="relative w-[260px] h-[260px] flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 260 260">
          {/* Track */}
          <circle cx="130" cy="130" r="110" fill="none" stroke="#f1f5f9" strokeWidth="10" />
          {/* Progress arc */}
          <circle
            cx="130"
            cy="130"
            r="110"
            fill="none"
            stroke={isRunning ? "#007dff" : "#cbd5e1"}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000"
          />
        </svg>

        {/* Center content */}
        <div className="flex flex-col items-center z-10 gap-1">
          <span className="text-[48px] font-bold text-slate-900 tabular-nums tracking-tight leading-none">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
          <span className={`text-[12px] font-semibold tracking-wide uppercase ${isRunning ? "text-[#007dff]" : "text-slate-400"}`}>
            {isRunning ? "Focus active" : "Ready to focus"}
          </span>
          {isRunning && (
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#007dff] animate-pulse" />
              <span className="text-[11px] text-slate-400">{currentQuality}% quality</span>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleTimerToggle}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold transition-all shadow-sm
            ${isRunning
              ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
              : "bg-[#007dff] text-white hover:bg-[#0070e8] shadow-[#007dff]/25"
            }`}
        >
          {isRunning ? <Pause size={16} /> : <Play size={16} />}
          {isRunning ? "Pause Session" : "Start Focus"}
        </button>
        <button
          onClick={handleInterrupt}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-[14px] font-semibold bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors border border-amber-200"
        >
          <AlertTriangle size={15} />
          Log Interrupt
        </button>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-8 text-center">
        <div>
          <p className="text-2xl font-bold text-slate-900">{interrupts}</p>
          <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Interrupts</p>
        </div>
        <div className="w-px h-8 bg-slate-200" />
        <div>
          <p className="text-2xl font-bold text-slate-900">{currentQuality}%</p>
          <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Focus Quality</p>
        </div>
        <div className="w-px h-8 bg-slate-200" />
        <div>
          <p className="text-2xl font-bold text-slate-900">25m</p>
          <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Session Length</p>
        </div>
      </div>

      {/* Sparkline card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-semibold text-slate-700">Focus Quality Over Time</p>
          <span className="text-[11px] text-slate-400">Live</span>
        </div>
        <div className="h-20">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={qualityData}>
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11 }}
                formatter={(v: any) => [`${Math.round(v)}%`, "Quality"]}
              />
              <Line
                type="monotone"
                dataKey="quality"
                stroke="#007dff"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#007dff", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default FocusPage;
