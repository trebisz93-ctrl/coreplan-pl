

# Plan: Budżet per klient, produkty z EAN w bazie, widok centralny

## Podsumowanie

Aplikacja zostanie przebudowana tak, aby:
- Produkty miały pole EAN i były w 100% zarządzane z bazy danych
- Każdy klient miał przypisany budżet roczny z możliwością śledzenia
- Widok centralny pokazywał wszystkich klientów z ich budżetami w jednym oknie
- Dane mockowe zostały usunięte i zastąpione danymi z bazy

---

## Etap 1: Zmiany w bazie danych

### 1a. Dodanie kolumny `ean` do tabeli `products`
- Nowa kolumna `ean TEXT` (opcjonalna, bo nie każdy produkt musi mieć EAN)

### 1b. Dodanie kolumny `annual_budget` do tabeli `clients`
- Nowa kolumna `annual_budget NUMERIC DEFAULT 0` -- budżet roczny klienta

---

## Etap 2: Aktualizacja hooków danych (`useData.ts`)

- Rozszerzenie interfejsu `DbProduct` o pole `ean`
- Rozszerzenie interfejsu `DbClient` o pole `annual_budget`
- Aktualizacja `useCreateProduct` -- przyjmuje `ean` obok `name` i `clientId`
- Aktualizacja `useUpdateProduct` -- umożliwia edycję `ean`
- Dodanie `useUpdateClientBudget` -- ustawia budżet roczny klienta
- Dodanie hooka `useSeedProducts` -- jednorazowy import listy produktów do bazy

---

## Etap 3: Widok Produkty (`ProductsView.tsx`)

- Wyświetlanie EAN obok nazwy produktu na karcie
- Formularz dodawania: pole EAN obok nazwy
- Edycja inline: możliwość zmiany EAN
- Przycisk "Importuj produkty startowe" -- wczytuje podaną listę produktów do bazy (jednorazowo)

### Lista produktów do importu (dwie grupy):

**Grupa 1 (Nutridrink/Danacol) -- 22 produkty** z EAN, np.:
- Danacol Plus żel 21 saszetek po 15 ml (EAN: 5900852059902)
- Nutridrink PROTEIN OMEGA 3 Mango-Brzoskwinia 4x125ml (EAN: 8716900582707)
- ... (pełna lista z wiadomości)

**Grupa 2 (Bebiko/Bebilon) -- 27 produktów** z EAN, np.:
- Bebiko JUNIOR 5 (600G) (EAN: 5900852054985)
- Bebilon PF CESAR BIOTIK 2 (800G) (EAN: 8718117612529)
- ... (pełna lista z wiadomości)

Import przypisze produkty do wybranego klienta (użytkownik wybierze przy imporcie).

---

## Etap 4: Widok Klienci (`ClientsView.tsx`)

- Na karcie klienta: wyświetlanie budżetu rocznego
- Pole do ustawienia/edycji budżetu (inline lub dialog)
- Pasek wykorzystania budżetu (podobny do obecnego `BudgetBar`)
- Liczba produktów i aktywności per klient

---

## Etap 5: Widok centralny (nowy lub przebudowany Dashboard)

- Lista wszystkich klientów jako "kafelki/karty"
- Każda karta pokazuje:
  - Nazwa klienta
  - Budżet roczny / wykorzystany / pozostały
  - Pasek procentowy wykorzystania
  - Liczba produktów
- Kliknięcie w klienta przechodzi do szczegółowego widoku tego klienta

---

## Etap 6: Czyszczenie danych mockowych

- Usunięcie `mockData.ts` (klienci i produkty) -- plany i aktywności na razie pozostają jako mock do czasu migracji
- Aktualizacja `AppContext` -- produkty pobierane z bazy przez `useProducts` zamiast z mocków
- Aktualizacja komponentów korzystających z mocków (YearView, DashboardView, ActivityDialog)

---

## Szczegóły techniczne

### Migracja SQL:
```sql
ALTER TABLE public.products ADD COLUMN ean TEXT;
ALTER TABLE public.clients ADD COLUMN annual_budget NUMERIC NOT NULL DEFAULT 0;
```

### Nowe/zmienione pliki:
| Plik | Zmiana |
|------|--------|
| `supabase/migrations/...` | Migracja: ean + annual_budget |
| `src/hooks/useData.ts` | Nowe interfejsy, hooki seed/budget |
| `src/components/ProductsView.tsx` | EAN w formularzu i na kartach, import |
| `src/components/ClientsView.tsx` | Budżet na karcie, edycja budżetu |
| `src/components/DashboardView.tsx` | Widok centralny z kafelkami klientów |
| `src/data/mockData.ts` | Usunięcie klientów/produktów (zachowanie planów/aktywności tymczasowo) |
| `src/context/AppContext.tsx` | Produkty z bazy zamiast z mocków |

### Dane do seedowania:
Produkty zostaną zapisane jako stała w kodzie importu i wstawione do bazy po kliknięciu przycisku. Wymagają przypisania do istniejącego klienta.

