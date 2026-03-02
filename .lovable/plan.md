

# Ukrywanie cen + poprawka kolejnosci warstw w PDF

## Co robimy

1. **Przelacznik "Ukryj ceny"** w pasku kontrolnym YearView -- toggle Switch obok przycisku PDF
2. **Widok (YearView)** -- gdy `showPrices=false`:
   - Ukrywa kwoty w pasku pakietu (`formatPLN(totalPrice)` na pasku aggregate i w etykiecie `akt.`)
   - Ukrywa kwoty w tooltip aktywnosci
   - Ukrywa kwoty na paskach glownych (bar label)
   - Ukrywa budzet w headerze pakietu
3. **PDF (exportPdfVector)** -- przekazujemy `showPrices` jako nowa opcja:
   - Gdy `false`: pomija "Budzet: ..." w metadanych
   - Pomija cene w etykiecie pakietu
   - Pomija cene w etykiecie paska aktywnosci
4. **PDF warstwy** -- linie siatki miesiecznej rysowane SA PRZED pakami/aktywnosciami (tzn. najpierw siatka, potem rysujemy wiersze na wierzchu)

---

## Szczegoly techniczne

### Plik: `src/components/YearView.tsx`

- Dodac stan: `const [showPrices, setShowPrices] = useState(true);`
- W pasku kontrolnym (obok przycisku PDF) dodac Switch + label "Ceny"
- Warunkowo ukrywac kwoty w:
  - Linia 551: `{totalActivities} akt.` -- dodac warunkowo ` • ${formatPLN(totalPrice)}`
  - Linia 574: bar label pakietu -- warunkowo `formatPLN`
  - Linia 347: tooltip `formatPLN(activity.price)` 
  - Linia 586: tooltip budzet
- Przekazac `showPrices` do `exportMediaPlanPDF`

### Plik: `src/lib/exportPdfVector.ts`

- Dodac `showPrices?: boolean` do `ExportOptions`
- Warunkowo pomijac:
  - Linia 172: `metaParts.push(Budzet: ...)` 
  - Linia 288: cena w etykiecie pakietu
  - Linia 357: cena na pasku aktywnosci

- **Poprawka warstw**: Obecnie siatka rysowana jest PO wierszach (linie 372-380). Zmienimy kolejnosc -- siatka bedzie rysowana PRZED wierszami pakietow/aktywnosci. Realizacja: zbieramy pozycje X miesiecy, a nastepnie w petli rysowania wierszy rysujemy linie siatki najpierw (na kazdej stronie), a dopiero potem rysujemy tla wierszy i paski aktywnosci na wierzchu. Alternatywnie (prosciej): rysujemy siatke PRZED wierszami na kazdej stronie -- to wymaga dwoch przejsc lub rysowania siatki na poczatku strony, a potem rysowania wierszy "nadpisujacych" te linie swoimi tlamib i paskami.

  Najlepsza strategia: rysowac linie siatki tuz po headerze miesiecznym, na cala dostepna wysokosc strony (do `pageH - margin`), a POTEM rysowac wiersze z ich tlami i paskami -- tla wierszy (rect fill) przykryja linie, ale same linie beda widoczne w przerwach. W efekcie paski beda NA WIERZCHU linii siatki.

