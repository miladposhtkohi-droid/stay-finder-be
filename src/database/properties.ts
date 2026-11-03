import type { PostgrestSingleResponse } from "@supabase/supabase-js";

import type { BasicSupabaseClient } from "../types/supabase.js";
import type { NewProperty, Property, PropertyKind } from "../types/property.js";

const TABLE_NAME = "properties";

const SELECT_QUERY =
  "property_id, title, description, location, price_per_night, max_guests, kind, created_at, user_id";
const QUERY_ID = "property_id";
const QUERY_KIND = "kind";

function selectProperties(sb: BasicSupabaseClient) {
  return sb.from(TABLE_NAME).select(SELECT_QUERY);
}

type PropertyListQuery = ReturnType<typeof selectProperties>;

/**
 * Krav G5, G8 & G16: Typade filter- och sorteringsparametrar för boendelistan.
 * - maxPrice: maxpris per natt
 * - location: plats (stad/område)
 * - maxGuests: minsta antal gäster som boendet måste rymma
 * - sort: "asc" (stigande pris) eller "desc" (fallande pris)
 */
export type PropertySortOrder = "asc" | "desc";

export type PropertyListFilter = Partial<{
  maxPrice: number;
  location: string;
  maxGuests: number;
  sort: PropertySortOrder;
}>;

/**
 * Krav G5 & G8: Bygger databasfrågan med filter och sortering i backend.
 * Varför i backend/databasen? För att databasen är optimerad för att filtrera
 * och sortera data innan den skickas över nätverket till klienten.
 */
function buildPropertiesFilter(
  query: PropertyListQuery,
  filters: PropertyListFilter,
) {
  // Krav G5: Filtrera på maxpris (price_per_night <= maxPrice)
  if (filters.maxPrice) {
    query = query.lte("price_per_night", filters.maxPrice);
  }

  // Krav G5: Filtrera på antal gäster (max_guests >= efterfrågat antal gäster)
  if (filters.maxGuests) {
    query = query.gte("max_guests", filters.maxGuests);
  }

  // Krav G5: Filtrera på plats (case-insensitive sökning med ilike)
  if (filters.location && filters.location.trim().length > 0) {
    query = query.ilike("location", `%${filters.location.trim()}%`);
  }

  // Krav G8: Sortera på pris i backend, stigande (asc) eller fallande (desc)
  if (filters.sort === "asc") {
    query = query.order("price_per_night", { ascending: true });
  } else if (filters.sort === "desc") {
    query = query.order("price_per_night", { ascending: false });
  }
}

/**
 * Krav G4, G5 & G8: Hämta alla boenden med eventuella filter och prissortering.
 */
export async function getProperties(
  sb: BasicSupabaseClient,
  filters: PropertyListFilter,
): Promise<Property[]> {
  const query = selectProperties(sb);

  buildPropertiesFilter(query, filters);

  const { error, data } = await query;

  if (!error) {
    return data;
  }
  throw error;
}

/**
 * Hämta boenden filtrerade på boendetyp ("apartment" eller "villa") samt övriga filter.
 */
export async function getPropertiesByKind(
  sb: BasicSupabaseClient,
  kind: PropertyKind,
  filters: PropertyListFilter,
): Promise<Property[]> {
  const query = selectProperties(sb).eq(QUERY_KIND, kind);

  buildPropertiesFilter(query, filters);

  const { error, data } = await query;

  if (!error) {
    return data;
  }
  throw error;
}

/**
 * Krav G4 & G14: Hämta ett specifikt boende via ID (för detaljsidan).
 * .single() kastar ett fel om inget boende hittas, vilket routen översätter till 404 Not Found.
 */
export async function getPropertyById(sb: BasicSupabaseClient, propertyId: string): Promise<Property> {
  const { error, data }: PostgrestSingleResponse<Property> = await sb
    .from(TABLE_NAME)
    .select(SELECT_QUERY)
    .eq(QUERY_ID, propertyId)
    .single();

  if (!error) {
    return data;
  }
  throw error;
}

/**
 * Krav G6 & G7: Skapa ett nytt boende i databasen.
 * Använder den inloggade användarens Supabase-klient (sb) så att RLS i databasen kontrollerar behörigheten.
 */
export async function createProperty(sb: BasicSupabaseClient, propertyBody: NewProperty): Promise<Property> {
  const { error, data }: PostgrestSingleResponse<Property> = await sb
    .from(TABLE_NAME)
    .insert(propertyBody)
    .select(SELECT_QUERY)
    .single();

  if (!error) {
    return data;
  }
  throw error;
}

/**
 * Krav G6: Uppdatera ett befintligt boende via ID.
 */
export async function updatePropertyById(
  sb: BasicSupabaseClient,
  propertyId: string,
  property: Partial<Property>,
): Promise<Property> {
  const { error, data }: PostgrestSingleResponse<Property> = await sb
    .from(TABLE_NAME)
    .update(property)
    .eq(QUERY_ID, propertyId)
    .select(SELECT_QUERY)
    .single();

  if (!error) {
    return data;
  }
  throw error;
}

/**
 * Krav G6: Ta bort ett boende via ID.
 */
export async function deletePropertyById(sb: BasicSupabaseClient, propertyId: string): Promise<void> {
  const { error }: PostgrestSingleResponse<Property> = await sb
    .from(TABLE_NAME)
    .delete()
    .eq(QUERY_ID, propertyId)
    .select()
    .single();

  if (!error) {
    return;
  }
  throw error;
}
