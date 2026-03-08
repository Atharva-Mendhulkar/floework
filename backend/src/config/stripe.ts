import Stripe from 'stripe';

const stripeKey = process.env.STRIPE_SECRET_KEY || '';
export const stripe = stripeKey ? new Stripe(stripeKey) : null;

export const PLANS = {
    PRO: {
        name: 'Pro',
        priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_placeholder',
        price: 12,
        interval: 'month' as const,
        features: [
            'Unlimited tasks & sprints',
            'Execution Intelligence signals',
            'Focus Stability heatmap',
            'AI narrative insights',
            'Up to 10 team members',
            'Priority support',
        ],
    },
    TEAM: {
        name: 'Team',
        priceId: process.env.STRIPE_TEAM_PRICE_ID || 'price_team_placeholder',
        price: 39,
        interval: 'month' as const,
        features: [
            'Everything in Pro',
            'Unlimited team members',
            'Advanced burnout analytics',
            'Bottleneck attribution',
            'RBAC + admin controls',
            'Custom integrations (coming soon)',
        ],
    },
} as const;
