# Bookings module

Meetings, meeting rooms and the pool table. Backend: `Backend/src/bookings/`. Frontend: `Frontend/vite-ts/src/sections/booking/`, plus `actions/bookings.ts`. Dashboard card: `sections/overview/dashboard-upcoming-meetings.tsx`.

## Business rules (agreed)

| Rule | Setting |
|---|---|
| Who organises meetings | CEO, HR, Admin, Partners (`PARTNER`), Managers (`LINE_MANAGER`), Team Leads (`MANAGER`). Team Members only attend. |
| Who books meeting rooms / pool table | Everyone. |
| Approval | None. A booking is **Confirmed** as soon as it's saved. Statuses: `CONFIRMED`, `CANCELLED`. "Completed" and "In progress" are shown from the time, not stored. |
| Participant clash | **Blocked.** A meeting can't be saved if the organiser or any invitee is already busy at that time. The error names who is busy. "Busy" means: organiser of a meeting, "Others" block or **pool-table slot**, or an invitee who hasn't declined. So you also can't book the pool table during a meeting you're in, and vice versa. Room-only bookings don't make anyone busy. |
| Invite replies | Each invitee **accepts or declines** on the meeting page (starts as "Awaiting reply"). The organiser is notified either way, with the optional decline reason. A declined invitee's time is free; accepting again re-checks they're still free. The meeting goes ahead regardless. Changing a meeting's **date or time** resets everyone to "Awaiting reply"; a title, room or other change doesn't. |
| Holidays / off days | HR / Admin announce them under **Bookings → Rooms & off days**; they show on everyone's calendar as a red "Holiday" all-day item. Pakistan's fixed-date public holidays (5 Feb, 23 Mar, 1 May, 28 May, 14 Aug, 9 Nov, 25 Dec) show automatically; Eid etc. must be announced. **Bookings are allowed on weekends and holidays** (client decision, Nov 2026) and announcing one doesn't cancel anything. Leave treats an announced off day like a weekend day (fixed public holidays only count if announced). |
| Room / table clash | Blocked. This includes a meeting that uses the room. Back-to-back bookings (one ends at 11:00, the next starts at 11:00) are allowed. |
| Who can change / cancel | The organiser, or whoever created the booking. HR / Admin can also change or cancel anyone's **room / pool-table** booking (the owner is notified). Nobody else can change a meeting. |
| Meeting privacy | Only the organiser and invitees can open a meeting. On the calendar, other people see a meeting that uses a room as a grey "Private meeting" block (time and room only). Meetings without a room don't appear for them at all. |
| Time zone | Pakistan time (PKT, UTC+5) everywhere, like interviews. The database stores exact instants (`timestamptz`). |
| Limits | Duration 15 min to 8 h. A new or moved start time must be in the future. Up to 50 invitees. |

## Concurrency

Every save runs in a transaction that takes `pg_advisory_xact_lock` on the room / table and on each person involved, always in the same order. It then checks for overlaps and inserts. Two people saving the same slot at the same moment queue: one succeeds and the other gets a clear 409. This was tested with 7 simultaneous requests: exactly 1 was confirmed. No Postgres extension is needed.

## Notifications

All notifications go through the existing `NotifyService`: one bell notification plus one email per person. Meeting emails carry a calendar invite (`.ics`, the same event UID with a rising SEQUENCE, so calendars update the same entry).

| Event | Who is told |
|---|---|
| Meeting created | Each invitee ("Meeting invite") |
| Time / room / location changed | Remaining invitees, plus the organiser if someone else edited it ("Meeting updated", with old and new time) |
| Invitee added / removed on edit | Added: invite. Removed: "Removed from meeting" (calendar CANCEL) |
| Meeting cancelled | All invitees, plus the organiser if someone else cancelled (calendar CANCEL) |
| HR / Admin changed or cancelled someone's room / table booking | The owner |

A title-only edit sends nothing. Cancelling twice is rejected, so there are no duplicate notifications. The bell and dashboards poll every 60 s; there is no WebSocket in this app.

## API (`/api/v1`)

| Method | Path | Who |
|---|---|---|
| GET | `/bookings?from&to&type&status&resourceId&userId&scope=mine\|all&when=upcoming\|past&search&page&limit` | All (results filtered by visibility) |
| GET | `/bookings/upcoming-meetings?limit` | All (own meetings) |
| GET | `/bookings/availability?date&resourceId&userIds=1,2&excludeBookingId` | All (busy times only) |
| GET | `/bookings/people` | CEO, HR, Admin, Partners, Managers, Team Leads (participant picker: name, title, department) |
| GET | `/bookings/:id` | Visible bookings (meetings: organiser / invitees) |
| POST | `/bookings` | All (meetings: organiser roles) |
| PATCH | `/bookings/:id` | Organiser / creator (+ HR / Admin for rooms & tables) |
| POST | `/bookings/:id/cancel` `{ reason? }` | Same as PATCH |
| POST | `/bookings/:id/respond` `{ response: ACCEPTED\|DECLINED, reason? }` | Invitees of that meeting |
| GET | `/booking-resources?type&includeInactive` | All |
| POST / PATCH | `/booking-resources[/:id]` | HR, Admin |
| GET | `/off-days?from&to` | All |
| POST | `/off-days` `{ date, reason }` → `{ offDay }` | HR, Admin |
| DELETE | `/off-days/:id` | HR, Admin |

## Database

Migration `1761000000000-Bookings` creates:
- `booking_resources`: unique name per type, case-insensitive.
- `bookings`: `CHECK end_at > start_at`, and a resource is required unless the booking is a meeting.
- `booking_participants`: unique `(booking_id, user_id)`.

It also seeds **Meeting Room 1**, **Meeting Room 2** and **Pool Table**. HR / Admin can rename or add more under Bookings → Rooms & tables. The migration adds tables only and changes no existing data. `down` drops the three tables.

Migration `1762200000000-OffDaysMeetingReplies` (Nov 2026) adds `off_days` (one row per date) and `booking_participants.response` / `responded_at` / `decline_reason`. Invitees of meetings that already existed are marked **accepted**; new invites start as `PENDING`. It also raises Annual Leave to 20 days a year, only if it's still 14.

## Deploying

1. Deploy the backend code, then run `npm run migration:run` in `Backend/` (applies `Bookings1761000000000`).
2. Restart the backend.
3. Build and upload the frontend (`npm run build` in `Frontend/vite-ts/`).
4. Optional: rename the seeded rooms / table under **Bookings → Rooms & tables** to match the office.

No new environment variables are needed. Emails use the existing SMTP settings.
