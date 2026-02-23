

# Migracja aktywnosci i planow mediowych do bazy danych

## Podsumowanie

Aktywnosci i media plany sa obecnie przechowywane w pamieci (mock data / local state). Po odswiezeniu strony znikaja. Ta migracja przeniesie je w 100% do bazy danych, dzieki czemu bedzie mozna:
- Trwale zapisywac aktywnosci
- Widziec je na planie mediowym po odswiezeniu
- Filtrowac aktywnosci per klient
- Obliczac budzet na podstawie prawdziwych danych

---

## Etap 1: Migracja bazy danych (nowe tabele)

### Tabela `media_plans`
Przechowuje media plany przypisane do klienta:

```text
media_plans
-----------
id           uuid (PK, default gen_random_uuid())
user_id      uuid (NOT NULL, ref auth.users)
client_id    uuid (NOT NULL, ref clients)
name         text (NOT NULL)
year         integer (NOT NULL, default 2026)
version      text (default 'v1')
created_at   timestamptz (default now())
updated_at   timestamptz (default now())
```

### Tabela `activities`
Przechowuje poszczegolne aktywnosci reklamowe:

```text
activities
----------
id              uuid (PK, default gen_random_uuid())
user_id         uuid (NOT NULL, ref auth.users)
client_id       uuid (NOT NULL, ref clients)
plan_id         uuid (ref media_plans, nullable)
name            text (NOT NULL)
channel         text (NOT NULL) -- 'online' / 'offline'
campaign_type   text (NOT NULL) -- 'display','social', etc.
start_date      date (NOT NULL)
end_date        date (NOT NULL)
product_ids     uuid[] (default '{}')
package_id      uuid (ref packages, nullable)
price           numeric (default 0)
status          text (default 'planned')
note            text
created_at      timestamptz (default now())
updated_at      timestamptz (default now())
```

### RLS na obu tabelach
- SELECT/INSERT/UPDATE/DELETE -- `auth.uid() = user_id`
- Standardowe polityki per uzytkownik (tak jak na clients/products)

---

## Etap 2: Hooki danych (`useData.ts`)

Nowe interfejsy i hooki:

| Hook | Opis |
|------|------|
| `DbActivity` | Interfejs odzwierciedlajacy kolumny tabeli activities |
| `DbMediaPlan` | Interfejs dla media_plans |
| `useActivities(clientId?)` | Pobiera aktywnosci, opcjonalnie filtrowane per klient |
| `useCreateActivity()` | Tworzy nowa aktywnosc w bazie |
| `useUpdateActivity()` | Aktualizuje istniejaca aktywnosc |
| `useDeleteActivity()` | Usuwa aktywnosc |
| `useMediaPlans(clientId?)` | Pobiera plany mediowe |
| `useCreateMediaPlan()` | Tworzy nowy plan |

---

## Etap 3: Aktualizacja `AppContext.tsx`

- Usuniecie importu `mockActivities` -- aktywnosci beda pobierane z bazy przez `useActivities(effectiveClientId)`
- `addActivity` i `updateActivity` przestana uzywac `useState`, zamiast tego beda invalidiowac query cache
- Obliczanie budzetow (`budgetUsed`, `budgetPlanned`, etc.) na bazie danych z bazy
- Eksport mutacji zamiast setterow stanu

---

## Etap 4: Aktualizacja komponentow

### `ActivityDialog.tsx`
- `handleSubmit` zamiast `addActivity(localObj)` uzyje `useCreateActivity().mutateAsync()`
- `planId` zostanie zamieniony na `client_id` (aktywnosc jest przypisana do klienta)

### `YearView.tsx`
- Aktywnosci beda pobierane z kontekstu (ktory teraz ciagnie z bazy)
- Bez zmian w logice wyswietlania

### `DashboardView.tsx`
- `budgetUsed` per klient -- obliczany z `useActivities(clientId)` lub z kontekstu
- Zamiast hardcoded `0`, prawdziwe dane

### `ReportsView.tsx`
- Tabela i eksport CSV na bazie danych z bazy

### `BudgetBar.tsx`
- Bez zmian -- juz korzysta z kontekstu

---

## Etap 5: Usuniecie mock data

- Plik `src/data/mockData.ts` -- usuniecie `activities` i `mediaPlans` (plik moze zostac pusty lub usuniety)
- Zadne komponenty nie beda juz importowac mockow

---

## Zmienione pliki

| Plik | Zmiana |
|------|--------|
| `supabase/migrations/...` | Nowa migracja: tabele `media_plans` + `activities` z RLS |
| `src/hooks/useData.ts` | Nowe hooki: useActivities, useCreateActivity, useUpdateActivity, useDeleteActivity, useMediaPlans |
| `src/context/AppContext.tsx` | Refaktor: aktywnosci z bazy, mutacje przez hooki, usuniety mock import |
| `src/components/ActivityDialog.tsx` | Submit przez useCreateActivity, client_id zamiast planId |
| `src/components/DashboardView.tsx` | Prawdziwe dane budzetowe per klient |
| `src/components/ReportsView.tsx` | Dane z bazy |
| `src/data/mockData.ts` | Usuniecie/wyczyszczenie |
| `src/integrations/supabase/types.ts` | Automatycznie zaktualizowany po migracji |

