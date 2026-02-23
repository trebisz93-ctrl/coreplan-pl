

# Plan: Logika Produktow i Nowy Widok Media Planu

## Podsumowanie zmian

Trzy glowne obszary do zmiany:

1. **Zakladka Produkty** -- usuniecie przycisku "Importuj produkty" i powiazanego kodu (seed). Produkty to wspolna baza dla wszystkich klientow.

2. **Media Plan -- nowa hierarchia na osi Y (prawa strona)** -- zmiana z `Subkategoria > Produkt` na `Aktywnosc > Subkategoria > Produkt`. Glowny poziom to nazwy aktywnosci, ktore mozna rozwinac do subkategorii, a potem do produktow.

3. **Media Plan -- belki aktywnosci wyswietlaja marke** -- na paskach Gantta zamiast nazwy aktywnosci wyswietlana jest **marka** produktu (lub marki produktow przypisanych do aktywnosci).

---

## Szczegoly techniczne

### 1. ProductsView.tsx -- uproszczenie

- Usuniecie przycisku **"Importuj produkty"** i calego dialogu importu (seed).
- Usuniecie stanu `seedClientId`, `seedGroupIdx` oraz `handleSeed`.
- Usuniecie importu `useSeedProducts`, `allSeedProducts`, `Download`.
- Reszta funkcjonalnosci (dodawanie, edycja, usuwanie, filtry, wyszukiwarka) bez zmian.

### 2. YearView.tsx -- nowa hierarchia osi Y

Aktualna logika:
```text
Subkategoria (rozwijana)
  > Produkt (rozwijalny)
    > paski aktywnosci
```

Nowa logika:
```text
Aktywnosc (nazwa) -- z belka na timeline
  > Subkategoria (rozwijalna)
    > Produkt (rozwijalny)
```

Zmiany:
- Glowna lista na osi Y to **aktywnosci** (z `filteredActivities`), nie subkategorie.
- Kazda aktywnosc wyswietla swoja nazwe w lewej kolumnie i belke na osi czasu.
- Po kliknieciu chevron przy aktywnosci -- rozwija sie lista subkategorii produktow przypisanych do tej aktywnosci.
- Po rozwinieciu subkategorii -- lista produktow nalezacych do tej subkategorii i przypisanych do danej aktywnosci.
- Zachowanie kolorow subkategorii, legendy, filtrow kanalow, wyszukiwarki, eksportu PDF.

### 3. YearView.tsx -- marka na belkach

- W `renderActivityBars` (lub nowej funkcji renderujacej belke aktywnosci) -- tekst na pasku to **marka** zamiast nazwy aktywnosci.
- Marka pobierana z produktow przypisanych do aktywnosci (`product.brand`). Jesli wiele marek -- wyswietlenie pierwszej lub skrot. Jesli brak marki -- fallback na nazwe aktywnosci.

### 4. Widok miesieczny/tygodniowy

- Logika bez zmian: domyslnie miesiace, po wybraniu krotszego okresu mozna przelaczac na tygodnie.

---

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/ProductsView.tsx` | Usuniecie importu produktow (seed dialog) |
| `src/components/YearView.tsx` | Nowa hierarchia: Aktywnosc > Subkategoria > Produkt; belki z marka |

