import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { stripe, PLANS } from '../config/stripe';

// GET /billing/status
export const getBillingStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const subscription = await prisma.subscription.findUnique({ where: { userId } });

        res.json({
            success: true,
            data: subscription || { plan: 'FREE', status: 'ACTIVE', currentPeriodEnd: null },
        });
    } catch (error) {
        next(error);
    }
};

// POST /billing/checkout
export const createCheckoutSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { plan } = req.body as { plan: 'PRO' | 'TEAM' };
        const user = (req as any).user;

        if (!stripe) {
            // Dev mode: simulate success without calling Stripe
            await prisma.subscription.upsert({
                where: { userId: user.id },
                update: { plan, status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
                create: { userId: user.id, plan, status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
            });
            return res.json({ success: true, data: { url: null, devMode: true, plan } });
        }

        const planConfig = PLANS[plan];
        if (!planConfig) return next(new AppError('Invalid plan', 400));

        // Get or create Stripe customer
        let subscription = await prisma.subscription.findUnique({ where: { userId: user.id } });
        let customerId = subscription?.stripeCustomerId;

        if (!customerId) {
            const customer = await stripe.customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } });
            customerId = customer.id;
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: planConfig.priceId, quantity: 1 }],
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?billing=success`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/billing?cancelled=true`,
            metadata: { userId: user.id, plan },
        });

        res.json({ success: true, data: { url: session.url } });
    } catch (error) {
        next(error);
    }
};

// POST /billing/portal
export const createPortalSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        if (!stripe) return next(new AppError('Stripe not configured', 503));

        const sub = await prisma.subscription.findUnique({ where: { userId } });
        if (!sub?.stripeCustomerId) return next(new AppError('No active subscription', 404));

        const session = await stripe.billingPortal.sessions.create({
            customer: sub.stripeCustomerId,
            return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/billing`,
        });

        res.json({ success: true, data: { url: session.url } });
    } catch (error) {
        next(error);
    }
};

// POST /billing/webhook  (raw body required — handled in server.ts)
export const handleWebhook = async (req: Request, res: Response) => {
    if (!stripe) return res.json({ received: true });

    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
        event = endpointSecret
            ? stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
            : JSON.parse(req.body.toString());
    } catch (err: any) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as any;
                const { userId, plan } = session.metadata;
                const stripeSubId: string = session.subscription;
                const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);

                await prisma.subscription.upsert({
                    where: { userId },
                    update: {
                        stripeCustomerId: session.customer,
                        stripeSubscriptionId: stripeSubId,
                        plan,
                        status: 'ACTIVE',
                        currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
                    },
                    create: {
                        userId,
                        stripeCustomerId: session.customer,
                        stripeSubscriptionId: stripeSubId,
                        plan,
                        status: 'ACTIVE',
                        currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
                    },
                });
                break;
            }
            case 'customer.subscription.deleted': {
                const sub = event.data.object as any;
                await prisma.subscription.updateMany({
                    where: { stripeSubscriptionId: sub.id },
                    data: { status: 'CANCELLED', plan: 'FREE' },
                });
                break;
            }
            case 'invoice.payment_failed': {
                const invoice = event.data.object as any;
                await prisma.subscription.updateMany({
                    where: { stripeCustomerId: invoice.customer },
                    data: { status: 'PAST_DUE' },
                });
                break;
            }
        }
    } catch (err) {
        console.error('[webhook] Handler error:', err);
    }

    res.json({ received: true });
};
