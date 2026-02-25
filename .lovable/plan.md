

# Plan: Naprawa widocznosci przypisanych klientow + rozroznienie klientow w Media Planie

## Problem 1: Uzytkownik z przypisanym klientem nie widzi jego danych

### Przyczyna
Polityki RLS (Row Level Security) na tabelach `clients` i `activities` pozwalaja tylko na dostep wlascicielowi (`user_id = auth.uid()`). Gdy admin przypisuje klienta do uzytkownika przez `client_assignments`, ten uzytkownik nadal NIE moze zobaczyc tego klienta ani jego aktywnosci, bo RLS tego nie uwzglednia.

### Rozwiazanie
Dodanie nowych polityk RLS:

**Tabela `clients`** -- nowa polityka SELECT:
- Uzytkownik moze widziec klienta, jesli istnieje rekord w `client_assignments` laczacy jego `user_id` z `client_id` tego klienta.

**Tabela `activities`** -- nowe polityki SELECT/UPDATE/DELETE:
- Uzytkownik moze widziec/edytowac aktywnosci nalezace do klienta, do ktorego jest przypisany przez `client_assignments`.

**Tabela `products`** -- nowa polityka SELECT:
- Uzytkownik moze widziec produkty klienta, do ktorego jest przypisany.

Migracja SQL doda polityki w formacie:
```text
CREATE POLICY "Assigned users can view client"
ON public.clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_assignments ca
    WHERE ca.client_id = clients.id
    AND ca.user_id = auth.uid()
  )
);
```

Analogiczne polityki dla `activities` (po `client_id`) i `products` (po `client_id`).

---

## Problem 2: Brak rozroznienia klientow w widoku Media Planu

### Rozwiazanie
W pliku `src/components/YearView.tsx`:

- Dodanie mapy klientow (`clientMap`) z `clients` dostepnych w `useApp()`.
- W naglowku grupy pakietowej -- wyswietlenie nazwy klienta/klientow jako badge obok nazwy pakietu.
- W wierszu aktywnosci -- dodanie malego badge z nazwa klienta po nazwie aktywnosci (widoczne szczegolnie w trybie multi-client).
- W tooltipie pakietu -- dodanie listy klientow nalezacych do danej grupy.

Efekt wizualny:
```text
PAKIET MINI [Klient A]          |====== pasek ======|
  Tydzien z marka               |=== primary bar ===|
```

---

## Pliki do zmiany

| Element | Zmiana |
|---------|--------|
| Migracja SQL | 3 nowe polityki RLS (clients, activities, products) |
| `src/components/YearView.tsx` | Badge klienta w naglowku pakietu i wierszach aktywnosci |

