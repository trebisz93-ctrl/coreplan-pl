

# Plan: Logowanie z Supabase

## Podsumowanie

Dodanie systemu uwierzytelniania (logowanie / rejestracja / reset hasla) opartego na Supabase Auth. Niezalogowani uzytkownicy widza strone logowania, zalogowani -- pelna aplikacje.

---

## Krok 1: Podlaczenie Supabase

Podlaczenie projektu do Supabase za pomoca wbudowanego connectora. To udostepni klucze `SUPABASE_URL` i `SUPABASE_ANON_KEY` w projekcie.

## Krok 2: Klient Supabase

Utworzenie pliku `src/integrations/supabase/client.ts` z inicjalizacja klienta Supabase.

## Krok 3: Kontekst uwierzytelniania

Utworzenie `src/context/AuthContext.tsx`:
- Stan sesji uzytkownika (`user`, `session`, `loading`)
- Listener `onAuthStateChange` + poczatkowe `getSession()`
- Funkcje: `signIn`, `signUp`, `signOut`, `resetPassword`
- Provider opakowujacy cala aplikacje

## Krok 4: Strona logowania

Utworzenie `src/pages/Auth.tsx`:
- Formularz logowania (email + haslo)
- Zakladka rejestracji
- Link "Zapomnialem hasla" z formularzem reset
- Stylizacja zgodna z obecnym designem (Plus Jakarta Sans, kolory primary)

## Krok 5: Strona resetu hasla

Utworzenie `src/pages/ResetPassword.tsx`:
- Formularz nowego hasla
- Obsluga tokenu recovery z URL hash
- Wywolanie `supabase.auth.updateUser({ password })`

## Krok 6: Komponent ochrony tras

Utworzenie `src/components/ProtectedRoute.tsx`:
- Sprawdzanie czy uzytkownik jest zalogowany
- Jesli nie -- przekierowanie na `/auth`
- Jesli tak -- renderowanie `children`

## Krok 7: Aktualizacja routingu

Modyfikacja `src/App.tsx`:
- Dodanie `AuthProvider` opakowujacego aplikacje
- Trasa `/auth` -- strona logowania
- Trasa `/reset-password` -- strona resetu hasla
- Ochrona istniejacych tras przez `ProtectedRoute`

## Krok 8: Przycisk wylogowania

Dodanie przycisku "Wyloguj" w dolnej czesci sidebara (`AppSidebar.tsx`) z ikona `LogOut`.

---

## Szczegoly techniczne

### Struktura plikow

```text
src/
  integrations/supabase/
    client.ts              -- klient Supabase
  context/
    AuthContext.tsx         -- kontekst auth
    AppContext.tsx           -- bez zmian
  pages/
    Auth.tsx                -- logowanie / rejestracja
    ResetPassword.tsx       -- reset hasla
  components/
    ProtectedRoute.tsx      -- ochrona tras
    AppSidebar.tsx          -- + przycisk wylogowania
  App.tsx                   -- + AuthProvider + nowe trasy
```

### Routing

```text
/auth            -- publiczna (logowanie/rejestracja)
/reset-password  -- publiczna (reset hasla)
/                -- chroniona (Year View)
/dashboard       -- chroniona
/packages        -- chroniona
/reports         -- chroniona
/settings        -- chroniona
```

### Tabela profili

Na tym etapie NIE tworzymy tabeli profili -- korzystamy tylko z wbudowanej tabeli `auth.users`. Profile mozna dodac w nastepnym kroku, jesli bedzie potrzeba przechowywania dodatkowych danych (avatar, nazwa, rola).

### Bezpieczenstwo

- Hasla obslugiwane wylacznie przez Supabase Auth (bcrypt)
- Brak hardcoded credentials -- zadnego konta admin/admin123
- Sesja zarzadzana przez `onAuthStateChange` (nie localStorage)
- Redirect URL ustawiony na `window.location.origin`

