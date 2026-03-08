import { CheckCircle2, Zap, Users, Crown, ExternalLink, Loader2 } from "lucide-react";
import { useGetBillingStatusQuery, useCreateCheckoutSessionMutation, useCreatePortalSessionMutation } from "@/store/api";
import { toast } from "sonner";

const PLANS = [
    {
        key: "FREE" as const,
        name: "Free",
        price: 0,
        description: "For individuals getting started",
        icon: Zap,
        color: "#64748b",
        features: [
            "Up to 3 projects",
            "Basic task board",
            "Focus session timer",
            "Activity dashboard",
        ],
        cta: "Current Plan",
    },
    {
        key: "PRO" as const,
        name: "Pro",
        price: 12,
        description: "For serious individual contributors",
        icon: Zap,
        color: "#007dff",
        features: [
            "Unlimited projects & sprints",
            "Execution Intelligence signals",
            "Focus Stability heatmap",
            "AI narrative insights",
            "Up to 10 team members",
            "Priority support",
        ],
        cta: "Upgrade to Pro",
        highlighted: true,
    },
    {
        key: "TEAM" as const,
        name: "Team",
        price: 39,
        description: "For high-output engineering teams",
        icon: Users,
        color: "#7c3aed",
        features: [
            "Everything in Pro",
            "Unlimited team members",
            "Advanced burnout analytics",
            "Bottleneck attribution",
            "RBAC + admin controls",
            "Custom integrations (soon)",
        ],
        cta: "Upgrade to Team",
    },
];

const statusLabel: Record<string, string> = {
    ACTIVE: "Active",
    PAST_DUE: "Past Due",
    CANCELLED: "Cancelled",
};

const statusColor: Record<string, string> = {
    ACTIVE: "text-emerald-600 bg-emerald-50",
    PAST_DUE: "text-amber-600 bg-amber-50",
    CANCELLED: "text-red-500 bg-red-50",
};

export default function BillingPage() {
    const { data: billingRes, isLoading } = useGetBillingStatusQuery();
    const [createCheckout, { isLoading: isCheckingOut }] = useCreateCheckoutSessionMutation();
    const [createPortal, { isLoading: isPortaling }] = useCreatePortalSessionMutation();

    const billing = billingRes?.data;
    const currentPlan = billing?.plan || "FREE";

    const handleUpgrade = async (plan: "PRO" | "TEAM") => {
        try {
            const res = await createCheckout(plan).unwrap();
            if (res.data?.url) {
                window.location.href = res.data.url;
            } else if (res.data?.devMode) {
                toast.success(`Activated ${plan} plan (dev mode — no Stripe key configured)`);
            }
        } catch {
            toast.error("Failed to start checkout. Please try again.");
        }
    };

    const handleManage = async () => {
        try {
            const res = await createPortal().unwrap();
            if (res.data?.url) window.location.href = res.data.url;
        } catch {
            toast.error("Failed to open billing portal.");
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#007dff]" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto flex flex-col gap-6 max-w-5xl">
            <div>
                <h2 className="text-[15px] font-semibold text-slate-900">Billing & Plans</h2>
                <p className="text-[12px] text-slate-400 mt-0.5">Manage your subscription and upgrade your workspace.</p>
            </div>

            {/* Current plan badge */}
            {billing && currentPlan !== "FREE" && (
                <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Crown size={18} className="text-[#007dff]" />
                        <div>
                            <p className="text-[13px] font-semibold text-slate-800">
                                {currentPlan} Plan
                            </p>
                            {billing.currentPeriodEnd && (
                                <p className="text-[11px] text-slate-400">
                                    Renews {new Date(billing.currentPeriodEnd).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ml-2 ${statusColor[billing.status] || ""}`}>
                            {statusLabel[billing.status] || billing.status}
                        </span>
                    </div>
                    <button
                        onClick={handleManage}
                        disabled={isPortaling}
                        className="flex items-center gap-1.5 text-[12px] font-medium text-[#007dff] hover:underline disabled:opacity-50"
                    >
                        {isPortaling ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
                        Manage subscription
                    </button>
                </div>
            )}

            {/* Plan cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLANS.map((plan) => {
                    const isCurrentPlan = currentPlan === plan.key;
                    const Icon = plan.icon;
                    return (
                        <div
                            key={plan.key}
                            className={`relative flex flex-col bg-white border rounded-2xl p-5 transition-all
                                ${plan.highlighted
                                    ? "border-[#007dff]/60 shadow-[0_0_0_1px_#007dff30,0_8px_32px_#007dff14]"
                                    : "border-slate-200/80 shadow-sm hover:border-slate-300"
                                }`}
                        >
                            {plan.highlighted && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="bg-[#007dff] text-white text-[10px] font-bold px-3 py-1 rounded-full">
                                        MOST POPULAR
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${plan.color}18` }}>
                                    <Icon size={16} style={{ color: plan.color }} />
                                </div>
                                <div>
                                    <h3 className="text-[14px] font-bold text-slate-900">{plan.name}</h3>
                                    <p className="text-[10px] text-slate-400">{plan.description}</p>
                                </div>
                            </div>

                            <div className="mb-4">
                                <span className="text-3xl font-black text-slate-900">${plan.price}</span>
                                {plan.price > 0 && <span className="text-[12px] text-slate-400 ml-1">/month</span>}
                            </div>

                            <ul className="flex flex-col gap-2 mb-5 flex-1">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex items-start gap-2">
                                        <CheckCircle2 size={13} className="shrink-0 mt-0.5" style={{ color: plan.color }} />
                                        <span className="text-[12px] text-slate-600">{f}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                disabled={isCurrentPlan || isCheckingOut || plan.key === "FREE"}
                                onClick={() => !isCurrentPlan && plan.key !== "FREE" && handleUpgrade(plan.key as "PRO" | "TEAM")}
                                className={`w-full py-2 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-2
                                    ${isCurrentPlan
                                        ? "bg-slate-100 text-slate-400 cursor-default"
                                        : plan.key === "FREE"
                                            ? "bg-slate-100 text-slate-400 cursor-default"
                                            : plan.highlighted
                                                ? "bg-[#007dff] hover:bg-[#0068d6] text-white shadow-sm"
                                                : "bg-slate-800 hover:bg-slate-700 text-white"
                                    }`}
                            >
                                {isCheckingOut && !isCurrentPlan ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : null}
                                {isCurrentPlan ? "Current Plan" : plan.cta}
                            </button>
                        </div>
                    );
                })}
            </div>

            <p className="text-[11px] text-slate-400 text-center">
                All plans include a 14-day free trial. Cancel anytime.
                {!process.env.VITE_STRIPE_KEY && (
                    <span className="ml-2 text-amber-500">ⓘ Dev mode: payments simulated locally.</span>
                )}
            </p>
        </div>
    );
}
