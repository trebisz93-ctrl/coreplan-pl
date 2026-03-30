

# Redesign UX — iOS/Android/Web Style

This is a large visual overhaul. I'll split it into 3 implementation rounds.

---

## Round 1: Color System + Global Styles + Sidebar + Bottom Nav

### 1A. New CSS Variables (`src/index.css`)

Replace current color tokens with the new palette:

```
--brand: 24 60% 54%        (≈ #D97A3A)
--brand-light: 30 85% 78%  (≈ #F5C49A)
--brand-bg: 28 100% 95%    (≈ #FFF3E8)
--brand-dark: 20 70% 32%   (≈ #8B4A1A)

--bg-screen: 240 5% 96%    (≈ #F2F2F7)
--border: 240 6% 90%       (≈ #E5E5EA)
--text-primary: 0 0% 0%
--text-secondary: 240 5% 26%
--text-tertiary: 240 4% 56%
```

Map these to existing Tailwind tokens:
- `--background` → `--bg-screen` (#F2F2F7)
- `--card` → white
- `--primary` → `--brand` (#D97A3A)
- `--border` → #E5E5EA
- `--muted-foreground` → `--text-tertiary`

Dark mode: adjust accordingly (darker brand bg, lighter text).

### 1B. Global Border Radius

Update `--radius: 1.125rem` (18px for cards). Add custom classes:
- `.rounded-card` = 18px (main cards)
- `.rounded-btn` = 12px (buttons)
- `.rounded-chip` = 8px (chips/tags)

### 1C. Sidebar Redesign (`AppSidebar.tsx`, `SuperAdminLayout.tsx`)

- Background: white (#FFFFFF) with right border `1px solid #E5E5EA`
- Active item: `bg-[#FFF3E8] text-[#D97A3A]` + `border-left: 3px solid #D97A3A`
- Hover: `bg-[#F5F5F5]`
- Width stays 240px (desktop)

### 1D. Bottom Nav iOS-style (`MobileBottomNav.tsx`, `MobileAdminNav.tsx`)

- Background: `rgba(248,248,248,0.97)` with `backdrop-blur-[20px]`
- Border top: `0.5px solid rgba(0,0,0,0.1)`
- Active tab: icon + label in brand color (#D97A3A)
- Inactive: opacity 0.35
- Touch targets: min 44px

### 1E. Remove AdminContextBar Banner

- Delete `<AdminContextBar />` from `AppLayout.tsx`
- Replace with breadcrumb-style context in `TopBar.tsx`:
  - `[Logo] [System › Firma X ▾] ........... [🔔] [Avatar]`
  - Clickable dropdown for org switching
  - "Widok globalny" as option in dropdown, not separate button

### 1F. Hover States (global CSS in `index.css`)

```css
.card-hover:hover {
  background: #FFFAF6;
  border-color: rgba(217,122,58,0.3);
  transition: all 0.15s ease;
}
tr.row-hover:hover {
  background: #FFFAF6;
}
```

---

## Round 2: Component Redesigns

### 2A. Card Styling (all Card components)

- `border-radius: 18px`
- No heavy shadows, rely on white-on-#F2F2F7 contrast
- Stat cards: icon in colored box (30x30, rounded-lg) → big number → small label

### 2B. RolesManagementView Redesign

- Stat cards: 2x2 grid with icon boxes, big numbers, labels
- Super Admin card: brand background with decorative circle, white text
- Filter: chip-style instead of Select dropdown
- User list: avatar circles (38px) + name + org + role badge (`bg-[#FFF3E8] text-[#D97A3A]`)
- Separator: `0.5px` between rows
- Empty states: "+" CTA button instead of "0"

### 2C. TopBar Breadcrumb + Context Switcher

Web-only top bar:
- Sticky, white bg, bottom border
- Left: logo + breadcrumb (`System › Firma X ▾`)
- Right: bell + user avatar
- Mobile: simplified (logo + bell only)

### 2D. Typography Scale

Web typography using Plus Jakarta Sans:
- H1: 24px/700, H2: 20px/600, H3: 16px/600
- Body: 14px/400, Small: 12px/400, Micro: 11px/500
- Mobile: slightly larger touch-friendly sizes

---

## Round 3: Animations + Gantt Polish + Final Details

### 3A. Animations (`tailwind.config.ts` + `index.css`)

Add keyframes:
- `fade-in`: opacity 0→1, translateY(10→0), 300ms
- `scale-in`: scale 0.95→1, 200ms
- `slide-in-right`: translateX(100%→0), 300ms
- Card hover: `translateY(-1px)`, 150ms
- Sidebar collapse: width transition 250ms
- Tab bar icon: scale pulse on selection

### 3B. Gantt Table Polish (`YearView.tsx`)

- Container: white card, rounded-[14px], overflow hidden
- Sticky left column (freeze on horizontal scroll)
- Right edge gradient fade indicating scrollable content
- Row hover: full-row highlight
- Gantt bar hover: tooltip with dates + value
- Left color bar: 4px, full height, rounded

### 3C. Segmented Controls

Replace current tab/toggle patterns with iOS-style segmented controls:
- Container: `bg-[rgba(118,118,128,0.12)]`, rounded-[9px], padding 2px
- Active: white bg, black text, rounded-[7px], shadow-sm
- Inactive: transparent, text-secondary

### 3D. Empty States

Anywhere a count is 0, replace with CTA button:
- Ghost button: `+ Dodaj managera` in brand color
- Consistent across all stat cards and list views

---

## Files Modified (all rounds)

| File | Change |
|------|--------|
| `src/index.css` | New color variables, hover classes, animations, 0.5px separators |
| `tailwind.config.ts` | New keyframes, animation utilities, border-radius tokens |
| `src/components/AppSidebar.tsx` | White bg, brand active state with left border |
| `src/components/admin/SuperAdminLayout.tsx` | Same sidebar treatment |
| `src/components/MobileBottomNav.tsx` | Blur bg, brand active color, 44pt targets |
| `src/components/MobileAdminNav.tsx` | Same mobile treatment |
| `src/components/TopBar.tsx` | Breadcrumb + context switcher replacing banner |
| `src/components/admin/AdminContextBar.tsx` | Removed from layouts (or gutted) |
| `src/components/AppLayout.tsx` | Remove AdminContextBar import |
| `src/components/admin/RolesManagementView.tsx` | Full redesign with icon cards, chips, avatars |
| `src/components/DashboardView.tsx` | Card styling, hover states, empty CTAs |
| `src/components/YearView.tsx` | Gantt sticky column, gradient, hover, rounded container |
| `src/components/ui/card.tsx` | Default rounded-[18px] |
| Multiple view components | Apply card-hover, row-hover, new typography |

---

## Technical Notes

- This is a **web application** (React/Tailwind). iOS/Android-specific features (SF Pro font, native ripple, Container Transform) are adapted as CSS equivalents (backdrop-blur, transition effects, hover states).
- Font stays Plus Jakarta Sans (already configured). No SF Pro or Roboto needed since this runs in browser.
- All colors use CSS custom properties for dark mode compatibility.
- Brand color (#D97A3A) rule enforced: max 3 brand-colored elements per screen (1 CTA, 1 active nav, 1 active chip).

