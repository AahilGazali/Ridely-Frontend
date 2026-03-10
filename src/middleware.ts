import { authMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

const publicRoutes = [
  "/",
  "/sign-in",
  "/sign-in(.*)",
  "/sign-up",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
];

const clerkMiddleware = authMiddleware({ publicRoutes });

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  const path = request.nextUrl.pathname;
  // Always allow sign-in and sign-up through without running Clerk (avoids redirect/blank)
  if (path === "/sign-in" || path.startsWith("/sign-in/") || path === "/sign-up" || path.startsWith("/sign-up/")) {
    return NextResponse.next();
  }
  const hasClerkKeys =
    process.env.CLERK_SECRET_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!hasClerkKeys) {
    return NextResponse.next();
  }
  return clerkMiddleware(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
