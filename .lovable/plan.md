

# Responsywny Design (iOS/Android style) + Instalacja na Pulpit (PWA)

## Zakres prac

### 1. Responsywny layout mobilny (iOS/Android style)

**AppLayout.tsx** — na mobile sidebar zamienia się w dolny tab bar (bottom navigation jak w iOS/Android):
- Desktop (>=768px): sidebar po lewej (jak teraz)
- Mobile (<768px): sidebar ukryty, dolny pasek nawigacji z ikonami (Media plan, Dashboard, Klienci, Więcej)

**Nowy komponent: `MobileBottomNav.tsx`**
- 5 głównych ikon w dolnym pasku (jak iOS tab bar)
- Aktywna ikona podświetlona kolorem primary (miedź)
- "Więcej" otwiera drawer/sheet z resztą opcji (Produkty, Pakiety, Raporty, Ustawienia, Wyloguj)
- Zaokrąglone ikony, delikatne animacje, safe area padding na dole

**TopBar.tsx** — na mobile:
- Uproszczony: logo po lewej, bell po prawej
- Selektor klientów w collapsible dropdown pod top barem

**SuperAdminLayout.tsx** — analogicznie:
- Mobile: dolny tab bar z głównymi sekcjami admina
- Drawer "Więcej" z resztą nawigacji

**Ogólne CSS zmiany:**
- `main` padding zmniejszony na mobile (p-3 zamiast p-6)
- Karty, tabele, formularze — responsywne z `overflow-x-auto`
- Font-size bazowy dostosowany do mobile

### 2. Ikona aplikacji

Propozycja: Wykorzystanie istniejącego logo CorePlan jako ikony — wygenerowanie zestawu ikon PWA (192x192, 512x512) z logo na tle w kolorze granatu (#1e293b) z miedzianym akcentem. Ikony zostaną utworzone jako pliki SVG/PNG w `public/`.

### 3. Instalacja na pulpit (PWA — bez service worker)

Zgodnie z wytycznymi, prosty manifest.json **bez** vite-plugin-pwa i service workera:

**`public/manifest.json`:**
- `name`: "CorePlan"
- `short_name`: "CorePlan"  
- `display`: "standalone"
- `background_color`: "#1e293b" (navy)
- `theme_color`: "#C77745" (miedź)
- `icons`: 192x192 + 512x512
- `start_url`: "/"

**`index.html`:**
- Dodanie `<link rel="manifest" href="/manifest.json">`
- Meta tagi: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `theme-color`
- Apple touch icon

**Ikony PWA:**
- `public/icon-192.png` i `public/icon-512.png` — logo CorePlan na granatowym tle

---

## Struktura plików

| Plik | Zmiana |
|------|--------|
| `src/components/MobileBottomNav.tsx` | NOWY — dolna nawigacja iOS-style |
| `src/components/MobileAdminNav.tsx` | NOWY — dolna nawigacja dla Super Admina |
| `src/components/AppLayout.tsx` | Dodanie MobileBottomNav, ukrycie sidebar na mobile |
| `src/components/AppSidebar.tsx` | `hidden md:flex` — ukryty na mobile |
| `src/components/TopBar.tsx` | Responsywny na mobile |
| `src/components/admin/SuperAdminLayout.tsx` | Responsywny + mobile nav |
| `src/index.css` | Drobne mobilne poprawki |
| `public/manifest.json` | NOWY — PWA manifest |
| `public/icon-192.png` | NOWY — ikona PWA |
| `public/icon-512.png` | NOWY — ikona PWA |
| `index.html` | Meta tagi PWA + manifest link |

---

## Efekt końcowy

- Na telefonie: dolny tab bar jak natywna aplikacja iOS/Android
- Na pulpicie: "Zainstaluj aplikację" z przeglądarki → działa jak desktop app
- Ikona CorePlan na pulpicie/home screen z granatowym tłem i miedzianym logo

