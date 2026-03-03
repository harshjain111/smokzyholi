## Hookah Stall Sales Manager – PWA Implementation Plan

### Overview

A mobile-first PWA with bright minimal, corporate theme for managing hookah sales at events. Cloud-backed with Supabase, PIN-based access for speed, optimized for tablet use by 3-5 staff.

---

### Phase 1: Foundation & Theme

- Set up PWA (vite-plugin-pwa, manifest, icons, offline caching)
- Black & gold design system with large touch-friendly buttons
- Tablet-portrait-optimized layout

### Phase 2: Backend (Supabase Cloud)

- **Tables**: `events`, `items`, `orders`, `timer_config`, `app_config` (PINs, UPI settings, payment modes)
- **RLS policies**: Admin PIN validated server-side; staff limited to order creation & viewing
- Orders are immutable after confirmation (no update/delete policies for staff)

### Phase 3: PIN-Based Login

- Simple PIN entry screen (large numpad, gold buttons)
- Admin PIN → full access; Staff PIN → limited access
- PINs stored securely in `app_config` table, validated via edge function
- Session stored in memory (no localStorage for security)

### Phase 4: Admin – Event Management

- Create/edit events (name, date, start/end time)
- Only one active event at a time
- All orders auto-linked to active event

### Phase 5: Admin – Settings Page (hidden from staff)

- **Item Management**: Add/edit items (name, 1-session price, 2-session price, default duration)
- **Timer Config**: Default duration, Reminder 1, Reminder 2, Escalation time (per event)
- **Payment Settings**: Enable/disable Cash & UPI, configure UPI ID

### Phase 6: Order Creation Flow (Staff)

- "ADD SALE" → form with customer name, number, table #, pot #
- Large item selection buttons → session type (1 or 2) → auto-calculated price
- Payment mode selection (Cash/UPI) → **CONFIRM PAYMENT** button
- Order locked after confirmation – no edits possible

### Phase 7: Session Timer System (Core Feature)

- Countdown timer per order with color coding (green → orange → red flashing)
- **MARK READY** → starts session 1 timer
- Full-screen alert + vibration when session ends → **COLLECT POT** button
- Records collection time & delay minutes
- For 2-session orders: automatic flow to session 2 with same timer logic
- Real-time auto-refresh across devices via Supabase realtime subscriptions

### Phase 8: Active Orders Dashboard

- Live order cards showing: customer, item, session info, large countdown timer
- Color-coded status (green/orange/red flashing)
- Bold, highly visible – no unnecessary scrolling

### Phase 9: Reports Dashboard

- Total sales, cash vs UPI breakdown, order counts, session type counts
- Item-wise & staff-wise breakdown
- On-time vs late collection %, average delay
- Staff: read-only view; Admin: full access

### Phase 10: Excel Export & Data Protection

- Excel export with all order fields (using xlsx library)
- Admin event deletion requires: generate backup → download confirmation → final confirm
- Deletion logging