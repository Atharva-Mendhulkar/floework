import { useGetAlertsQuery, useMarkAlertReadMutation, useMarkAllAlertsReadMutation } from "@/store/api";
import { AlertCircle, CheckCircle2, Bell, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function AlertsPage() {
    const { data: response, isLoading, error } = useGetAlertsQuery();
    const [markRead, { isLoading: isMarking }] = useMarkAlertReadMutation();
    const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllAlertsReadMutation();

    const alerts = response?.data || [];
    const unreadCount = alerts.filter(a => !a.isRead).length;

    const handleMarkRead = async (id: string, isRead: boolean) => {
        if (isRead) return;
        try {
            await markRead(id).unwrap();
        } catch {
            toast.error("Failed to mark alert as read");
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllRead().unwrap();
            toast.success("All alerts marked as read");
        } catch {
            toast.error("Failed to clear alerts");
        }
    };

    return (
        <div className="flex-1 overflow-y-auto w-full max-w-4xl flex flex-col gap-6">
            <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        Alerts & Notifications
                        {unreadCount > 0 && (
                            <span className="bg-warning text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
                        )}
                    </h2>
                    <p className="text-text-secondary mt-1">Stay updated with messages, task assignments, and mentions.</p>
                </div>

                {unreadCount > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMarkAllRead}
                        disabled={isMarkingAll}
                        className="shrink-0"
                    >
                        <CheckSquare className="mr-2" size={16} />
                        Mark all read
                    </Button>
                )}
            </div>

            {isLoading && (
                <div className="flex items-center gap-2 text-text-muted">
                    <div className="w-4 h-4 rounded-full border-2 border-focus border-t-transparent animate-spin" />
                    Loading alerts...
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 text-warning p-4 bg-warning/10 rounded-xl">
                    <AlertCircle size={20} />
                    Failed to load alerts. Server might be down.
                </div>
            )}

            {!isLoading && !error && alerts.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-surface border border-border rounded-2xl border-dashed">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4 text-text-muted">
                        <Bell size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">You're all caught up!</h3>
                    <p className="text-text-secondary max-w-sm">
                        No new notifications. We'll alert you here when there's an update requiring your attention.
                    </p>
                </div>
            )}

            {!isLoading && !error && alerts.length > 0 && (
                <div className="grid gap-3">
                    {alerts.map(alert => (
                        <div
                            key={alert.id}
                            onClick={() => handleMarkRead(alert.id, alert.isRead)}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface border rounded-2xl transition-all gap-4 ${!alert.isRead
                                    ? "border-focus/30 shadow-sm cursor-pointer hover:border-focus/50 bg-focus/5"
                                    : "border-border opacity-70"
                                }`}
                        >
                            <div className="flex items-start gap-4 flex-1">
                                <div className={`mt-1 shrink-0 ${!alert.isRead ? "text-focus" : "text-text-muted"}`}>
                                    {!alert.isRead ? <Bell size={18} /> : <CheckCircle2 size={18} />}
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <h4 className={`font-semibold ${!alert.isRead ? "text-foreground" : "text-text-secondary"}`}>
                                            {alert.title}
                                        </h4>
                                        {!alert.isRead && <span className="w-2 h-2 rounded-full bg-focus" />}
                                    </div>
                                    <p className={`text-sm mt-0.5 ${!alert.isRead ? "text-text-secondary" : "text-text-muted line-clamp-1"}`}>
                                        {alert.message}
                                    </p>
                                    <span className="text-[10px] text-text-muted font-medium mt-2">
                                        {new Date(alert.createdAt).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
