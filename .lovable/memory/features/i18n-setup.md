---
name: i18n setup
description: react-i18next infrastructure, EN/NL/DE/ES/FR locales, auto-detect via navigator with localStorage override, manual switcher in Settings
type: feature
---
i18n is configured via `src/i18n/index.ts` using `react-i18next` + `i18next-browser-languagedetector`. Supported: en (fallback), nl, de, es, fr. Detection order: localStorage (`i18nextLng`) → navigator. `load: "languageOnly"` so `en-US` maps to `en`. Translation files live in `src/i18n/locales/{lang}.json`. Initialized in `src/main.tsx`. Pages translated in Phase 1+2: Index, BottomNav, Agenda, News, Events, Contact, PwaGate, VipLogin, VipVerify, Settings. Manual language switcher lives in Settings (always visible, also for non-VIP users) using the SUPPORTED_LANGUAGES export. Dynamic content (WordPress News/Agenda, voucher/ticket DB strings) intentionally left in original language. Admin dashboard, VIP interior pages and Edge Function emails are NOT translated yet.
