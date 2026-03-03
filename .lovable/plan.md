

# Rekomendacje i plan ulepszen backupu / przywracania

## Analiza stanu obecnego

**Co dziala:**
- Eksport JSON (wszystkie tabele) -- ale dostepny dla kazdego zalogowanego (brak sprawdzania roli w data-export)
- Import JSON -- tylko admin (sprawdzane w data-import)
- Soft-delete + przywracanie z UI -- ale dostepne dla kazdego zalogowanego (brak roli)
- Audit log -- rejestruje operacje przez triggery DB

**Glowne luki:**
1. **Eksport nie sprawdza roli** -- kazdy zalogowany moze pobrac caly backup
2. **Przywracanie (restore) nie sprawdza roli** -- kazdy moze przywrocic usuniety rekord
3. **Brak automatycznego backupu** -- tylko reczny przycisk
4. **Brak integralnosci** -- backup JSON bez checksum/podpisu
5. **Brak offsite storage** -- backup leci tylko do przegladarki uzytkownika
6. **Brak historii backupow** -- nie wiadomo kto/kiedy pobral backup

---

## Co mozna wdrozyc w Lovable (realistycznie)

Nie wszystko z rekomendacji "enterprise" da sie zrobic w Lovable Cloud (brak dostepu do pg_dump, WAL, S3 IAM, Object Lock). Ponizej plan tego co JEST mozliwe:

### 1. Ograniczenie eksportu/przywracania do admina (~5 kredytow)

**data-export**: dodac sprawdzanie roli admin (tak jak w data-import)
**BackupSection UI**: przywracanie (`handleRestore`) -- ograniczyc do admina, dodac wpis do audit_log

### 2. Checksum backupu (SHA-256 hash) (~10 kredytow)

- Edge function `data-export` generuje SHA-256 hash calego JSON
- Hash dolaczany w metadanych backupu + wyswietlany w UI
- Przy imporcie (`data-import`) weryfikacja checksum -- jesli sie nie zgadza = odrzucenie

### 3. Automatyczny backup do Storage (~15-20 kredytow)

- Nowa edge function `scheduled-backup` ktora:
  - Eksportuje dane (jak data-export)
  - Zapisuje JSON do storage bucket `backups` (prywatny)
  - Zapisuje metadane (checksum, rozmiar, timestamp) do nowej tabeli `backup_history`
- Cron job (pg_cron + pg_net) uruchamiany co 24h
- UI w BackupSection: lista ostatnich backupow z mozliwoscia pobrania

### 4. Retencja backupow (~5 kredytow)

- Tabela `backup_history` z kolumnami: id, created_at, file_path, checksum, size_bytes, status
- Edge function lub DB function czyszczaca stare backupy (>30 dni)

### 5. Alerty o bledach backupu (~5 kredytow)

- Jesli scheduled-backup sie nie powiedzie -- notyfikacja do admina (tabela notifications)

### 6. Potwierdzenie przywracania w audit log (~3 kredyty)

- Kazde przywrocenie (restore) -- explicite wpisywane do audit_log z poziomu kodu (nie tylko trigger)
- Wyswietlanie kto przywrocil w UI audit log

---

## Czego NIE da sie zrobic w Lovable Cloud

- pg_dump / WAL archiving (brak dostepu do Postgres CLI)
- Object Lock / immutability (brak dostepu do konfiguracji storage na tym poziomie)
- Multi-region offsite (storage jest w jednym regionie)
- Szyfrowanie AES-256 po stronie serwera z wlasnym KMS (mozna natomiast robic prosty hash/podpis)
- Dedykowane IAM role do zapisu/odczytu backupow

---

## Plan implementacji (szacunkowo ~40-45 kredytow)

### Krok 1: Zabezpieczenie eksportu i przywracania
- `data-export`: dodac sprawdzanie roli admin (identycznie jak w data-import)
- `BackupSection`: przywracanie widoczne tylko dla admina
- Eksport widoczny tylko dla admina

### Krok 2: Checksum w backupie
- `data-export`: generowac SHA-256 hash, dolaczac w JSON
- `data-import`: weryfikowac hash przy imporcie

### Krok 3: Storage bucket + tabela backup_history
- Migracja: tabela `backup_history` (id, created_at, file_path, checksum, size_bytes, type, user_id)
- Storage bucket `backups` (prywatny) z RLS
- Edge function `scheduled-backup`: eksport + zapis do storage + wpis do backup_history

### Krok 4: Cron job
- Wlaczenie pg_cron + pg_net
- Job co 24h wywolujacy `scheduled-backup`

### Krok 5: UI historii backupow
- W BackupSection: lista backupow z backup_history (data, rozmiar, checksum, przycisk "Pobierz")
- Alert jesli ostatni backup starszy niz 48h

### Krok 6: Czyszczenie starych backupow
- DB function lub edge function usuwajaca backupy starsze niz 30 dni (storage + tabela)

