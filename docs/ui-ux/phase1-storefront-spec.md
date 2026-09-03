# Sham Stores — Storefront Redesign Spec (Phase 1)

## Branch & Git Rules
- Work branch: `ui-ux/storefront-redesign` (created from `prismaDB` @ 14465e7). NEVER commit to `dev`/`prismaDB`.
- The working tree contains the OWNER's uncommitted changes: `backend/prisma/schema.prisma` and `frontend/dist/index.html`. NEVER stage or commit these files. Never use `git add -A` / `git add .` — stage explicit paths only.
- Commit per logical step (conventional commits, e.g. `feat(storefront): ...`), push to `origin ui-ux/storefront-redesign` when done.
- Do NOT run a dev server; verify with `npm run build` AND `npx tsc --noEmit` (vite build does not typecheck). Both must pass.

## Stack
React 18 + TypeScript + Vite 5 + Tailwind 3 + react-router-dom 6 + @tanstack/react-query 5 + framer-motion + react-hot-toast + react-icons/io5. Path alias `@/` = `frontend/src/`. UI language: Arabic (RTL). Default font: Cairo.

## Product Decisions (owner-approved)
1. Guest checkout: visitors order WITHOUT login (backend `POST /api/orders` is already public — `backend/src/routes/orderRoutes.ts:29`). Login stays optional (for "طلباتي").
2. Currency: default display = Syrian Pound (SYP, symbol `ل.س`). Per-business USD display toggle comes in a LATER phase (schema field `usdExchangeRate` + dashboard setting). For now: read `business.currency` (default `SYP`) and format via one shared util. Do NOT change prisma schema in this phase.
3. Old code on other branches stays untouched; on THIS branch we refactor the public pages. Shared components used by dashboard pages must not break — prefer creating NEW components over editing shared ones; grep usages before touching any shared file.

## Key Current Files (already audited)
- `frontend/src/App.tsx` — eagerly imports ~70 pages (admin/owner/staff/driver). QR visitors download everything. Needs route-level code splitting.
- `frontend/src/pages/PublicMenu.tsx` — thin wrapper: picks `RestaurantPublicMenu` or `StorePublicMenu` by `businessType`. Keep its API.
- `frontend/src/components/PublicRouter.tsx` — subdomain routing, fetches business basics, passes props to PublicMenu. Read it first.
- `frontend/src/pages/Restaurant/RestaurantPublicMenu.tsx` (911 lines) — current restaurant storefront.
- `frontend/src/pages/Store/StorePublicMenu.tsx` (939 lines) — current store storefront (do NOT rebuild in this phase).
- `frontend/src/components/CartModal.tsx` — white/blue/green hardcoded, centered modal, forces "ر.س"; calls `/restaurants/profile` for delivery settings. Used by BOTH public pages (grep for other usages before replacing; keep the old file if anything else imports it).
- `frontend/src/components/MenuItemCard.tsx` — check usages; likely also used by dashboard menu page. Do not break.
- `frontend/src/context/ThemeContext.tsx` — existing theme context with `setThemeColors`. Read and reuse if practical, or supersede with CSS-variable tokens (below).
- API: `GET /api/public/:identifier` returns business incl. colors (`primaryColor, secondaryColor, backgroundColor, cardColor, surfaceColor, textColor, mutedColor, accentColor, fontFamily`), `categories[].menuItems[]` (restaurant) or `products[]` (store), `marketing`, `linkedBranches`, `currency`.

## Known Defects To Fix (audit findings)
1. Login forced before order (RestaurantPublicMenu `submitOrder` ~L319) — remove; submit as guest with name+phone (for dine-in with `tableId`, both optional).
2. Blocking full-screen Loader waits for auth+plan+favorites — replace with skeleton; secondary queries must not block first paint.
3. Mobile header block has `display:'none'` (dead code); up to 7 buttons crammed in sticky bar; categories not sticky; category filter instead of scroll-spy.
4. Marketing banners/offers/ads render ABOVE menu items — move below the first category section or make a slim strip.
5. Card stagger `delay: index*0.05` — remove or cap; no lazy images; cover is CSS background (use real `<img>` with fetchpriority).
6. Hardcoded colors everywhere (purple/blue/pink/red buttons, `rgba(200,226,53,...)` borders) ignoring merchant palette.
7. Currency hardcoded (`ر.س`/`ل.س` mix) — centralize.
8. console.log calls in production paths — remove in touched files.
9. `getFilteredItems` O(n²) spread-in-loop — use flatMap + useMemo.
10. Floating cart button: no total price, small target, no safe-area inset.

## Phase 1 Deliverables (WP1 foundation + WP2 restaurant + WP4 cart)

### A. Design tokens
- New `frontend/src/utils/storefrontTheme.ts`: `applyStorefrontTheme(business)` sets CSS vars on a root element (or `:root`): `--sf-primary, --sf-secondary, --sf-bg, --sf-card, --sf-surface, --sf-text, --sf-muted, --sf-accent, --sf-border` (border derived from accent w/ alpha), `--sf-font`. Provide `getSfVar(name)` helper. All new components consume vars via inline style `var(--sf-*)` or Tailwind arbitrary values `bg-[var(--sf-card)]`. Fallback palette = current dark-green defaults.
- New `frontend/src/utils/currency.ts`: `CURRENCY_SYMBOLS: Record<string,string>` (`SYP:'ل.س'`, `SAR:'ر.س'`, `USD:'$'`, more), `formatPrice(amount:number, currency='SYP')` → `"1,250 ل.س"` (ar-SY grouping), `getCurrencySymbol()`.

### B. New shared components — `frontend/src/components/storefront/`
1. `StorefrontLayout.tsx` — cover (`<img>` w/ `fetchpriority="high"`, gradient overlay), business header card (logo, name, branch badge/selector, description, call/whatsapp round buttons — all themed), slots for marketing strip, sticky nav, children, footer. Compact sticky mini-header (logo+name+cart) that fades in after scrolling past the header card.
2. `StickyCategoryNav.tsx` — horizontal scrollable pills, sticky under mini-header, active state themed, scroll-spy via IntersectionObserver (section ids `cat-<id>`), click smooth-scrolls to section (restaurant mode). Hide scrollbar.
3. `BottomCartBar.tsx` — fixed bottom, full-width within max-w container, safe-area (`env(safe-area-inset-bottom)`), shows item count + total (formatPrice) + CTA `عرض السلة`, themed gradient, tap target ≥48px.
4. `QuantityStepper.tsx` — minus/plus, ≥40px targets, themed.
5. `MenuItemListCard.tsx` — mobile-first horizontal card (image start side, 96–112px square, lazy img, name/desc 2-line clamp, prep time/orders badges, price with currency util, discount strikethrough, add button OR stepper when already in cart; "غير متوفر" overlay). `sizes`/`addons` present → add button opens `ItemOptionsSheet` instead of instant add.
6. `ItemOptionsSheet.tsx` — bottom sheet to pick size (single-select) + addons (multi-select) + quantity + notes, live price total, "إضافة إلى السلة" CTA.
7. `CartSheet.tsx` — bottom sheet (drag handle, backdrop, swipe-down/close btn), themed end-to-end: items with steppers + remove + per-item notes display, subtotal/discount/delivery/total via formatPrice, coupon field (optional slot — restaurant may pass none), customer name+phone inputs (guest-allowed), table badge when `tableId`, delivery location section only when props demand it, submit button states. Replaces CartModal for the restaurant page.
8. `StorefrontSkeleton.tsx` — cover block + header card + 6 list-card skeletons, shimmer, themed neutrals.
9. `BottomSheet.tsx` — generic accessible bottom-sheet primitive (portal, backdrop, escape/close, max-h 92dvh, body scroll-lock) used by 6/7.

### C. Rebuild `frontend/src/pages/Restaurant/RestaurantPublicMenu.tsx`
- Use StorefrontLayout + StickyCategoryNav (scroll-spy sections, ALL items grouped by category, "الكل" scrolls top) + MenuItemListCard + BottomCartBar + CartSheet + StorefrontSkeleton.
- Guest checkout: `submitOrder` without auth (name/phone optional for dine-in w/ table; required for takeaway), keep optional login button + "طلباتي" only when authenticated.
- Search expands in sticky bar (icon → input overlay), sort bottom sheet (popular/price/newest). Keep favorites toggle on cards (localStorage hook exists).
- Marketing sections/offers/ads: render AFTER the first two category sections (or below menu), slim.
- Keep branch selector, Helmet SEO, WhatsApp order notification (`openWhatsApp`), PublicFooter.
- Images: `loading="lazy" decoding="async"` + fixed aspect (prevent CLS). No per-index stagger delay (use a single fade-in or cap delay at 0.2s).
- All colors via `var(--sf-*)`. No hardcoded hex except semantic red (discount/unavailable).
- Currency: `restaurant.currency || 'SYP'` passed to formatPrice everywhere (cards, bar, sheet).

### D. Code splitting — `frontend/src/App.tsx`
- `React.lazy` + `Suspense` (skeleton/spinner fallback) for ALL owner/staff/admin/driver/legal pages and any page not needed for first paint of public routes. Keep `HomePage`, `PublicRouter` path critical. Verify lazy boundaries don't break `ProtectedRoute`/`Layout` wrappers.
- Remove `console.log` debug calls in App.tsx.

## Non-goals (Phase 1)
- StorePublicMenu rebuild (Phase 2 — will reuse storefront components).
- Currency USD toggle / exchange-rate dashboard setting / prisma changes (Phase 3).
- PublicItem/PublicProduct detail pages (Phase 4).
- Backend changes of any kind.

## Definition of Done
- `npm run build` and `npx tsc --noEmit` pass in `frontend/`.
- Restaurant storefront fully themed by merchant colors; guest can add (with options sheet) → bottom bar → cart sheet → submit order with no login.
- No regressions: dashboard pages still lazy-load and build; old CartModal/MenuItemCard untouched if used elsewhere.
- Commits pushed to `origin ui-ux/storefront-redesign`.
