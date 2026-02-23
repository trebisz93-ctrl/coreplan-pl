

# Plan: MediaPlan CRM -- Etap 1 (Naprawa) + Etap 2 (UX/Ulepszenia)

## ETAP 1 -- NAPRAWA (krytyczne)

### 1.1 Aktywnosci: zapis, timeline, budzet

**Problem**: Aktywnosci zapisuja sie, ale logika budzetu w `AppContext.tsx` liczy `budgetUsed` jako **wszystkie nie-anulowane** (linia 66). Trzeba rozdzielic na:
- `budgetPlanned` = planned + in_progress (rezerwacja)
- `budgetCompleted` = completed (realizacja)  
- `budgetUsed` = planned + in_progress + completed (bez cancelled)

**Zmiany**:
- **`src/context/AppContext.tsx`**: Juz ma `budgetPlanned` i `budgetCompleted` -- logika jest poprawna. Upewnij sie, ze `BudgetBar` wyswietla te wartosci osobno.
- **`src/components/BudgetBar.tsx`**: Rozszerz o wyswietlanie "Zaplanowane" i "Zrealizowane" oddzielnie. Aktualnie pokazuje tylko "Uzyte" (wszystko bez cancelled).
- **`src/components/ActivityDialog.tsx`**: Popraw walidacje (punkt 1.3) i upewnij sie, ze `effectiveClientId` jest zawsze ustawiony.

### 1.2 Obsluga bledow zapisu -- feedback

**Problem**: Wiekszosc catch-ow juz pokazuje `toast.error(e.message)`, ale komunikaty moga byc niejasne (surowe bledy Postgres).

**Zmiany**:
- **`src/hooks/useActivities.ts`**: Dodaj lepsze formatowanie bledow w mutacjach (`onError` callback).
- **`src/hooks/useData.ts`**: Analogicznie -- ustandaryzuj komunikaty bledow.
- **`src/components/ActivityDialog.tsx`**: Juz ma `toast.error('Blad: ' + ...)` -- popraw format.

### 1.3 Walidacje (blokady)

**Zmiany w `ActivityDialog.tsx`**:
- Walidacja: `end_date >= start_date` -- blokuj z komunikatem "Data zakonczenia musi byc pozniejsza niz data rozpoczecia".
- Walidacja: `price >= 0` -- blokuj z komunikatem "Cena nie moze byc ujemna".
- Walidacja: `effectiveClientId` musi byc wybrany.
- Popraw komunikaty -- osobne dla kazdego pola.

**Zmiany w `PackagesView.tsx`**:
- Walidacja `default_price >= 0`.
- Walidacja ze `name` nie jest pusty (juz jest).

**Zmiany w `ProductsView.tsx`**:
- Rozdziel komunikaty: "Podaj nazwe produktu" vs "Wybierz klienta" osobno.

---

## ETAP 2 -- POPRAWKI / UX / Ulepszenia

### 2.1 Pakiety zgodnie ze specyfikacja

**Dane**: Seed 6 pakietow z dokladnymi nazwami, cenami i elementami zakresu.

**Zmiany**:
- **Baza danych**: Uzyj narzedzia insert do wstawienia 6 predefiniowanych pakietow dla aktualnego uzytkownika. Kazdy pakiet ma `items` jako tablice JSON z elementami zakresu.
- Pakiety:
  1. PAKIET MINI -- 12 000 zl (Rich Content: SI, Kategoria, Listing: Pozycjonowanie produktu 1.2)
  2. STANDARD -- 30 000 zl (3 elementy)
  3. CORE SOCIAL MEDIA -- 40 000 zl (3 elementy)
  4. KORZYSTNY -- 80 000 zl (5 elementow)
  5. TYDZIEN Z MARKA -- 100 000 zl (7 elementow)
  6. WIDOCZNOSC -- 130 000 zl (7 elementow)

### 2.2 UX i dostepnosc

**Zmiany**:
- **`src/components/ActivityDialog.tsx`**: Zmien label "Klient (kategoria)" na "Klient".
- **`src/components/ClientsView.tsx`**: Dodaj Tooltip do przyciskow Check/X w edycji budzetu z etykietami "Zapisz" i "Anuluj".
- **`src/components/PackagesView.tsx`**: Dodaj Tooltip "Usun element" do przycisku X przy elementach pakietu. Popraw formatowanie cen w elementach (formatPLN).
- **Selecty**: Upewnij sie, ze `<SelectValue>` wyswietla aktualnie wybrana wartosc (powinno dzialac domyslnie z Radix -- weryfikacja).

### 2.3 Role i separacja danych (multi-tenant enforcement)

**Zmiany w bazie danych** (migracja SQL):
- Rozszerz enum `app_role` o wartosc `'manager'` i `'viewer'`.
- RLS juz jest poprawne (user_id = auth.uid() na wszystkich tabelach) -- multi-tenant jest wymuszony.

**Zmiany w kodzie**:
- **`src/hooks/useData.ts`**: Zaktualizuj typ `DbUserRole.role` na `'admin' | 'manager' | 'viewer'`.
- **`src/components/SettingsView.tsx`**: Dodaj opcje Manager i Viewer w select roli.
- **`src/context/AppContext.tsx`**: Dodaj `userRole` do kontekstu (pobierz z `useMyRole`).
- **Utworz `src/hooks/useRole.ts`**: Hook `useCanEdit()` ktory zwraca `true` jesli rola != 'viewer'.
- **Komponenty**: W `ClientsView`, `ProductsView`, `PackagesView`, `ActivityDialog`, `TopBar` -- ukryj przyciski edycji/usuwania/dodawania jesli `useCanEdit() === false`.
- **`src/components/BudgetBar.tsx`**: Viewer widzi budzet ale nie moze edytowac.

---

## Podsumowanie zmian w plikach

| Plik | Typ zmiany |
|------|-----------|
| `src/components/BudgetBar.tsx` | Rozdzielenie budgetu na zaplanowane/zrealizowane |
| `src/components/ActivityDialog.tsx` | Walidacje, label "Klient", error handling |
| `src/components/PackagesView.tsx` | Tooltip usun element, formatowanie cen, walidacja ceny |
| `src/components/ProductsView.tsx` | Rozdzielone komunikaty walidacji |
| `src/components/ClientsView.tsx` | Tooltip na przyciskach budzetu |
| `src/components/SettingsView.tsx` | Manager/Viewer role |
| `src/components/TopBar.tsx` | Ukrycie "Dodaj" dla Viewer |
| `src/context/AppContext.tsx` | Eksport roli uzytkownika |
| `src/hooks/useData.ts` | Rozszerzenie typow rol |
| `src/hooks/useRole.ts` | **NOWY** -- hook useCanEdit |
| Migracja SQL | ALTER TYPE app_role ADD VALUE |
| Insert danych | 6 pakietow seedowych |

