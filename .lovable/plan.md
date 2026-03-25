

# Analiza i Projekt Struktury Ról i Uprawnień

## Część 1: Weryfikacja obecnego modelu

### Obecna architektura ról

System używa **dwóch tabel** do zarządzania rolami:
- `user_roles` — jedna globalna rola per użytkownik (`super_admin`, `org_admin`, `admin`, `manager`, `user`, `viewer`)
- `organization_members` — przypisanie użytkownika do firmy z polem `org_role`

### Odpowiedzi na pytania weryfikacyjne

**1. Czy Super Admin nadaje uprawnienia Admina osobno dla każdej firmy?**

**NIE.** Rola w `user_roles` jest globalna — jeden wpis na użytkownika. Zmiana roli na `org_admin` w `RolesManagementView` ustawia ją globalnie, nie w kontekście konkretnej firmy. Pole `org_role` w `organization_members` istnieje, ale nie jest używane do kontroli dostępu w kodzie frontendowym.

**2. Czy Admin firmy X może zarządzać wyłącznie użytkownikami swojej firmy?**

**NIE.** `useIsAdmin()` sprawdza globalną rolę (`admin || super_admin || org_admin`). `UsersView` używa `useProfiles()` i `useUserRoles()`, które pobierają dane na podstawie RLS — więc dane są ograniczone do firmy, ALE logika uprawnień nie sprawdza, czy użytkownik jest adminem **tej konkretnej** firmy. Użytkownik z rolą `org_admin` w firmie X, gdyby miał członkostwo w firmie Y, mógłby potencjalnie zarządzać użytkownikami firmy Y.

**3. Czy Admin firmy może tworzyć konta, nadawać/odbierać uprawnienia?**

- **Tworzyć konta**: NIE — tworzenie kont wymaga `supabase.auth.admin.createUser()`, co jest dostępne tylko w edge function `create-org-user`, zabezpieczonej wyłącznie dla `super_admin`.
- **Nadawać/odbierać uprawnienia**: CZĘŚCIOWO — `UsersView` pozwala zmieniać role, ale zmienia globalną rolę w `user_roles`, nie rolę w kontekście firmy.
- **Zarządzanie swoim obszarem**: CZĘŚCIOWO — RLS izoluje dane, ale brak walidacji "czy jestem adminem **tej** firmy".

### Zidentyfikowane luki i problemy

| # | Problem | Szczegóły |
|---|---------|-----------|
| 1 | **Rola globalna zamiast per-firma** | `user_roles.role` to jedna wartość globalna. Użytkownik nie może być adminem firmy X i zwykłym userem firmy Y |
| 2 | **`org_role` nieużywany w logice** | `organization_members.org_role` istnieje, ale `useIsAdmin()`, `useCanEdit()` i cała logika UI czyta z `user_roles`, ignorując `org_role` |
| 3 | **Admin nie tworzy kont** | Edge function `create-org-user` wymaga `super_admin` — org_admin nie ma tej możliwości |
| 4 | **Brak walidacji kontekstu firmy** | `useIsAdmin()` nie sprawdza, czy użytkownik jest adminem w kontekście **aktualnie wybranej** firmy |
| 5 | **`useSetUserRole` zmienia globalną rolę** | Zmiana roli w `UsersView` operuje na `user_roles`, nie `organization_members.org_role` |

---

## Część 2: Nowa proponowana struktura

### Model docelowy

```text
┌─────────────────────────────────────────────┐
│               SUPER ADMIN                    │
│  (rola globalna w user_roles)               │
│  → widzi wszystko, zarządza firmami          │
└──────────────┬──────────────────────────────┘
               │ tworzy firmy, przypisuje adminów
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│Firma X │ │Firma Y │ │Firma Z │
└───┬────┘ └───┬────┘ └───┬────┘
    │          │          │
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│org_admin│ │org_admin│ │org_admin│  ← role per firma
│manager  │ │user    │ │manager  │     (organization_members.org_role)
│user     │ │viewer  │ │user     │
│viewer   │ └────────┘ └────────┘
└────────┘
```

### Zasady kluczowe

1. **`user_roles`** — tylko dla `super_admin`. Zwykli użytkownicy NIE potrzebują wpisu tutaj.
2. **`organization_members.org_role`** — jedyne źródło uprawnień w kontekście firmy (`org_admin`, `manager`, `user`, `viewer`).
3. **Jeden użytkownik, wiele firm** — użytkownik może mieć różne role w różnych firmach.
4. **Admin firmy = `org_role === 'org_admin'` w `organization_members`** — NIE globalna rola.

### Nowa logika uprawnień

```text
Pytanie: "Czy użytkownik może X?"

1. Czy jest super_admin? (user_roles) → TAK → może wszystko
2. Jaka jest jego org_role w AKTUALNEJ firmie? (organization_members)
   → org_admin: zarządza użytkownikami, rolami, danymi firmy
   → manager: edytuje dane biznesowe (aktywności, plany)
   → user: edytuje przypisane dane
   → viewer: tylko odczyt
```

### Zmiany w bazie danych

Nie trzeba zmieniać schematu — `organization_members.org_role` już istnieje. Trzeba:
- Przestać używać `user_roles` do czegokolwiek poza `super_admin`
- Zbudować nową funkcję `get_org_role()` (już istnieje w DB!) i używać jej w kodzie

### Zmiany w kodzie (zakres implementacji)

**Krok 1: Nowe hooki uprawnień**
- `useMyOrgRole()` — pobiera `org_role` z `organization_members` dla aktualnej firmy
- Przepisać `useIsAdmin()` → sprawdza `super_admin` LUB `org_role === 'org_admin'` w kontekście aktualnej firmy
- Przepisać `useCanEdit()` → sprawdza `org_role !== 'viewer'`

**Krok 2: Admin firmy może zarządzać użytkownikami**
- Nowa edge function `create-org-member` — dostępna dla `org_admin` danej firmy (nie tylko super_admin)
- `UsersView` — zmiana roli operuje na `organization_members.org_role`, NIE na `user_roles`
- Admin firmy widzi tylko użytkowników swojej firmy (już działa przez RLS)

**Krok 3: Aktualizacja UI i walidacji**
- `RolesManagementView` (Super Admin) — pokazuje role per firma, nie globalnie
- `UsersView` (Org Admin) — zarządzanie rolami w kontekście firmy
- `SettingsView`, `MfaSetup`, `AppContext` — zamiana `useMyRole()` na `useMyOrgRole()` gdzie potrzeba

---

## Część 3: Przykładowe scenariusze

**Scenariusz 1**: Super Admin tworzy firmę X
→ `organizations.insert(...)` → Super Admin przypisuje użytkownika J jako `org_admin` w `organization_members`

**Scenariusz 2**: Admin firmy X tworzy użytkownika
→ Edge function `create-org-member` sprawdza: czy caller ma `org_role = 'org_admin'` w firmie X? → TAK → tworzy konto, dodaje do `organization_members` z wybraną rolą

**Scenariusz 3**: Admin firmy X próbuje zarządzać firmą Y
→ `organization_members` nie ma wpisu dla tego użytkownika w firmie Y → brak dostępu (RLS + walidacja w kodzie)

**Scenariusz 4**: Użytkownik w dwóch firmach
→ Jan: `org_admin` w firmie X, `viewer` w firmie Y → po przełączeniu kontekstu firmy zmienia się jego zakres uprawnień

---

## Podsumowanie zmian

| Warstwa | Obecny stan | Docelowy stan |
|---------|-------------|---------------|
| Źródło uprawnień | `user_roles` (globalne) | `organization_members.org_role` (per firma) |
| `user_roles` | Wszystkie role | Tylko `super_admin` |
| `useIsAdmin()` | Sprawdza globalną rolę | Sprawdza `org_role` w aktualnej firmie |
| Tworzenie kont | Tylko super_admin | super_admin + org_admin (w swojej firmie) |
| Zmiana ról | Globalna zmiana w `user_roles` | Zmiana `org_role` w `organization_members` |
| Wielofirmowość | Jedna rola dla wszystkich firm | Różna rola per firma |

