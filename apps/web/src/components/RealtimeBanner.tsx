import { WifiOff } from "lucide-react";

interface Props {
  status: 'connected' | 'disconnected' | 'reconnecting';
}

export function RealtimeBanner({ status }: Props) {
  if (status === 'connected') return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-2.5 bg-white border border-amber-200 rounded-2xl shadow-xl shadow-amber-900/5 animate-in slide-in-from-bottom-4 duration-500">
      <div className="relative">
        <WifiOff size={18} className="text-amber-500" />
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse border-2 border-white" />
      </div>
      <div className="flex flex-col">
        <p className="text-[12px] font-bold text-amber-900 leading-tight">Connection Unstable</p>
        <p className="text-[11px] text-amber-700/80 font-medium">
          {status === 'disconnected' ? 'Live updates paused' : 'Reconnecting to stream...'}
        </p>
      </div>
    </div>
  );
}
