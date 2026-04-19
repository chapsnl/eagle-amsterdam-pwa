# Memory: index.md
Updated: today

# Project Memory

## Core
Design: Black bg (#000000), white text, brand red (#b43227) highlights. Max-w-lg (512px) layout.
Font: Manrope. 12px rounded corners standard for all components.
Stack: Supabase Edge Functions (CORS required), MXRoute SMTP, EventON API.
Arch: Mobile-first PWA. Admin dashboard (admin.eagleamsterdam.com) hides nav.
Security: RLS enabled. Edge Functions manually verify JWTs.
VIP: Tiers (Regular, Party Boy, Cruiser, Slut). 6-token grid. 1 unredeemed voucher per type.
i18n: react-i18next, EN fallback + NL/DE/ES/FR, auto-detect navigator, manual switcher in Settings. Public pages + VIP login translated; admin/dynamic content NOT.

## Memories
- [i18n Setup](mem://features/i18n-setup) — react-i18next config, locales, manual switcher in Settings
- [Backend Services](mem://tech-stack/backend-services) — Supabase Edge Functions, CORS, RLS bypass
- [Email Service](mem://tech-stack/email-service) — nodemailer, MXRoute SMTP, port specific TLS
- [Loyalty Scanner](mem://tech-stack/loyalty-scanner) — Nuclear Kill-Switch for hardware camera termination
- [EventON API](mem://integrations/eventon) — Live agenda sync, JSON-LD schema parsing
- [Sender.net](mem://integrations/mailing-list) — Email subscription on Contact page
- [System Hardening](mem://security/system-hardening) — RLS, manual JWT verification in Edge Functions
- [OTP Verification](mem://auth/otp-verification-logic) — 4-digit OTP, 10m expiry, localStorage vip_session
- [VIP Onboarding](mem://auth/vip-onboarding) — Name entry required, push prompt, 1 token + free coat check
- [Email Persistence](mem://auth/email-persistence) — Remember last entered email in localStorage
- [Status Levels](mem://vip/status-levels) — Lifetime-balance tiers (Regular, Party Boy, Cruiser, Slut)
- [Loyalty System Logic](mem://vip/loyalty/system-logic) — 6-token grid, 160h cooldown, 6th token = FREE ENTRY
- [Loyalty QR Behavior](mem://vip/loyalty/qr-behavior) — New admin QR code immediately resets all scan cooldowns
- [Member Pass](mem://vip/member-pass) — Horizontal card, color-coded by status, 8-digit ID
- [Member Deals](mem://vip/member-deals) — Red credit-card-style vouchers, blinking icons
- [Voucher Deduplication](mem://vip/voucher-system/deduplication-rule) — Only one unredeemed voucher per type allowed
- [Voucher Cleanup](mem://vip/voucher-system/redemption-cleanup) — DB trigger deletes vouchers upon redemption
- [VIP Info Page](mem://vip/info-page) — Reward explanations, mandatory disclaimers
- [Backroom Board](mem://vip/backroom-community-board) — 14-day auto-purge community board, 500-char limit
- [Dashboard UI](mem://vip/dashboard-ui) — Condensed grid, py-5 buttons, gap-2, Backroom DoorOpen icon
- [Auth & Sessions](mem://admin/dashboard/auth-and-sessions) — 30m brute-force lock, 4h timeout
- [Navigation](mem://admin/dashboard/navigation-behavior) — Bottom nav hidden, full screen
- [Layout & Sections](mem://admin/dashboard/layout-and-sections) — Scanned Member card placement, All Members hidden
- [Scanning UI](mem://admin/dashboard/member-scanning-ui) — Popup dialog, auto-close on find, manual on error
- [Member Rows](mem://admin/dashboard/member-rows-and-activity) — Recent Activity prioritizes online (3m threshold)
- [Voucher Icons](mem://admin/dashboard/voucher-button-icons) — Lucide Shirt/Ticket/Beer icons for preset vouchers
- [Workflow Automation](mem://admin/dashboard/workflow-automation) — Optimistic UI updates for voucher assignment
- [Loyalty QR Section](mem://admin/dashboard/loyalty-qr-section) — Collapsible section to generate new QR codes
- [User Invitation](mem://admin/dashboard/user-invitation) — Styled HTML email invite with installation videos
- [Ticket Management](mem://admin/dashboard/ticket-management) — Real-time control over Events page listings
- [Backroom Moderation](mem://admin/dashboard/backroom-moderation) — Manual deletion of community posts
- [Agenda Logic](mem://features/agenda-logic) — Europe/Amsterdam DST handling, UTC offset stripping
- [Event Tickets](mem://features/event-tickets) — Dynamic ticket list, external links, My Tickets section
- [News Feed](mem://features/news-feed) — 15 recent posts, 150-char previews, expandable cards
- [Location](mem://project/location) — Warmoesstraat 96, MapPin icon, Google Maps routing
- [Home Page](mem://features/home-page) — 100dvh, w-64 logo, full-bleed hero, top-right settings
- [Contact Page](mem://features/contact-page) — Neon-border card, Sender.net form, hours/location
- [Navigation Strategy](mem://features/navigation-strategy) — 56px bottom bar, w-8 h-8 icons, brand red active state
- [User Sessions](mem://features/user-session-management) — 60s activity heartbeat, local storage clear on logout
- [Loading States](mem://features/loading-states) — First Visit hourglass animation
- [Offline Resilience](mem://features/offline-resilience) — Global ErrorBoundary, connection lost notice
- [Design System](mem://ui/design-system) — Black bg, 12px radii, 2px borders, red #b43227 highlights
- [Layout Standard](mem://ui/layout-standard) — Max-w-lg (512px) centered vertical column
- [Typography](mem://style/typography) — Manrope, specific letter-spacing/weights for titles/buttons/body
- [Branding](mem://style/branding) — White enlarged logo, brand red, custom favicon
- [Dialogs](mem://ui/dialogs) — Red WarningDialog, 3s auto-dismiss, dimmed bg
- [Agenda UI](mem://style/agenda-ui) — 16:9 aspect ratio, object-contain, black background
- [Content Rendering](mem://style/content-rendering) — DOMPurify, link rewriting, custom CSS reset
- [Email Design System](mem://style/email-design-system) — #f4f4f5 bg, 600px white card, #1a1a1a header
- [Lockdown Gate](mem://pwa/lockdown-gate) — Requires mobile/tablet, allows modern iPads (MacIntel)
- [PWA Settings](mem://pwa/settings) — Member data, Push toggle, removed App Lock/PIN
- [OneSignal Registration](mem://integrations/onesignal/registration-and-delivery) — Opt-in flow, external_id syncing
- [OneSignal Delivery](mem://integrations/onesignal/push-notification-delivery) — REST API push triggers, background delivery
- [OneSignal SW](mem://integrations/onesignal/sw-compatibility) — Service worker ignores cdn.onesignal.com
- [VIP Push CTA](mem://vip/push-notification-cta) — Conditional prompts to enable push notifications
- [Dev Mode Caching](mem://performance/dev-mode-caching) — 24h prod caching, Stale-While-Revalidate
- [VIP Login Optimizations](mem://performance/vip-login-optimizations) — Concurrent DB/SMTP execution, caching skipped
