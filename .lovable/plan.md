
# Plan: Enterprise CRM -- Rozbudowa do wersji Enterprise

To jest duza specyfikacja obejmujaca 10 modulow. Plan jest podzielony na fazy implementacji wedlug priorytetow i zaleznosci.

---

## FAZA 1: TopBar (minimalistyczny) + Centrum Powiadomien

### 1.1 Przebudowa TopBar

**Cel**: Czysty, lekki TopBar bez przeladowania informacjami.

**Co sie zmienia**:
- Lewa strona: Toggle "Jeden klient" + Dropdown klienta (bez zmian logiki multi-client)
- Srodek: Dynamiczny tytul widoku (na podstawie aktualnej trasy: Media Plan / Dashboard / Produkty / Uzytkownicy / Raporty)
- Prawa strona: Ikona dzwonka z badge
- **USUWAMY** z TopBar: BudgetBar, progress bar, globalna wyszukiwarka, filtr online/offline, przycisk "Dodaj aktywnosc"
- Filtr kanalow i wyszukiwarka przenosimy do poszczegolnych widokow (YearView, ReportsView) jako lokalne kontrolki

**Pliki**: `TopBar.tsx`, `BudgetBar.tsx` (usunac z TopBar), `YearView.tsx`, `ReportsView.tsx`

### 1.2 Centrum Powiadomien -- Backend

**Migracja SQL** -- nowa tabela `notifications`:

```text
notifications
  id          uuid PK
  user_id     uuid NOT NULL (ref auth.users)
  type        text NOT NULL (success/warning/error/info)
  category    text NOT NULL (system/activity/account/budget)
  title       text NOT NULL
  description text
  entity_id   uuid (opcjonalny -- link do aktywnosci/klienta)
  is_read     boolean DEFAULT false
  cta_path    text (sciezka np. /settings)
  created_at  timestamptz DEFAULT now()
```

RLS: Uzytkownik widzi tylko swoje powiadomienia. Admin widzi wszystkie.

**Realtime**: Wlaczenie realtime na tabeli notifications.

### 1.3 Centrum Powiadomien -- Frontend

**Nowy komponent** `NotificationCenter.tsx`:
- Drawer z prawej strony (Sheet z @radix-ui)
- Naglowek: "Centrum powiadomien" + przycisk "Oznacz wszystkie jako przeczytane"
- Zakladki (Tabs): Wszystkie / Systemowe / Aktywnosci / Konta / Budzet
- Kazde powiadomienie: ikona typu, tytul, opis, data, CTA, status przeczytane/nie
- Badge na ikonce dzwonka znika przy 0 nowych
- Scroll z lazy loading (paginacja po 20)

**Nowy hook** `useNotifications.ts`:
- `useNotifications(category?)` -- pobieranie z paginacja
- `useUnreadCount()` -- liczba nieprzeczytanych (realtime subscription)
- `useMarkAsRead()`, `useMarkAllAsRead()`

### 1.4 Automatyczne generowanie powiadomien

**Trigger SQL** lub logika w hookach:
- Nowe konto sie rejestruje -> powiadomienie dla admina
- Budzet > 100% -> powiadomienie dla wlasciciela klienta
- Aktywnosc = "Zrealizowana" bez proofu -> powiadomienie
- 3 dni przed startem aktywnosci -> (wymaga cron job / edge function)

**Edge function** `check-upcoming-activities`: uruchamiana cron co godzine, sprawdza aktywnosci rozpoczynajace sie za 3 dni i tworzy powiadomienia.

---

## FAZA 2: Zarzadzanie Uzytkownikami (rozszerzone)

### 2.1 Rozszerzenie profilu

**Migracja SQL** -- dodanie kolumn do `profiles`:
- `first_name text`
- `last_name text`
- `job_role text` (KAM / Marketing / Admin)
- `onboarding_completed boolean DEFAULT false`

### 2.2 Pierwsze logowanie -- onboarding

**Nowy komponent** `OnboardingDialog.tsx`:
- Wymuszony modal przy pierwszym logowaniu (jesli `onboarding_completed = false`)
- Pola: imie, nazwisko, rola
- Bez uzupelnienia brak dostepu do systemu

**Zmiana w** `ProtectedRoute.tsx`: Sprawdzenie `onboarding_completed` i przekierowanie do onboardingu.

### 2.3 Panel administracyjny uzytkownikow

**Rozbudowa** `SettingsView.tsx` lub nowy widok `UsersView.tsx`:
- Lista uzytkownikow z polami: display name, imie, nazwisko, rola, przypisani klienci, status
- Edycja wszystkich pol przez admina
- Usuwanie uzytkownikow (soft delete -- status = 'deactivated')
- Dezaktywacja (zmiana statusu na 'deactivated')
- Odbieranie dostepu do klientow

**Nowa trasa**: `/users` w `App.tsx` + nowa pozycja w sidebarze

---

## FAZA 3: Dashboard -- rozszerzenia

### 3.1 Okresy C1/C2/C3

**Zmiana w** `DashboardView.tsx`:
- Dodanie przyciskow C1 (sty-kwi), C2 (maj-sie), C3 (wrz-gru) obok Q1-Q4
- Zakres dat `quarterRanges` rozszerzony o C1, C2, C3

### 3.2 Porownania YoY

- Dodanie toggle "Porownaj z poprzednim rokiem"
- Drugi zakres dat automatycznie: `dateFrom - 1 rok` do `dateTo - 1 rok`
- Wykres z dwiema seriami (obecny vs poprzedni rok)

### 3.3 Filtry kategoria/subkategoria

- Dodanie dropdownow filtrowania po kategorii i subkategorii produktow
- Aktywnosci filtrowane przez product_ids -> dopasowanie do kategorii produktu

---

## FAZA 4: Produkty -- zmiany

### 4.1 Produkty globalne (usuniecie kolumny Klient)

**Zmiana**: Produkty staja sie globalne -- nie sa przypisane bezposrednio do klienta.
- W widoku `ProductsView.tsx`: usunac kolumne "Klient", usunac wymaganie klienta przy dodawaniu
- Wszystkie pola wymagane przy dodawaniu (nazwa, kategoria, subkategoria, EAN)
- Kolumna "Akcje" -> pelna edycja wszystkich pol

### 4.2 Subkategorie w Ustawieniach

**Nowa sekcja** w `SettingsView.tsx` lub osobny widok:
- CRUD na kategoriach i subkategoriach
- Tabela `categories` i `subcategories` w bazie lub zarzadzanie jako unikalne wartosci z produktow
- Produkt musi miec subkategorie (walidacja)

---

## FAZA 5: Typy kampanii (konfigurowalny modul)

### 5.1 Tabela kampanii

**Migracja SQL** -- nowa tabela `campaign_types`:

```text
campaign_types
  id        uuid PK
  user_id   uuid NOT NULL
  name      text NOT NULL
  label     text NOT NULL
  created_at timestamptz
```

### 5.2 UI w Ustawieniach

- Sekcja "Typy kampanii" w `SettingsView.tsx`
- CRUD: dodawanie, edycja, usuwanie
- W `ActivityDialog.tsx`: dropdown pobiera z bazy zamiast z hardcodowanego `campaignTypeLabels`

---

## FAZA 6: Raporty -- edytowalne

### 6.1 Interaktywna tabela raportow

**Zmiana w** `ReportsView.tsx`:
- Kazdy wiersz klikalny -> otwiera `ActivityDetailDrawer`
- W drawer: edycja aktywnosci (zmiana statusu, poprawa danych, podglad proofow)
- Drawer rozszerzony o formularz edycji (reuse z ActivityDialog ale w trybie edycji)

---

## FAZA 7: Workflow aktywnosci (automat)

### 7.1 Edge function `activity-workflow`

- Cron co godzine
- Jesli aktywnosc ma `start_date = dzisiaj` i `status = planned`:
  - Tworzy powiadomienie dla KAM: "Czy aktywnosc X trwa?"
  - KAM potwierdza -> status = 'in_progress'
- Jesli aktywnosc ma `end_date < dzisiaj` i `status = in_progress`:
  - Status -> 'completed'
  - Powiadomienie: "Wymagany proof (zdjecie)"

### 7.2 UI potwierdzenia

- Powiadomienie z przyciskiem CTA "Potwierdz start"
- Po kliknieciu -> zmiana statusu w bazie

---

## FAZA 8: Kalendarz (UI ulepszenie)

### 8.1 Widok roczny z tygodniami

**Zmiana w** `YearView.tsx`:
- Zamiast siatki 12 miesiecy -> pelny widok roczny z oznaczeniem tygodni (W1, W2, W3...)
- Date range picker na gorze
- Estetyczne oznaczenie tygodni
- Opcjonalny przelacznik: widok miesieczny vs tygodniowy

---

## FAZA 9: Admin -- zarzadzanie dostepem

Pokrywa sie z Faza 2 (punkt 2.3). Dodatkowe akcje:
- Usuwanie uzytkownikow (z potwierdzeniem)
- Dezaktywacja (status = 'deactivated', uzytkownik nie moze sie logowac)
- Odbieranie dostepu do klientow (usuwanie z `client_assignments`)

---

## FAZA 10: Widget powiadomien na Dashboard (PRO)

- Karta "Masz X nieprzeczytanych powiadomien" na Dashboard
- Ustawienia powiadomien: toggle per typ (w SettingsView)

---

## Podsumowanie zmian w plikach

| Faza | Nowe pliki | Modyfikowane pliki | Migracje SQL |
|------|-----------|-------------------|--------------|
| 1 | `NotificationCenter.tsx`, `useNotifications.ts`, edge fn `check-upcoming-activities` | `TopBar.tsx`, `YearView.tsx`, `ReportsView.tsx`, `AppLayout.tsx` | `notifications` tabela + RLS + realtime |
| 2 | `OnboardingDialog.tsx`, `UsersView.tsx` | `ProtectedRoute.tsx`, `SettingsView.tsx`, `AppSidebar.tsx`, `App.tsx` | ALTER profiles + kolumny |
| 3 | -- | `DashboardView.tsx` | -- |
| 4 | -- | `ProductsView.tsx`, `SettingsView.tsx` | -- (lub tabela categories) |
| 5 | -- | `SettingsView.tsx`, `ActivityDialog.tsx` | `campaign_types` tabela |
| 6 | -- | `ReportsView.tsx`, `ActivityDetailDrawer.tsx` | -- |
| 7 | edge fn `activity-workflow` | `NotificationCenter.tsx` | cron job SQL |
| 8 | -- | `YearView.tsx` | -- |
| 9 | -- | `UsersView.tsx` (z Fazy 2) | -- |
| 10 | -- | `DashboardView.tsx`, `SettingsView.tsx` | -- |

---

## Kolejnosc implementacji

Zalecana kolejnosc: **Faza 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 8 -> 7 -> 9 -> 10**

Faza 7 (workflow) wymaga gotowego Centrum Powiadomien (Faza 1) i panelu uzytkownikow (Faza 2), dlatego jest pozniej.

Ze wzgledu na rozmiar specyfikacji, implementacja bedzie realizowana faza po fazie. Po zatwierdzeniu planu zaczniemy od **Fazy 1** (TopBar + Centrum Powiadomien).
