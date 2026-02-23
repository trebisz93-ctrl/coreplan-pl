

# Plan: Dodanie pakietow i zmiana hierarchii Media Planu

## 1. Dodanie 6 predefiniowanych pakietow do bazy danych

Wstawienie danych za pomoca narzedzia INSERT do tabeli `packages` -- 6 pakietow z ich elementami (items) w formacie JSON:

| Pakiet | Kwota | Elementy (items) |
|--------|-------|------------------|
| PAKIET MINI | 12 000 | Rich Content: SI, Kategoria Listing: Pozycjonowanie produktu 1.2 |
| STANDARD | 30 000 | Kategoria Listing: Banner, Kategoria Listing: Pozycjonowanie produktu 1.2, Rich Content: SI |
| CORE SOCIAL MEDIA | 40 000 | Social Media: Instastory, Social Media: Konkurs, APP: Stories |
| KORZYSTNY | 80 000 | Listing: Pozycjonowanie produktu 1.2, Rich Content: SI, Strona Glowna: Banner, Strona Glowna: Logotyp, Wyszukiwarka: Pozycjonowanie produktu |
| TYDZIEN Z MARKA | 100 000 | Artykul: Pozycjonowanie produktu w karuzeli, Kategoria Listing: Banner, Kategoria Listing: Logotyp, Rich Content: SI, Strona Glowna: Logotyp, Strona Glowna: Teaser standard, Wyszukiwarka: Pozycjonowanie produktu |
| WIDOCZNOSC | 130 000 | Strona Glowna: Teaser Standard, Wyszukiwarka: Pozycjonowanie produktu, Artykul: Pozycjonowanie produktu w karuzeli, Kategoria Listing: Logotyp, Kategoria Listing: Pozycjonowanie produktu 1.2, Rich Content: SI, Strona Glowna: Logotyp |

Kazdy element (item) bedzie mial `quantity: 1` i `unitPrice: 0` (cena calosciowa pakietu jest w `default_price`).

## 2. Zmiana hierarchii Media Planu -- Pakiet jako glowny poziom

**Plik: `src/components/YearView.tsx`**

Obecna hierarchia: `Aktywnosc > Subkategoria > Produkt`

Nowa hierarchia:
```text
Pakiet (nazwa pakietu) -- glowny poziom z belka na timeline
  > Aktywnosc (nazwa aktywnosci)
    > Subkategoria (jesli sa produkty)
      > Produkt
```

Zmiany:
- Grupowanie `filteredActivities` po `packageId` -- aktywnosci z tym samym pakietem trafiaja do jednej grupy
- Aktywnosci bez pakietu trafiaja do grupy "Bez pakietu"
- Pakiet jest rozwijanym wierszem glownym, pod nim aktywnosci z belkami
- Dalsze drilldown (subkategoria/produkt) bez zmian

## 3. Edycja aktywnosci -- dodanie wyboru produktow i marki

**Plik: `src/components/ActivityDetailDrawer.tsx`**

Obecny tryb edycji nie pozwala na zmiane produktow. Zmiany:
- Dodanie stanu `editProductIds` i `editProductSearch` do formularza edycji
- Pobranie pelnej listy produktow z `useProducts()` (bez filtrowania po kliencie)
- Dodanie sekcji z wyszukiwarka produktow i checkboxami (identycznie jak w `ActivityDialog.tsx`)
- Dodanie pola wyboru pakietu (`editPackageId`) w formularzu edycji
- Przekazanie `product_ids` i `package_id` do `updateActivity.mutateAsync`

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| Baza danych (INSERT) | Wstawienie 6 pakietow z elementami |
| `src/components/YearView.tsx` | Hierarchia: Pakiet > Aktywnosc > Subkategoria > Produkt |
| `src/components/ActivityDetailDrawer.tsx` | Edycja produktow i pakietu w trybie edycji aktywnosci |

