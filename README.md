# Uber Clone – Frontend

Production-ready Uber-style frontend built with **Next.js 14 (App Router)**, **React**, **Tailwind CSS**, **Clerk**, **Google Maps**, **Zustand**, and **Axios**.

## Stack

- **Next.js 14** (App Router)
- **React 18**
- **Tailwind CSS**
- **Clerk** – Authentication
- **Google Maps JavaScript API** – Maps & Places autocomplete
- **Zustand** – State management
- **Axios** – API client
- **Framer Motion** – Animations (modals, SOS)
- **react-hot-toast** – Toasts

## Folder structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (Clerk, Toaster)
│   ├── globals.css
│   ├── page.tsx                # Landing (hero, CTA, sign-in/up)
│   ├── sign-in/[[...sign-in]]/page.tsx
│   ├── sign-up/[[...sign-up]]/page.tsx
│   └── (dashboard)/            # Route group – shared Navbar
│       ├── layout.tsx          # Navbar for rider & driver
│       ├── rider/
│       │   ├── dashboard/      # Map + booking panel
│       │   ├── ride/[id]/     # Ride tracking
│       │   ├── history/
│       │   ├── profile/
│       │   ├── payment/
│       │   └── review/
│       └── driver/
│           ├── layout.tsx     # Sidebar
│           ├── dashboard/    # Incoming requests, accept/reject
│           ├── ride/[id]/    # Active ride, status updates
│           ├── history/
│           ├── profile/
│           └── earnings/
├── components/
│   ├── MapView.tsx
│   ├── LocationSearchInput.tsx
│   ├── RideOptionCard.tsx
│   ├── RideRequestCard.tsx
│   ├── RideStatusStepper.tsx
│   ├── StatusBadge.tsx
│   ├── PaymentSummary.tsx
│   ├── RatingStars.tsx
│   ├── RatingModal.tsx
│   ├── SOSFloatingButton.tsx
│   ├── Navbar.tsx
│   ├── Sidebar.tsx
│   └── LoadingSkeleton.tsx
├── store/
│   └── useAppStore.ts         # Zustand: user, ride, fare, pickup/drop
├── lib/
│   └── api.ts                 # Axios instance + rideApi + mocks
├── types/
│   ├── index.ts
│   └── google-maps.d.ts
└── middleware.ts              # Clerk protect non-public routes
```

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables**

   Copy `.env.example` to `.env.local` and set:

   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` – from [Clerk](https://clerk.com)
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` – from [Google Cloud Console](https://console.cloud.google.com) (Maps JavaScript API + Places API)
   - Optional: `NEXT_PUBLIC_API_BASE_URL` – your backend base URL

3. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Features

- **Auth:** Clerk sign-in/sign-up; middleware protects `/rider/*` and `/driver/*`.
- **Rider:** Full-screen map, pickup/drop autocomplete, fare estimate, ride type (Bike/Mini/Sedan), request ride → tracking screen with status stepper, cancel, SOS.
- **Driver:** Dashboard with ride request cards (accept/reject), active ride screen with status updates (arriving → on trip → completed).
- **Shared:** Ride history (list + details modal, download receipt), profile (Clerk), payment UI (card list + fare breakdown), rating modal (stars + feedback).
- **State:** Zustand store for `currentUser`, `currentRide`, `rideStatus`, `driverLocation`, `fareEstimate`, `pickup`, `drop`, `selectedRideType`.
- **API:** Axios in `src/lib/api.ts`; `rideApi` for estimate, request, get, cancel, history, accept, reject, status, rating. Use `NEXT_PUBLIC_API_BASE_URL` and attach Clerk token in calls when you add a backend.

## UI/UX

- Tailwind, mobile-first, bottom-sheet style booking panel.
- Loading skeletons, toasts, Framer Motion for modals and SOS.
- Reusable components: MapView, LocationSearchInput, RideOptionCard, RideRequestCard, RideStatusStepper, PaymentSummary, RatingStars, SOSFloatingButton, Navbar, Sidebar, StatusBadge.

## Notes

- Without a backend, ride flows use mock data and in-memory state so you can click through all screens.
- For real maps/autocomplete, set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; otherwise a placeholder is shown.
- Role (rider vs driver) is inferred from the path; you can later add a role claim in Clerk and enforce it in middleware or API.
