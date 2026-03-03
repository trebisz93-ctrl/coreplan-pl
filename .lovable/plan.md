

# Rebranding MediaPlan CRM → CorePlan + SEO

## Scope

Full rebranding across all files + SEO implementation + logo integration.

---

## Changes

### 1. Logo asset
- Copy `user-uploads://Core_plan.png` to `src/assets/core-plan-logo.png`
- Also copy to `public/images/core-plan-logo.png` (for meta tags/favicon reference)

### 2. `index.html` — full meta/SEO overhaul
- Title: `CorePlan – System CRM do mediaplanu i kontroli budżetu marketingowego`
- All meta tags as specified (description, keywords, author, OG, Twitter)
- Canonical link to `https://coreplan.pl`
- JSON-LD structured data block
- Preconnect to Google Fonts
- Favicon pointing to new logo

### 3. `public/robots.txt`
- Add `Sitemap: https://coreplan.pl/sitemap.xml`

### 4. New file: `public/sitemap.xml`
- Static sitemap with main routes

### 5. `src/components/AppSidebar.tsx`
- Replace emoji + "MediaPlan CRM" text with `<img>` logo + "CorePlan" text
- Update subtitle from "Zarządzanie mediaplanami" to "All your marketing. In one place."
- Update version footer to "CorePlan v1.0"

### 6. `src/pages/Auth.tsx`
- Replace `📊 MediaPlan CRM` heading with logo image + "CorePlan"

### 7. `src/components/SettingsView.tsx`
- "MediaPlan CRM v1.0" → "CorePlan v1.0"
- "© 2026 MediaPlan CRM" → "© 2026 CorePlan"

### 8. `src/components/MfaSetup.tsx`
- `friendlyName: 'MediaPlan CRM'` → `'CorePlan'`

### 9. `src/lib/exportPdfVector.ts`
- PDF header: `'Media Plan'` → `'CorePlan'`
- Filename: `mediaplan-...` → `coreplan-...`

### 10. `src/components/ReportsView.tsx`
- CSV download filename: `mediaplan` → `coreplan`

### 11. `supabase/functions/send-notification-email/index.ts`
- All "MediaPlan CRM" references → "CorePlan"
- Email from: `'CorePlan <noreply@neovir.pl>'`
- Link to `https://coreplan.pl`

### 12. `src/components/OnboardingDialog.tsx`
- No direct branding references found — no change needed

### 13. `src/components/TopBar.tsx`
- Route title `'Media Plan'` → `'CorePlan'` (for the "/" route)

---

## SEO landing content

The Auth page (public-facing login) will get a hidden SEO text section below the card with ~400 words containing target keywords, visible to crawlers. Alternatively, a dedicated landing page component could be created — but since this is a SPA CRM behind auth, the Auth page is the only publicly crawlable page.

---

## Files NOT changed
- `src/types/mediaplan.ts` — internal type/interface names (`MediaPlan`, `CampaignType`, etc.) stay as-is since they are code identifiers, not user-facing
- `src/hooks/useActivities.ts` — `DbMediaPlan`, `useMediaPlans` etc. are internal code names
- `src/context/AppContext.tsx` — only imports from mediaplan types

