import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { PLANS, type PlanId } from '@/lib/plans';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { planId } = (await req.json()) as { planId: PlanId };
  const plan = PLANS.find((p) => p.id === planId);

  if (!plan?.stripePriceId) {
    return NextResponse.json({ error: 'Invalid plan or no price configured' }, { status: 400 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = user.emailAddresses[0]?.emailAddress;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    client_reference_id: userId,
    customer_email: email,
    success_url: `${appUrl}/pricing?success=1`,
    cancel_url: `${appUrl}/pricing?cancelled=1`,
    metadata: { userId, planId },
    subscription_data: {
      metadata: { userId, planId },
    },
  });

  return NextResponse.json({ url: session.url });
}
