

# Plan: Naprawa i ulepszenia aplikacji MediaPlan CRM

## 1. Brak polityki RLS dla DELETE na activities (assigned users)

Przypisani uzytkownicy moga widziec i edytowac aktywnosci klienta, ale NIE moga ich usuwac. Brakuje polityki DELETE dla `client_assignments`.

Analogicznie brakuje polityk INSERT/UPDATE/DELETE dla assigned users na tabelach: `confirmations`, `products`, `media_plans`.

**Zmiana:** Migracja SQL dodajaca brakujace polityki RLS:
- `activities` -- DELETE dla assigned users
- `confirmations` -- INSERT, UPDATE, DELETE dla assigned users
- `products` -- UPDATE, DELETE dla assigned users  
- `media_plans` -- UPDATE, DELETE dla assigned users

---

## 2. Brak polityki INSERT na activities dla assigned users

Przypisany uzytkownik widzi klienta, ale nie moze dodac nowej aktywnosci dla tego klienta, bo INSERT wymaga `auth.uid() = user_id` -- a `user_id` w tabeli activities to tworca, nie przypisany uzytkownik.

**Zmiana:** Nowa polityka INSERT na `activities` pozwalajaca assigned users tworzyc aktywnosci dla przypisanego klienta.

---

## 3. Ostrzezenie w konsoli: SettingsView nie uzywa forwardRef

Konsola pokazuje: "Function components cannot be given refs. Check the render method of App" dla `SettingsView`.

**Zmiana:** Dodanie `React.forwardRef` do `SettingsView` lub naprawienie sposobu renderowania w `App.tsx` (prawdopodobnie React Router przekazuje ref do komponentu strony).

---

## 4. Brak usuwania aktywnosci z poziomu UI

`ActivityDetailDrawer` pozwala edytowac aktywnosc, ale nie ma przycisku "Usun". Hook `useDeleteActivity` istnieje, ale nie jest uzyty w UI.

**Zmiana:** Dodanie przycisku "Usun aktywnosc" z potwierdzeniem (AlertDialog) w `ActivityDetailDrawer`.

---

## 5. Rok hardcoded na 2026

W `YearView.tsx` rok jest ustawiony na stale `const year = 2026`. Uzytkownik nie moze przelaczac miedzy latami.

**Zmiana:** Dodanie selektora roku (np. przyciski -/+ lub dropdown) w panelu kontrolnym YearView.

---

## 6. Brak walidacji dat w ActivityDialog

Formularz nie sprawdza, czy daty sa w zakresie wybranego roku. Mozna dodac aktywnosc z datami spoza widocznego zakresu.

**Zmiana:** Dodanie domyslnych dat (dzisiejszy dzien) i walidacji zakresu w `ActivityDialog`.

---

## Pliki do zmiany

| Element | Zmiana |
|---------|--------|
| Migracja SQL | ~8 nowych polityk RLS (DELETE/INSERT dla assigned users) |
| `src/components/ActivityDetailDrawer.tsx` | Przycisk usuwania aktywnosci |
| `src/components/YearView.tsx` | Selektor roku |
| `src/components/SettingsView.tsx` | Fix ostrzezenia forwardRef |
| `src/components/ActivityDialog.tsx` | Domyslne daty |

