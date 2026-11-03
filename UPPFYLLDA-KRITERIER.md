# Uppfyllda kriterier – StayFinder (G-nivå)

Detta dokument redovisar hur samtliga **16 G-kriterier (G1–G16)** är implementerade i projektets backend (`stay-finder-be`), frontend (`stay-finder-fe`) och databas (`supabase/rls_policies_g.sql`).

---

## Översikt av kriterier (G1–G16)

| Kriterium | Status | Kort sammanfattning |
| :--- | :---: | :--- |
| **G1** | **PASS** | Skapa konto (`POST /auth/register`), logga in (`POST /auth/login`) och logga ut (`POST /auth/logout`). |
| **G2** | **PASS** | Session sparas i `HttpOnly`-cookies, återställs via `GET /auth/me` vid sidomladdning och visas i `Navbar`. |
| **G3** | **PASS** | Navigeringen (`Navbar.tsx`) visar olika länkar och knappar beroende på om användaren är inloggad eller utloggad. |
| **G4** | **PASS** | Alla kan se boendelistan på `/` och detaljsidan på `/properties/[id]` via öppna `GET`-endpoints. |
| **G5** | **PASS** | Boendelistan kan filtreras på plats (`location`), maxpris (`maxprice`) och antal gäster (`maxguests`). |
| **G6** | **PASS** | Endast inloggade användare kan skapa, ändra och ta bort boenden – skyddat både i API:t (`requireAuth`) och i databasen (RLS). |
| **G7** | **PASS** | Inloggade användare kan skapa ett nytt boende via formuläret på `/properties/new`. |
| **G8** | **PASS** | Boendelistan kan sorteras på pris stigande (`?sort=asc`) och fallande (`?sort=desc`) i backend. |
| **G9** | **PASS** | Inloggade användare kan boka från detaljsidan; utloggade besökare uppmanas att logga in med länk till `/login`. |
| **G10** | **PASS** | Ogiltiga bokningsuppgifter (ogiltig e-post, 0 gäster, incheckning efter utcheckning) nekas med `400` och visas tydligt i formuläret. |
| **G11** | **PASS** | Bokningsformuläret räknar ut och visar antal nätter och totalpris innan bokningen skickas. |
| **G12** | **PASS** | Inloggade användare kan se (`GET`), ändra (`PATCH`) och ta bort (`DELETE`) bokningar för ett boende. |
| **G13** | **PASS** | Appen visar laddningsvy, felvy vid server-/nätverksfel samt en egen 404-sida när ett boende inte finns. |
| **G14** | **PASS** | API:t svarar med rätt statuskod: `200`, `201`, `400`, `401`, `404` samt `500` vid oväntade fel. |
| **G15** | **PASS** | Databasen skyddar `properties` och `bookings` med Row Level Security (RLS) i Supabase. |
| **G16** | **PASS** | All data är strikt typad med TypeScript i både backend och frontend utan användning av `any`. |

---

## Detaljerad genomgång per kriterium

### Konto och inloggning                                                                                            

#### G1. En besökare kan skapa ett konto, logga in och logga ut.
- **Status:** **PASS**
- **Förklaring:**
  Besökare kan registrera ett nytt konto och logga in på `/login` genom att växla mellan lägena "Logga in" och "Skapa konto". Backend validerar e-post och lösenord med Zod (`authValidator`) och anropar Supabase Auth (`signUp`, `signInWithPassword`, `signOut`). Utloggning sker via knappen "Logga ut" i navigeringen som anropar `POST /auth/logout` och nollställer användar-state.
- **Bevis i koden:**
  - Backend: `stay-finder-be/src/routes/auth.ts` (`POST /auth/register`, `POST /auth/login`, `POST /auth/logout`), `stay-finder-be/src/database/auth.ts`, `stay-finder-be/src/validators/authValidator.ts`
  - Frontend: `stay-finder-fe/src/app/login/page.tsx`, `stay-finder-fe/src/context/AuthContext.tsx`, `stay-finder-fe/src/components/Navbar.tsx`

---

#### G2. Inloggningen finns kvar när sidan laddas om, och appen kan alltid visa vem som är inloggad.
- **Status:** **PASS**
- **Förklaring:**
  Vid inloggning sätter backend `HttpOnly`-cookies via `@supabase/ssr` i `createSupabaseForRequest`. Alla `fetch`-anrop i frontenden skickar med cookies via `credentials: "include"`. När sidan laddas om körs `useEffect` i `AuthContext.tsx` som anropar `GET /auth/me` och återställer den inloggade användaren. I `Navbar.tsx` visas alltid `Inloggad som: {user.email}`.
- **Bevis i koden:**
  - Backend: `stay-finder-be/src/middleware/auth.ts` (`createSupabaseForRequest`), `stay-finder-be/src/routes/auth.ts` (`GET /auth/me`), `stay-finder-be/src/index.ts` (CORS med `credentials: true`)
  - Frontend: `stay-finder-fe/src/context/AuthContext.tsx` (`refreshUser`), `stay-finder-fe/src/lib/api.ts` (`apiGetMe`), `stay-finder-fe/src/components/Navbar.tsx`

---

#### G3. Navigeringen visar olika innehåll för en inloggad användare och en utloggad besökare.
- **Status:** **PASS**
- **Förklaring:**
  Komponenten `Navbar.tsx` kontrollerar `user` från `useAuth()`. För en inloggad användare visas länken `+ Skapa boende`, texten `Inloggad som: {user.email}` och knappen `Logga ut`. För en utloggad besökare visas istället texten `Ej inloggad` och knappen `Logga in / Skapa konto`.
- **Bevis i koden:**
  - Frontend: `stay-finder-fe/src/components/Navbar.tsx` (rad 55–94)

---

### Boenden

#### G4. Alla kan se en lista över boenden och en detaljsida för varje boende.
- **Status:** **PASS**
- **Förklaring:**
  Routen `GET /properties` och `GET /properties/:id` använder `optionalAuth` och är öppna även för utloggade besökare. I databasen tillåter RLS-policyn `properties_select_all` läsning (`SELECT`) för alla (`TO public`). Startsidan listar alla boenden och varje kort länkar till detaljsidan `/properties/[id]`.
- **Bevis i koden:**
  - Backend: `stay-finder-be/src/routes/properties.ts` (`GET /properties`, `GET /properties/:id`), `stay-finder-be/supabase/rls_policies_g.sql` (`properties_select_all`)
  - Frontend: `stay-finder-fe/src/app/page.tsx`, `stay-finder-fe/src/app/properties/[id]/page.tsx`

---

#### G5. Listan kan filtreras på plats, maxpris och antal gäster.
- **Status:** **PASS**
- **Förklaring:**
  På startsidan finns ett sökformulär för plats (`location`), maxpris per natt (`maxprice`) och minsta antal gäster (`maxguests`). Parametrarna skickas som query-parametrar till `GET /properties`, där `buildPropertiesFilter` filtrerar direkt i Supabase-frågan med `.ilike("location", ...)`, `.lte("price_per_night", ...)` och `.gte("max_guests", ...)`.
- **Bevis i koden:**
  - Backend: `stay-finder-be/src/routes/properties.ts` (`GET /properties`), `stay-finder-be/src/database/properties.ts` (`buildPropertiesFilter`)
  - Frontend: `stay-finder-fe/src/app/page.tsx` (rad 123–219), `stay-finder-fe/src/lib/api.ts` (`apiGetProperties`)

---

#### G6. Bara inloggade användare kan skapa, ändra och ta bort boenden. Det gäller både i API:t och i databasen.
- **Status:** **PASS**
- **Förklaring:**
  - **I API:t:** `POST /properties`, `PATCH /properties/:id` och `DELETE /properties/:id` är skyddade med middleware `requireAuth`, som stoppar utloggade anrop med `401 Unauthorized`.
  - **I databasen:** Row Level Security (RLS) är aktiverat på `public.properties` med policies som kräver `TO authenticated` och `auth.uid() IS NOT NULL` för `INSERT`, `UPDATE` och `DELETE`. Eftersom backend skapar Supabase-klienten med användarens request-cookies och publishable/anon-nyckeln gäller RLS-reglerna på alla databasfrågor.
  - **I frontenden:** Formuläret för att skapa boende samt knapparna för att ändra och ta bort boende visas bara för inloggade användare.
- **Bevis i koden:**
  - Backend: `stay-finder-be/src/routes/properties.ts` (rad 101–153), `stay-finder-be/src/middleware/auth.ts` (`requireAuth`), `stay-finder-be/supabase/rls_policies_g.sql` (rad 68–87)
  - Frontend: `stay-finder-fe/src/app/properties/new/page.tsx` (rad 43–60), `stay-finder-fe/src/app/properties/[id]/page.tsx` (rad 379–495)

---

#### G7. En inloggad användare kan skapa ett nytt boende via ett formulär i frontenden.
- **Status:** **PASS**
- **Förklaring:**
  Sidan `/properties/new` innehåller ett formulär där en inloggad användare fyller i titel, plats, boendetyp (`apartment` eller `villa`), pris per natt, max antal gäster och beskrivning. Vid inskickning anropas `POST /properties` och användaren skickas vidare till det nyskapade boendets detaljsida.
- **Bevis i koden:**
  - Frontend: `stay-finder-fe/src/app/properties/new/page.tsx`, `stay-finder-fe/src/lib/api.ts` (`apiCreateProperty`)
  - Backend: `stay-finder-be/src/routes/properties.ts` (`POST /properties`), `stay-finder-be/src/validators/propertyValidator.ts`

---

#### G8. Listan kan sorteras på pris, stigande eller fallande. Sorteringen görs i backend.
- **Status:** **PASS**
- **Förklaring:**
  Startsidan har en rullgardinsmeny för prissortering som skickar `?sort=asc` eller `?sort=desc` till `GET /properties`. Backend tolkar parametern med `parseSortOrder` och sorterar databasfrågan i Supabase med `.order("price_per_night", { ascending: true | false })`.
- **Bevis i koden:**
  - Backend: `stay-finder-be/src/routes/properties.ts` (`parseSortOrder`), `stay-finder-be/src/database/properties.ts` (`buildPropertiesFilter`, rad 60–64)
  - Frontend: `stay-finder-fe/src/app/page.tsx` (`handleSortChange`, rad 97–100 och 184–201)

---

### Bokningar

#### G9. En inloggad användare kan boka ett boende från detaljsidan. En utloggad besökare uppmanas att logga in.
- **Status:** **PASS**
- **Förklaring:**
  På detaljsidan (`/properties/[id]`) kontrolleras om `user` är inloggad. Är besökaren utloggad visas en tydlig uppmaning ("Du måste vara inloggad för att boka detta boende") och en knapp som leder till `/login`. Är användaren inloggad visas bokningsformuläret som skickar `POST /bookings/properties/:propertyId`.
- **Bevis i koden:**
  - Frontend: `stay-finder-fe/src/app/properties/[id]/page.tsx` (rad 696–841)
  - Backend: `stay-finder-be/src/routes/bookings.ts` (`POST /bookings/properties/:propertyId`)

---

#### G10. En bokning med ogiltiga uppgifter nekas, till exempel ogiltig e-post, noll gäster eller incheckning efter utcheckning. Felet visas begripligt i formuläret.
- **Status:** **PASS**
- **Förklaring:**
  I backend validerar `bookingValidator` (Zod) att gästens namn har minst 2 tecken, att `guest_email` är en giltig e-postadress, att `guests` är minst 1 samt via `.refine()` att `check_in < check_out`. Vid ogiltig data svarar API:t med `400 Bad Request` och en lista med felmeddelanden som `handleErrorResponse` i `api.ts` tolkar och visar i en röd felruta ovanför bokningsformuläret.
- **Bevis i koden:**
  - Backend: `stay-finder-be/src/validators/bookingValidator.ts`, `stay-finder-be/src/utils/validation.ts`
  - Frontend: `stay-finder-fe/src/lib/api.ts` (`handleErrorResponse`), `stay-finder-fe/src/app/properties/[id]/page.tsx` (`bookingError`, rad 713–717)

---

#### G11. Bokningsformuläret visar antal nätter och totalpris innan användaren bokar.
- **Status:** **PASS**
- **Förklaring:**
  Funktionen `calculateNights(checkIn, checkOut)` på detaljsidan räknar ut antalet nätter utifrån valda in- och utcheckningsdatum och multiplicerar med `property.price_per_night`. Både `Antal nätter` och `Totalpris` visas direkt i bokningsformuläret innan användaren klickar på "Boka nu".
- **Bevis i koden:**
  - Frontend: `stay-finder-fe/src/app/properties/[id]/page.tsx` (`calculateNights` på rad 43–51, uträkning på rad 340–341, visning i formuläret på rad 816–831)

---

#### G12. En inloggad användare kan se, ändra och ta bort bokningar för ett boende.
- **Status:** **PASS**
- **Förklaring:**
  På detaljsidan hämtas alla bokningar för det aktuella boendet via `GET /bookings/properties/:propertyId` när användaren är inloggad. Varje bokning har en "Ändra"-knapp (som öppnar ett redigeringsformulär för incheckning, utcheckning, antal gäster och status och sparar via `PATCH /bookings/properties/:propertyId/:bookingId`) samt en "Ta bort"-knapp (som anropar `DELETE /bookings/properties/:propertyId/:bookingId`).
- **Bevis i koden:**
  - Backend: `stay-finder-be/src/routes/bookings.ts`, `stay-finder-be/src/database/bookings.ts`
  - Frontend: `stay-finder-fe/src/app/properties/[id]/page.tsx` (rad 507–682)

---

### Kvalitet

#### G13. Appen visar en laddningsvy och en felvy när data hämtas, och en egen sida när ett boende inte finns.
- **Status:** **PASS**
- **Förklaring:**
  - **Laddningsvy:** Både startsidan och detaljsidan visar en laddningsspinner och text ("Laddar boenden..." / "Laddar boendets detaljer...") medan `loading` är `true`.
  - **Felvy:** Om hämtningen av boenden eller bokningar misslyckas (t.ex. statuskod `500` eller nätverksfel) visas en röd felvy med felmeddelande och en "Försök igen"-knapp.
  - **Egen 404-sida:** Om `GET /properties/:id` svarar med `404 Not Found` sätter frontenden `notFound = true` och visar en egen vy ("Boendet hittades inte (404)") med en knapp tillbaka till startsidan.
- **Bevis i koden:**
  - Frontend: `stay-finder-fe/src/app/page.tsx` (rad 224–246), `stay-finder-fe/src/app/properties/[id]/page.tsx` (rad 282–337)
  - Backend: `stay-finder-be/src/routes/properties.ts` (rad 50–53 och 83–93), `stay-finder-be/src/routes/bookings.ts` (rad 34–40)

---

#### G14. API:t svarar med rätt statuskod när ett anrop lyckas, när något skapas, när data är ogiltig, när användaren inte är inloggad och när något saknas.
- **Status:** **PASS**
- **Förklaring:**
  - `200 OK`: Vid lyckade `GET`-, `PATCH`- och `DELETE`-anrop samt vid `POST /auth/login` och `POST /auth/logout`.
  - `201 Created`: När en resurs skapas via `POST /auth/register`, `POST /properties` och `POST /bookings/properties/:propertyId`.
  - `400 Bad Request`: När Zod-valideringen nekar ogiltig data (`authValidator`, `propertyValidator`, `bookingValidator`), vid felaktiga inloggningsuppgifter eller vid ogiltigt UUID-format (`22P02`).
  - `401 Unauthorized`: När en oautentiserad besökare anropar en route skyddad av `requireAuth`.
  - `404 Not Found`: När ett efterfrågat boende eller en bokning saknas vid `GET`, `PATCH`, `DELETE` eller när man försöker boka ett boende-UUID som inte finns (`23503`).
- **Bevis i koden:**
  - Backend: `stay-finder-be/src/middleware/auth.ts`, `stay-finder-be/src/routes/auth.ts`, `stay-finder-be/src/routes/properties.ts`, `stay-finder-be/src/routes/bookings.ts`

---

#### G15. Databasen skyddar själv sina tabeller med behörighetsregler. Det räcker inte att bara API:t skyddar dem.
- **Status:** **PASS**
- **Förklaring:**
  Row Level Security (RLS) är aktiverat på både `public.properties` och `public.bookings` i `stay-finder-be/supabase/rls_policies_g.sql`:
  - `public.properties`: Alla (`public`) får läsa (`SELECT`), men endast inloggade (`authenticated` med `auth.uid() IS NOT NULL`) får göra `INSERT`, `UPDATE` och `DELETE`.
  - `public.bookings`: Endast inloggade (`authenticated` med `auth.uid() IS NOT NULL`) får göra `SELECT`, `INSERT`, `UPDATE` och `DELETE`.
  Backend ansluter med Supabase publishable/anon-nyckeln och vidarebefordrar användarens session via cookies, vilket innebär att databasens RLS-regler alltid är aktiva. Notera att vid anrop via Postman mot API:t stoppas utloggade anrop redan i API:ts `requireAuth`-middleware med `401`. Att databasens RLS i sig nekar oautentiserade anrop med PostgreSQL-felkod `42501` har verifierats genom direktanrop med Supabase-klienten mot tabellerna utan att gå via Hono-routerna.
- **Bevis i koden:**
  - Databas: `stay-finder-be/supabase/rls_policies_g.sql`
  - Backend: `stay-finder-be/src/middleware/auth.ts` (`createSupabaseForRequest`)

---

#### G16. All data är typad i både backend och frontend.
- **Status:** **PASS**
- **Förklaring:**
  - **Backend:** Använder genererade Supabase-typer i `src/types/database.types.d.ts` tillsammans med domäntyperna `Property`, `NewProperty`, `PropertyKind`, `Booking`, `NewBooking`, `AuthUser` och `BasicSupabaseClient`.
  - **Frontend:** Har tydliga interfaces och typer i `src/types/index.ts` (`AuthUser`, `Property`, `NewPropertyInput`, `PropertyFilter`, `SortOrder`, `Booking`, `NewBookingInput`, `BookingStatus`) som används konsekvent i `api.ts`, `AuthContext.tsx` och samtliga sidor.
  - **Verifiering med TypeScript-kompilatorn (`tsc --noEmit`):**
    Både `npx tsc --noEmit` i `stay-finder-be` och `npx tsc --noEmit` i `stay-finder-fe` körs med `strict: true` och passerar med **0 fel**, och det förekommer **inga** `any` i kodbasen.
- **Bevis i koden:**
  - Backend: `stay-finder-be/src/types/database.types.d.ts`, `stay-finder-be/src/types/property.d.ts`, `stay-finder-be/src/types/booking.d.ts`, `stay-finder-be/src/types/auth.d.ts`, `stay-finder-be/src/types/supabase.d.ts`
  - Frontend: `stay-finder-fe/src/types/index.ts`, `stay-finder-fe/src/lib/api.ts`

---

## Slutsats

Samtliga **16 av 16 G-kriterier (G1–G16)** är bedömda som **PASS** utifrån:
1. **Kodgranskning** av samtliga routes, validators, databasfunktioner och React-komponenter i `stay-finder-be` och `stay-finder-fe`.
2. **Statisk typkontroll** med `npx tsc --noEmit` i både backend och frontend (0 fel).
3. **Databasens RLS-policies** i `stay-finder-be/supabase/rls_policies_g.sql` (samt direktverifiering mot Supabase att oautentiserade tabellanrop nekas av RLS).
4. **API-testsvit** i `Stay Finder API Tests.postman_collection.json` (och `api-tests.http`) som kan importeras och köras i Postman mot `http://localhost:3000`.
