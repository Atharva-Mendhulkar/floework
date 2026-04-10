import React, { useEffect } from 'react';
import { useGetFocusWindowsQuery, useGetGoogleCalendarStatusQuery, useDisconnectGoogleCalendarMutation } from '@/store/api';
import { Calendar, Download, AlertCircle, CheckCircle2 } from 'lucide-react';

const PeakFocusWindows = () => {
  const { data: windowsRes, isLoading: isWindowsLoading } = useGetFocusWindowsQuery();
  const { data: statusRes, isLoading: isStatusLoading, refetch: refetchStatus } = useGetGoogleCalendarStatusQuery();
  const [disconnectGcal] = useDisconnectGoogleCalendarMutation();

  const windows = windowsRes?.data || [];
  const gcalStatus = statusRes?.data;
  
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'gcal:connected') {
        refetchStatus();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refetchStatus]);

  const handleConnectGoogleCalendar = () => {
    const token = localStorage.getItem('floe_token');
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    window.open(
      `http://127.0.0.1:5001/api/v1/auth/google-calendar?token=${token}`,
      'Connect Google Calendar',
      `width=${width},height=${height},left=${left},top=${top}`
    );
  };

  const downloadIcs = async () => {
    const token = localStorage.getItem('floe_token');
    try {
      const res = await fetch('http://127.0.0.1:5001/api/v1/analytics/focus-windows/ics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'floework-focus-windows.ics';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download ICS', e);
    }
  };

  if (isWindowsLoading || isStatusLoading) {
    return <div className="animate-pulse h-32 bg-slate-50 rounded-2xl border border-slate-100" />;
  }

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'pm' : 'am';
    const hr = h % 12 || 12;
    return `${hr}${ampm}`;
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 flex flex-col gap-5 mt-4">
      <div>
        <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
          <Calendar size={16} className="text-indigo-500" />
          Your best focus windows
        </h3>
        <p className="text-[12px] text-slate-400 mt-0.5">Based on your highest uninterrupted blocks over the last 4 weeks</p>
      </div>

      {windows.length > 0 ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2.5">
            {windows.map((w: any, idx: number) => (
              <div key={idx} className="bg-indigo-50/80 border border-indigo-100/50 text-indigo-700 px-3.5 py-1.5 rounded-full text-[13px] font-semibold flex items-center gap-1.5 shadow-sm">
                <span>{days[w.dayOfWeek]}</span>
                <span className="opacity-50">•</span>
                <span>{formatHour(w.startHour)} – {formatHour(w.endHour)}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center gap-4">
            {!gcalStatus?.connected ? (
              <div className="flex items-center gap-4">
                <button
                  onClick={downloadIcs}
                  className="flex items-center gap-2 text-[13px] font-semibold text-indigo-700 bg-white border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all shadow-sm"
                >
                  <Download size={14} />
                  Download .ics
                </button>
                <div className="h-6 w-px bg-slate-200" />
                <button
                  onClick={handleConnectGoogleCalendar}
                  className="text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Connect Google Calendar
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 size={16} />
                  <span className="text-[13px] font-semibold">Synced to Google Calendar</span>
                  <span className="text-[11px] font-medium text-emerald-600/60 ml-1">
                    ({gcalStatus.googleEmail})
                  </span>
                </div>
                <button
                  onClick={() => disconnectGcal().unwrap()}
                  className="text-[12px] font-medium text-slate-400 hover:text-red-500 transition-colors"
                >
                  Remove sync
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-100 p-4 rounded-xl">
          <AlertCircle size={16} className="text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[13px] font-medium text-slate-600 leading-relaxed">
            Run focus sessions for a few more weeks to unlock your peak focus windows. We need a minimum amount of data to confidently reserve calendar slots.
          </p>
        </div>
      )}
    </div>
  );
};

export default PeakFocusWindows;
