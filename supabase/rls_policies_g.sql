-- ============================================================================
-- STAYFINDER - FULLSTÄNDIG DATABAS-SETUP & BEHÖRIGHETSREGLER (RLS) FÖR G-NIVÅ
-- Denna fil skapar tabellerna (properties och bookings) samt aktiverar
-- Row Level Security (RLS) enligt Krav G6 & G15.
-- Kör hela denna fil i Supabase Dashboard -> SQL Editor -> Run
-- ============================================================================

-- ============================================================================
-- DEL 1: SKAPA TABELLERNA (om de inte redan finns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.properties (
  property_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  location text NOT NULL,
  price_per_night numeric NOT NULL,
  max_guests integer NOT NULL,
  kind text NOT NULL DEFAULT 'apartment',
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  booking_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(property_id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- DEL 2: AKTIVERA ROW LEVEL SECURITY (RLS) (Krav G6 & G15)
-- När RLS är aktiverat nekas ALL åtkomst som standard tills vi skapar policies.
-- ============================================================================

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Ta bort eventuella gamla policies så att skriptet kan köras flera gånger utan fel
DROP POLICY IF EXISTS "properties_select_all" ON public.properties;
DROP POLICY IF EXISTS "properties_insert_authenticated" ON public.properties;
DROP POLICY IF EXISTS "properties_update_authenticated" ON public.properties;
DROP POLICY IF EXISTS "properties_delete_authenticated" ON public.properties;

DROP POLICY IF EXISTS "bookings_select_authenticated" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_authenticated" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_authenticated" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete_authenticated" ON public.bookings;

-- ============================================================================
-- DEL 3: POLICIES FÖR TABELLEN properties (Krav G4, G6 & G15)
-- ============================================================================

-- Krav G4: Alla (både utloggade "anon" och inloggade "authenticated") får se boenden
CREATE POLICY "properties_select_all"
ON public.properties
FOR SELECT
TO public
USING (true);

-- Krav G6 & G15: Bara inloggade användare (authenticated) kan skapa boenden
CREATE POLICY "properties_insert_authenticated"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Krav G6 & G15: Bara inloggade användare kan ändra boenden
CREATE POLICY "properties_update_authenticated"
ON public.properties
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Krav G6 & G15: Bara inloggade användare kan ta bort boenden
CREATE POLICY "properties_delete_authenticated"
ON public.properties
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- DEL 4: POLICIES FÖR TABELLEN bookings (Krav G9, G12 & G15)
-- ============================================================================

-- Krav G12 & G15: Bara inloggade användare kan se bokningar
CREATE POLICY "bookings_select_authenticated"
ON public.bookings
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Krav G9 & G15: Bara inloggade användare kan skapa en bokning
CREATE POLICY "bookings_insert_authenticated"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Krav G12 & G15: Bara inloggade användare kan ändra en bokning
CREATE POLICY "bookings_update_authenticated"
ON public.bookings
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Krav G12 & G15: Bara inloggade användare kan ta bort en bokning
CREATE POLICY "bookings_delete_authenticated"
ON public.bookings
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- DEL 5: LÄGG IN EXEMPELBOENDEN (så att du har boenden att testa med direkt!)
-- ============================================================================

INSERT INTO public.properties (title, description, location, price_per_night, max_guests, kind, user_id)
SELECT
  'Cozy Studio in Södermalm',
  'A bright and cozy studio apartment close to cafés, parks and public transport.',
  'Stockholm, Sweden',
  850,
  2,
  'apartment',
  '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM public.properties LIMIT 1);

INSERT INTO public.properties (title, description, location, price_per_night, max_guests, kind, user_id)
SELECT
  'Modern Loft by the Harbor',
  'Spacious loft with harbor views, perfect for couples or small families.',
  'Gothenburg, Sweden',
  1200,
  4,
  'apartment',
  '00000000-0000-0000-0000-000000000000'
WHERE (SELECT count(*) FROM public.properties) = 1;

INSERT INTO public.properties (title, description, location, price_per_night, max_guests, kind, user_id)
SELECT
  'Countryside Villa in Dalarna',
  'A peaceful wooden villa surrounded by forest, ideal for a quiet getaway.',
  'Dalarna, Sweden',
  1650,
  6,
  'villa',
  '00000000-0000-0000-0000-000000000000'
WHERE (SELECT count(*) FROM public.properties) = 2;

INSERT INTO public.properties (title, description, location, price_per_night, max_guests, kind, user_id)
SELECT
  'City Center Apartment',
  'Newly renovated apartment right in the heart of the city, walking distance to everything.',
  'Malmö, Sweden',
  950,
  3,
  'apartment',
  '00000000-0000-0000-0000-000000000000'
WHERE (SELECT count(*) FROM public.properties) = 3;
