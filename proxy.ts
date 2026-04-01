import { clerkMiddleware } from '@clerk/nextjs/server'

function getAuthorizedParties(): string[] {
  const explicit = process.env.CLERK_AUTHORIZED_PARTIES ?? ''
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return [...explicit.split(','), appUrl]
    .map((value) => value.trim())
    .filter(Boolean)
}

const authorizedParties = getAuthorizedParties()

export default clerkMiddleware(
  authorizedParties.length > 0
    ? { authorizedParties }
    : {}
)

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
