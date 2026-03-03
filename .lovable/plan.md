

## Fix & Build All Remaining Phases

### Issue: "Invalid PIN" / "Failed to fetch"
The edge function works correctly when called directly (tested both PINs successfully). The client-side call fails because the CORS `Access-Control-Allow-Headers` is missing headers the Supabase JS client sends (`x-supabase-client-platform`, etc.). Fix: update the CORS headers in the edge function.

### Implementation Plan

**1. Fix CORS in `validate-pin` edge function**
- Add missing headers to `Access-Control-Allow-Headers`: `x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version`

**2. Database: Add INSERT/UPDATE policies for admin-managed tables**
- `events`: allow INSERT, UPDATE, DELETE (all public since no Supabase Auth)
- `items`: allow INSERT, UPDATE
- `timer_config`: allow INSERT, UPDATE
- `app_config`: allow INSERT, UPDATE
- `deletion_log`: allow INSERT

**3. Phase 4 — Event Management (Admin)**
- New component `EventManager.tsx`: create/edit events with name, date, start/end time
- Toggle active event (only one active at a time)
- Linked from Dashboard "Events" nav card

**4. Phase 5 — Settings Page (Admin, hidden from Staff)**
- `SettingsPage.tsx` with three tabs:
  - **Items**: Add/edit items (name, 1-session price, 2-session price, default duration)
  - **Timer Config**: Default duration, Reminder 1 & 2, Escalation time (per event)
  - **Payment Settings**: Enable/disable Cash/UPI, configure UPI ID

**5. Phase 6 — Order Creation (Staff + Admin)**
- `AddSale.tsx`: Step-by-step form
  - Customer name, number (required), table/pot number (optional)
  - Item selection (large buttons)
  - Session type (1 or 2) with auto-calculated price
  - Payment mode (Cash/UPI)
  - CONFIRM PAYMENT button — creates locked order

**6. Phase 7 & 8 — Active Orders + Session Timer System**
- `ActiveOrders.tsx`: Live order cards with countdown timers
- Color-coded: green (>10min), orange (<10min), red flashing (expired)
- MARK READY → starts session 1 timer
- Full-screen alert + vibration on session end → COLLECT POT button
- For 2-session: flow to session 2 automatically
- Realtime subscription for cross-device sync
- Custom `useTimer` hook for countdown logic

**7. Phase 9 — Reports Dashboard**
- `Reports.tsx`: Summary cards + breakdowns
  - Total sales, cash vs UPI, order counts, 1-session vs 2-session
  - Item-wise & staff-wise breakdown
  - On-time vs late collection %, average delay
  - Staff: read-only; Admin: full access

**8. Phase 10 — Excel Export & Data Protection (Admin)**
- Install `xlsx` package
- Export all order fields to Excel
- Event deletion flow: generate backup → download confirm → final confirm → log deletion
- Deletion logged to `deletion_log` table

**9. Dashboard Navigation**
- Wire all NavCards to show corresponding views (using state-based navigation, no router needed)
- Add back-button navigation pattern

### Technical Details
- All views managed via state in `Dashboard.tsx` (active view pattern)
- Supabase realtime on `orders` table for live updates
- Timer logic uses `setInterval` with 1-second ticks, reading from `timer_config`
- Vibration API (`navigator.vibrate`) for alerts
- All database writes go through Supabase client with public RLS policies (since no Supabase Auth is used)

