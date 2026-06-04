# Frets

**Społecznościowy serwis z akordami i tabulaturami dla gitarzystów — z weryfikacją treści przez głosowanie, słownikiem akordów, stroikiem i gamifikacją.**

| | |
|---|---|
| **Uczelnia** | Uniwersytet Rzeszowski — Instytut Informatyki |
| **Kierunek** | Informatyka, II rok |
| **Przedmiot** | Programowanie Obiektowe 2 (2025/2026) |
| **Prowadzący** | mgr inż. Wojciech Gałka |
| **Autor** | Radosław Misiołek — nr albumu 134950 |
| **Miejsce, rok** | Rzeszów, 2026 |

---

## Spis treści
1. [O aplikacji](#1-o-aplikacji)
2. [Stos technologiczny](#2-stos-technologiczny)
3. [Architektura rozwiązania](#3-architektura-rozwiązania)
4. [Model danych](#4-model-danych)
5. [Publikacja piosenek i głosowanie społeczności](#5-publikacja-piosenek-i-głosowanie-społeczności)
6. [System gamifikacji](#6-system-gamifikacji)
7. [Przegląd interfejsu](#7-przegląd-interfejsu)
8. [Instalacja i uruchomienie](#8-instalacja-i-uruchomienie)
9. [Konfiguracja](#9-konfiguracja)
10. [Ograniczenia](#10-ograniczenia)
11. [Scenariusze testowe](#11-scenariusze-testowe)

---

## 1. O aplikacji

Frets to aplikacja webowa dla osób grających na gitarze. Skupia w jednym miejscu trzy rzeczy, które gitarzysta zwykle szuka po wielu różnych stronach: **bazę piosenek** (w zapisie akordowym i tabulaturowym), **naukę i słownik akordów** oraz **narzędzia praktyczne** (stroik, ćwiczenie akordów z mikrofonu).

Treść tworzą sami użytkownicy, dlatego o jej jakość dba społeczność. Mechanizm przypomina znany z platform programistycznych model *pull requestów*: każdy zalogowany użytkownik może dodać nową piosenkę lub zaproponować poprawkę istniejącej wersji, a o jej publikacji decyduje **ważone głosowanie**. Aby zachęcić do regularnej aktywności, aplikacja nalicza **punkty doświadczenia (XP)**, podnosi **poziomy** i prowadzi **serie dni**.

**Najważniejsze funkcje:**
- baza piosenek z czystymi adresami URL (`/songs/artysta/tytuł`),
- dwa wizualne edytory treści — akordy nad tekstem oraz tabulatura,
- weryfikacja treści przez głosowanie (z wagami zależnymi od poziomu gracza),
- słownik akordów z interaktywnymi diagramami,
- ćwiczenie akordów z rozpoznawaniem dźwięku (Web Audio API),
- wbudowany stroik gitarowy,
- XP, poziomy i serie dni,
- panel administratora.

> Zakres instrumentu: **gitara sześciostrunowa w stroju standardowym (EADGBe)**.

## 2. Stos technologiczny

| Warstwa | Technologie |
|---------|-------------|
| **Backend** | C# / .NET 10 (Web API), Entity Framework Core, Npgsql |
| **Baza danych** | PostgreSQL (Supabase, Transaction Pooler) |
| **Bezpieczeństwo** | JWT (Bearer), BCrypt, FluentValidation |
| **Pozostałe usługi** | MailKit + Mailtrap (poczta), Swagger / OpenAPI |
| **Frontend** | Vite + React 19, react-router-dom, react-bootstrap, axios |
| **Domena muzyczna** | `@tombatossals/chords-db`, `@techies23/react-chords`, Web Audio API |

**Dlaczego takie wybory:**
- **.NET 10 + EF Core** — silne typowanie, czytelny podział na warstwy zgodny z OOP, migracje i seedowanie wykonywane automatycznie przy starcie.
- **PostgreSQL na Supabase** — relacyjna baza w chmurze działająca „od razu" po sklonowaniu; kolumny `jsonb` pozwalają elastycznie przechowywać treść wersji (akordy/taby) bez sztywnego schematu.
- **JWT + BCrypt** — bezstanowe uwierzytelnianie tokenem i bezpieczne hashowanie haseł.
- **React 19 + Vite** — szybki dev-server i nowoczesny model komponentowy; stan logowania trzymany w prostym **Context API** (bez React Query), co ułatwia wytłumaczenie działania.
- **chords-db / react-chords** — gotowy słownik palcowań i renderer diagramów akordów.
- **Web Audio API** — analiza wysokości dźwięku w przeglądarce (stroik oraz ocena zagranego akordu), bez instalowania czegokolwiek.

## 3. Architektura rozwiązania

Projekt dzieli się na dwie niezależnie uruchamiane aplikacje: **REST API** (.NET) oraz **klienta SPA** (React) komunikujących się przez JSON z tokenem JWT. Backend zbudowano w **architekturze warstwowej (Clean Architecture)** rozbitej na trzy projekty:

| Projekt | Odpowiedzialność |
|---------|------------------|
| `Frets.Api` | warstwa prezentacji — kontrolery, konfiguracja, middleware |
| `Frets.Core` | encje domenowe, DTO, walidatory |
| `Frets.Infrastructure` | dostęp do danych (`AppDbContext`) i serwisy domenowe |

```mermaid
graph TD
    U([Użytkownik]) --> SPA["Klient SPA<br/>Vite · React 19 · Context API"]
    SPA -->|"axios + interceptor JWT"| API["Frets.Api<br/>Kontrolery REST"]
    API -->|"walidacja: FluentValidation"| SVC["Serwisy domenowe<br/>Frets.Infrastructure"]
    SVC -->|"zapytania LINQ"| EF["EF Core<br/>AppDbContext"]
    EF -->|"SQL / Npgsql"| DB[("PostgreSQL<br/>Supabase")]
    SVC -.->|"JWT · BCrypt · MailKit"| X["Usługi przekrojowe"]
    API -.->|"dokumentacja"| SW[["Swagger / OpenAPI"]]
```

**Serwisy domenowe** (wstrzykiwane przez wbudowany kontener DI, `AddScoped`):
`AuthService`, `SongService`, `SuggestionService`, `ChordService`, `UserService`, `ArtistService`, `XpService`, `ImageService`, `ChordIndexer`.

**Decyzje projektowe warte podkreślenia:**
- **Rozdział warstw** — kontrolery nie zawierają logiki domenowej; cała logika żyje w serwisach `Frets.Infrastructure`, a dane przepływają przez DTO z `Frets.Core`.
- **Centralny `XpService`** — jedno miejsce z wartościami XP i przeliczaniem poziomów, używane przez wiele serwisów (brak rozproszonej, powielonej logiki).
- **`chordId` zamiast samej nazwy akordu** w treści wersji — gwarantuje integralność i poprawne indeksowanie (funkcja „Mogę zagrać"), eliminując niejednoznaczne nazwy.
- **`ChordIndexer`** — przy zapisie/zatwierdzeniu wersji buduje indeks użytych akordów (`version_chord_index`), na którym opiera się dopasowanie piosenek do umiejętności gracza.
- **Soft delete** (`IsDeleted`, `DeletedAt`) dla użytkowników i piosenek — rekordy nie znikają fizycznie.
- **Potwierdzenie e-maila** jako twardy warunek logowania — ogranicza fałszywe konta.
- **Czyste adresy URL z artystą** (`/songs/:artist/:title`) zamiast identyfikatorów liczbowych.

## 4. Model danych

Schemat zdefiniowano w `AppDbContext`. Poniżej tabele pogrupowane funkcjonalnie; relacje wiele-do-wielu realizują tabele pośredniczące/indeksujące.

![Schemat bazy danych](Assets/README/db-erd.png)

### 4.1. Konta i gamifikacja
- **`users`** — `Id`, `Username`, `Slug`, `Email` (login, unikalny), `PasswordHash` (BCrypt), `Role` (`user`/`admin`), `Bio`, `Level`, `Xp`, `CurrentStreak`, `LongestStreak`, `LastActivityDate`, `EmailConfirmed`, `CreatedAt`, `IsDeleted`, `DeletedAt`.
- **`xp_events`** — historia naliczeń: `UserId`, `EventType` (np. `daily_login`, `song_added`, `song_approved`), `XpAmount`, `CreatedAt`.
- **`level_thresholds`** — progi XP kolejnych poziomów (10 poziomów, 0–5000 XP).
- **`user_chord_progress`** — `UserId`, `ChordId`, `MasteryLevel` (`new`/`practiced`/`mastered`).

### 4.2. Piosenki i wersje
- **`artists`** — `Id`, `Name`, `Slug` (artysta jako osobny byt, slug w URL).
- **`songs`** — `Id`, `Title`, `TitleSlug`, `ArtistId`, `Genre`, `CategoryId`, `AuthorId`, `Status` (`draft`/`pending`/`approved`/`rejected`), `StatusChangedAt`, `SubmittedAt`, `YouTubeUrl`, `IsDeleted`, `DeletedAt`.
- **`song_versions`** — `Id`, `SongId`, `VersionType` (`chords`/`tab`), `Tuning`, `TuningId`, `Key`, `Capo`, `CreatedAt`.
- **`version_chords`** / **`version_tabs`** — `Id`, `VersionId`, `Content` (`jsonb` — treść wersji).
- **`version_chord_index`** — `VersionId`, `ChordId`; napędza funkcję „piosenki, które możesz zagrać".
- **`categories`** — `Id`, `Name`, `Slug` (gatunki); **`tunings`** — `Id`, `Name`, `Code`, `IsActive` (stroje).

### 4.3. Słownik akordów
- **`chords`** — `Id`, `Key`, `Suffix`. Minimalny zapis akordu; pełne palcowania (frets/fingers) front pobiera z `chords-db` do rysowania diagramów. Seedowane przy starcie.

### 4.4. Głosowanie i propozycje zmian
- **`song_votes`** — `SongId`, `UserId`, `IsPositive`, `VoteWeight`, `VotedAt`; jeden (zmienialny) głos na parę piosenka–użytkownik.
- **`version_suggestions`** — `VersionId`, `AuthorId`, `Content` (`jsonb`), `Comment`, `Status` (`pending`/`approved`/`rejected`), `CreatedAt`, `ReviewedAt`.
- **`suggestion_votes`** — głosy na propozycje (analogicznie do `song_votes`).

### 4.5. Obrazy i tokeny
- **`images`** — `StoragePath`, `ContentType`, `FileSizeBytes`, `SystemKey`, `CreatedAt`.
- **`artist_images`** / **`user_profile_images`** — przypisanie zdjęć do artystów/użytkowników.
- **`password_reset_tokens`** / **`email_confirmation_tokens`** / **`email_change_tokens`** — `Token`, `UserId`, `ExpiresAt`, `Used` (+ `NewEmail` przy zmianie e-maila).

## 5. Publikacja piosenek i głosowanie społeczności

Każda nowa piosenka przechodzi przez cykl statusów, a o jej publikacji decyduje społeczność:

```
draft ──► pending ──► approved   gdy ≥ 80% głosów pozytywnych przy ≥ 10 głosach ważonych
                  └─► rejected   gdy < 80% pozytywnych po osiągnięciu 30 głosów ważonych
```

- **Wagi głosów** zależą od poziomu gracza: poziom 1–4 → waga **1**, poziom 5–9 → waga **2**, poziom 10+ → waga **3**.
- **Jeden głos na piosenkę** (można go zmienić). Autor **nie może głosować na własną** piosenkę ani propozycję.
- **Administrator** może ręcznie zatwierdzić lub odrzucić treść, nadpisując wynik głosowania.
- **Propozycje poprawek** podlegają temu samemu mechanizmowi — po zatwierdzeniu nadpisują treść wersji i odświeżają indeks akordów. Pozycje zatwierdzone/odrzucone znikają z listy „Opracowania".

## 6. System gamifikacji

### 6.1. Punkty doświadczenia (XP)
| Zdarzenie | XP |
|-----------|----|
| Logowanie dzienne | +10 |
| Bonus za serię (co 7 dni) | +25 |
| Opanowanie akordu (`mastered`) | +30 |
| Dodanie piosenki | +20 |
| Zatwierdzenie piosenki | +50 |

XP za akord nalicza się **tylko przy pierwszym** przejściu na poziom `mastered` (zabezpieczenie przed nabijaniem punktów).

### 6.2. Poziomy i serie
- **10 poziomów** (od *Beginner* do *Virtuoso*) z rosnącym progiem XP (0 → 5000).
- **Seria (streak)** liczona przy logowaniu; zapisywana jest też najdłuższa osiągnięta seria.

## 7. Przegląd interfejsu

Aplikacja działa w **ciemnym motywie** z fioletowym akcentem.

### 7.1. Strona główna
Niezalogowani widzą baner *hero* z zachętą do rejestracji; zalogowani — spersonalizowany widżet statystyk (avatar, powitanie, poziom, pasek „XP do awansu", seria, liczniki). Poniżej lista piosenek z avatarem artysty, wyszukiwarką, filtrami gatunków oraz filtrem **„Mogę zagrać"** (piosenki złożone wyłącznie z opanowanych akordów).

![Strona główna — gość](Assets/README/home-guest.png)
*Rys. 1: Strona główna (widok niezalogowanego — baner hero).*

![Strona główna — zalogowany](Assets/README/home-user.png)
*Rys. 2: Strona główna z widżetem statystyk i listą piosenek.*

### 7.2. Rejestracja i logowanie
Rejestracja wymaga potwierdzenia e-maila (link ważny 24 h); logowanie jest zablokowane do czasu potwierdzenia. Reset hasła odbywa się przez e-mail z jednorazowym tokenem (ważny 1 h). Wymagania hasła: min. 8 znaków, wielka i mała litera oraz cyfra.

![Rejestracja](Assets/README/register.png)
*Rys. 3: Formularz rejestracji.*

![Logowanie](Assets/README/login.png)
*Rys. 4: Formularz logowania.*

### 7.3. Strona piosenki
Nagłówek z avatarem artysty, tytułem, linkiem do profilu autora opracowania oraz przyciskiem „Zaproponuj poprawkę". Wersja akordowa pokazuje **diagramy użytych akordów** i **akordy nad tekstem**; tabulatura korzysta z **wizualnego renderera** (numery progów na liniach strun, kreski taktów, sekcje) zawijanego do szerokości ekranu, z przełącznikiem **Wizualnie/Tekst**.

![Strona piosenki — akordy](Assets/README/song-chords.png)
*Rys. 5: Piosenka z akordami nad tekstem i diagramami.*

![Strona piosenki — tabulatura](Assets/README/song-tab.png)
*Rys. 6: Wizualna tabulatura.*

### 7.4. Dodawanie piosenki
Formularz (tytuł, wykonawca, gatunek, YouTube) wraz z pierwszą wersją. Treść tworzy się w wizualnych edytorach:
- **akordy** — pole tekstu z podświetlaniem rozpoznanych akordów nad liniami,
- **tabulatura** — siatka kolumnowa (wpisywanie progów, „Zakończ takt", „Nowa sekcja").

Formularz ostrzega przed utratą niezapisanych zmian przy próbie opuszczenia strony.

![Dodawanie piosenki — akordy](Assets/README/add-song-chords.png)
*Rys. 7: Edytor wersji akordowej.*

![Dodawanie piosenki — tabulatura](Assets/README/add-song-tab.png)
*Rys. 8: Wizualny edytor tabulatury.*

### 7.5. Opracowania i propozycje zmian
Lista nowych piosenek czekających na publikację oraz poprawek do istniejących wersji (z filtrami i wyszukiwarką). Pojedynczy szkic udostępnia panel głosowania oraz akcje administratora. Strona propozycji pozwala edytować treść i głosować na zmiany.

![Opracowania](Assets/README/drafts.png)
*Rys. 9: Lista opracowań (nowe piosenki i poprawki).*

![Strona szkicu](Assets/README/draft.png)
*Rys. 10: Głosowanie nad szkicem piosenki.*

![Propozycje poprawek](Assets/README/suggestions.png)
*Rys. 11: Propozycje zmian do wersji.*

### 7.6. Akordy i nauka
Przeglądanie: wybór tonacji → rodzina akordów → diagramy. Tryb nauki sprawdza zagranie akordu **po mikrofonie** (struna po strunie) i pozwala oznaczyć poziom opanowania.

![Akordy](Assets/README/chords.png)
*Rys. 12: Przeglądarka akordów (rodziny i diagramy).*

![Nauka akordu](Assets/README/practice.png)
*Rys. 13: Ćwiczenie akordu z użyciem mikrofonu.*

### 7.7. Stroik
Stroik gitarowy oparty o Web Audio API — wykrywa wysokość dźwięku i pokazuje odchylenie w centach względem najbliższej struny stroju standardowego.

![Stroik](Assets/README/tuner.png)
*Rys. 14: Stroik gitarowy.*

### 7.8. Artyści i profil
Lista artystów z wyszukiwarką oraz strona artysty z jego piosenkami. Profil użytkownika prezentuje statystyki (XP, poziom, seria), zakładki z piosenkami i szkicami oraz edycję danych i bezpieczeństwa konta.

![Artyści](Assets/README/artists.png)
*Rys. 15: Lista artystów.*

![Profil](Assets/README/profile.png)
*Rys. 16: Profil użytkownika ze statystykami.*

### 7.9. Panel administratora
Trzy zakładki: **Piosenki** (zatwierdzanie/odrzucanie wg statusu), **Użytkownicy** (przegląd, wyszukiwanie po nazwie/e-mailu, soft delete), **Artyści** (przegląd, wyszukiwanie, zmiana zdjęcia).

![Panel administratora](Assets/README/admin-songs.png)
*Rys. 17: Panel administratora - piosenki.*

![Panel administratora](Assets/README/admin-users.png)
*Rys. 17: Panel administratora - użytkownicy.*

![Panel administratora](Assets/README/admin-artists.png)
*Rys. 17: Panel administratora - artyści.*

## 8. Instalacja i uruchomienie

Aplikacja składa się z **API** (`Frets.Api`) i **klienta** (`Frets.Client`) uruchamianych równolegle. Konfiguracja połączenia z bazą i usługami znajduje się w `Frets.Api/appsettings.Development.json` — projekt działa „od razu" po sklonowaniu.

**Wymagania:**
- **.NET SDK 10.0**,
- **Node.js (LTS) + npm**,
- dostęp do internetu (baza PostgreSQL hostowana na Supabase).

**Backend (API):**
```bash
cd Frets.Api
dotnet run
```
- API startuje na `http://localhost:5041`.
- Przy starcie wykonują się **migracje EF Core** i **seedery** (akordy, progi poziomów, kategorie, stroje, domyślne obrazy).
- Swagger: `http://localhost:5041/swagger`.

**Frontend (klient):**
```bash
cd Frets.Client
npm install
npm run dev
```
- Klient startuje na `http://localhost:5173` (pod ten adres skonfigurowano CORS w API).

> W Visual Studio wystarczy uruchomić projekt `Frets.Api`, a klient odpalić poleceniem `npm run dev` w katalogu `Frets.Client`.

## 9. Konfiguracja

Kluczowe sekcje w `Frets.Api/appsettings.Development.json`:

| Sekcja | Znaczenie |
|--------|-----------|
| `ConnectionStrings:DefaultConnection` | łańcuch połączenia do PostgreSQL (Supabase) |
| `Jwt:Key` / `Issuer` / `Audience` / `ExpiryHours` | konfiguracja tokenów JWT |
| `Mail:*` | dane SMTP (Mailtrap) do wysyłki maili |
| `App:ClientBaseUrl` | adres klienta używany w linkach e-mail |

## 10. Ograniczenia

- **Maile testowe (Mailtrap):** wiadomości (potwierdzenie konta, reset hasła) trafiają do skrzynki sandbox Mailtrap, a nie na realne adresy — aby zalogować się po rejestracji, trzeba potwierdzić konto linkiem z Mailtrap.
- **Funkcje mikrofonowe (stroik, nauka akordów):** wymagają zgody na mikrofon i działają najlepiej w przeglądarkach opartych o Chromium.
- **Współdzielona baza w chmurze:** dane są wspólne dla wszystkich instancji korzystających z tej samej bazy Supabase.
- **Notacja akordów:** wspierana notacja standardowa (`Am`, `C`, `G7`) oraz polski zapis małą literą jako molowy (`a` → `Am`); pełna notacja niemiecka (`H`, `B`) nie jest interpretowana.

## 11. Scenariusze testowe

### 11.1. Rejestracja i logowanie
1. Wejdź w **Rejestracja**, podaj nazwę, e-mail i hasło spełniające wymagania (np. `Test1234`).
2. Otwórz skrzynkę **Mailtrap** i kliknij link potwierdzający konto.
3. Zaloguj się — na stronie głównej powinien pojawić się widżet statystyk (z naliczonym XP za logowanie).

### 11.2. Dodanie piosenki (akordy + tabulatura)
1. Kliknij **Dodaj piosenkę**, podaj tytuł, wykonawcę i gatunek.
2. W edytorze akordów wpisz linie tekstu z akordami; opcjonalnie dodaj nagłówki sekcji.
3. Zapisz i sprawdź, czy na stronie piosenki akordy renderują się nad tekstem i pojawiły się diagramy.
4. Dodaj drugą wersję typu **tabulatura**, użyj „Zakończ takt"/„Nowa sekcja", zapisz i zweryfikuj wizualny renderer oraz przełącznik Wizualnie/Tekst.

### 11.3. Głosowanie i propozycje zmian
1. Innym kontem zagłosuj na szkic w **Opracowaniach** i sprawdź zmianę wagi/statusu.
2. Na zatwierdzonej piosence kliknij **Zaproponuj poprawkę**, zmień treść, dodaj komentarz i wyślij.
3. Zweryfikuj, że propozycja podlega głosowaniu, a po zatwierdzeniu nadpisuje treść wersji i znika z Opracowań.

### 11.4. Nauka, „Mogę zagrać" i stroik
1. W **Akordach** wybierz tonację, otwórz ćwiczenie akordu (mikrofon) i oznacz akord jako opanowany.
2. Na stronie głównej włącz filtr **„Mogę zagrać"** — powinny pojawić się piosenki złożone z opanowanych akordów.
3. Otwórz **Stroik**, zezwól na mikrofon i zagraj strunę — sprawdź wskazania.

### 11.5. Panel administratora
1. Zaloguj się kontem z rolą **admin**.
2. W zakładce **Piosenki** zatwierdź szkic i sprawdź, że trafia do opublikowanych oraz znika z Opracowań.
3. W zakładkach **Użytkownicy** i **Artyści** przetestuj wyszukiwarki.
