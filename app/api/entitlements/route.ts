import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getPlanEntitlements, resolvePlan } from '@/lib/plans';

export async function GET() {
  const { userId, has } = await auth();

  if (!userId) {
    const entitlements = getPlanEntitlements('free');
    return NextResponse.json({
      plan: 'free',
      entitlements,
      tokenBudget: entitlements.monthlyTokenBudget,
      tokensUsed: 0,
      tokensRemaining: entitlements.monthlyTokenBudget,
    });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const couponPlan = user.publicMetadata?.couponPlan as string | undefined;
  const plan = resolvePlan(has, couponPlan);
  const entitlements = getPlanEntitlements(plan);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const storedMonth = user.privateMetadata?.usageMonth as string | undefined;
  const tokensUsed =
    storedMonth === currentMonth
      ? ((user.privateMetadata?.tokensUsed as number | undefined) ?? 0)
      : 0;

  return NextResponse.json({
    plan,
    entitlements,
    tokenBudget: entitlements.monthlyTokenBudget,
    tokensUsed,
    tokensRemaining: Math.max(entitlements.monthlyTokenBudget - tokensUsed, 0),
  });
}
