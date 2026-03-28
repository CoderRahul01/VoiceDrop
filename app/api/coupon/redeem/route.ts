import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import type { PlanId } from '@/lib/plans';

/**
 * Parse COUPON_CODES env var into a lookup map.
 * Format: "CODE1:plan,CODE2:plan"   e.g. "LAUNCH50:pro,BETA:starter,VIP:enterprise"
 */
function parseCouponMap(): Record<string, PlanId> {
  const raw = process.env.COUPON_CODES ?? '';
  return Object.fromEntries(
    raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [code, plan] = entry.split(':');
        return [code.trim().toUpperCase(), plan.trim() as PlanId];
      })
  );
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to redeem a coupon.' }, { status: 401 });
  }

  const { code } = (await req.json()) as { code: string };
  if (!code?.trim()) {
    return NextResponse.json({ error: 'Please enter a coupon code.' }, { status: 400 });
  }

  const coupons = parseCouponMap();
  const normalised = code.trim().toUpperCase();
  const grantedPlan = coupons[normalised];

  if (!grantedPlan) {
    return NextResponse.json({ error: 'Invalid or expired coupon code.' }, { status: 404 });
  }

  // Write the granted plan into publicMetadata so the app can read it
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  await client.users.updateUser(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      couponPlan: grantedPlan,
      couponCode: normalised,
      couponRedeemedAt: new Date().toISOString(),
    },
  });

  return NextResponse.json({ success: true, plan: grantedPlan, code: normalised });
}
