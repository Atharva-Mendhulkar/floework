import { CheckCircle2, Zap, Users, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PLANS = [
  { id: 'free',  name: 'Free',  price: '₹0',    features: ['1 project', '3 members', 'Core analytics'] },
  { id: 'pro',   name: 'Pro',   price: '₹699',  features: ['Unlimited projects', 'All analytics', 'Deep Work ICS'] },
  { id: 'team',  name: 'Team',  price: '₹1,999', features: ['Everything in Pro', 'Team burnout alerts', 'SSO'] },
]

export default function BillingPage() {

    const handleUpgrade = (planId: string) => {
        toast.info('Billing is disabled in the showcase build. Full Stripe integration available in production.')
    }

    return (
        <div className="flex-1 overflow-y-auto flex flex-col gap-6 max-w-5xl">
            <div>
                <h2 className="text-[15px] font-semibold text-slate-900">Billing & Plans</h2>
                <p className="text-[12px] text-slate-400 mt-0.5">Manage your subscription and upgrade your workspace.</p>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLANS.map((plan) => {
                    return (
                        <div key={plan.id} className="relative flex flex-col bg-white border rounded-2xl p-5 shadow-sm hover:border-slate-300">
                            <div className="mb-4">
                                <h3 className="text-[14px] font-bold text-slate-900">{plan.name}</h3>
                                <div className="mt-2 text-3xl font-black text-slate-900">{plan.price}</div>
                                {plan.price !== '₹0' && <div className="text-[12px] text-slate-400">/month</div>}
                            </div>
                            <ul className="flex flex-col gap-2 mb-5 flex-1">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex items-start gap-2">
                                        <CheckCircle2 size={13} className="shrink-0 mt-0.5 text-blue-500" />
                                        <span className="text-[12px] text-slate-600">{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => handleUpgrade(plan.id)}
                                className="w-full py-2 rounded-xl text-[13px] font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-all"
                            >
                                Upgrade Component Stub
                            </button>
                        </div>
                    );
                })}
            </div>

            <p className="text-[11px] text-slate-400 text-center text-amber-500">
                ⓘ Showcase mode: Billing is completely disabled as per build.md spec.
            </p>
        </div>
    );
}
