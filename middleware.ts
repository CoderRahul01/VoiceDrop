import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jte?|ttf|woff2?|ico|gif|svg|png|jpg|jpeg|webp)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
