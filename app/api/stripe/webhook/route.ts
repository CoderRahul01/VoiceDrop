import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { clerkClient } from '@clerk/nextjs/server';
import type { PlanId } from '@/lib/plans';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Map Stripe price IDs to VoiceDrop plan names
function priceIdToPlan(priceId: string): PlanId {
  if (priceId === process.env.STRIPE_PRICE_ID_STARTER) return 'starter';
  if (priceId === process.env.STRIPE_PRICE_ID_PRO) return 'pro';
  return 'free';
}

async function setUserPlan(userId: string, plan: PlanId) {
  const client = await clerkClient();
  await client.users.updateUser(userId, { publicMetadata: { plan } });
}

// Stripe sends the raw body — we must NOT parse it with Next.js body parsing
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? session.metadata?.userId;
        const planId = session.metadata?.planId as PlanId | undefined;
        if (userId && planId) {
          await setUserPlan(userId, planId);
          console.log(`[Stripe Webhook] Promoted user ${userId} to ${planId}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        const priceId = sub.items.data[0]?.price.id;
        if (userId && priceId) {
          const plan = priceIdToPlan(priceId);
          await setUserPlan(userId, plan);
          console.log(`[Stripe Webhook] Updated user ${userId} to ${plan}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) {
          await setUserPlan(userId, 'free');
          console.log(`[Stripe Webhook] Downgraded user ${userId} to free`);
        }
        break;
      }

      default:
        // Ignore unhandled event types
        break;
    }
  } catch (err) {
    console.error('[Stripe Webhook] Handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
