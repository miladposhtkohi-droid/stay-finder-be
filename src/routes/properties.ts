import { Hono } from "hono";

import {
  propertyOptionalValidator,
  propertyParamValidator,
  propertyValidator,
} from "../validators/propertyValidator.js";
import {
  createProperty,
  deletePropertyById,
  getProperties,
  getPropertiesByKind,
  getPropertyById,
  updatePropertyById,
  type PropertySortOrder,
} from "../database/properties.js";
import { requireAuth } from "../middleware/auth.js";

import type { User } from "@supabase/supabase-js";
import type { Property } from "../types/property.js";

const properties = new Hono({ strict: false });

/**
 * Hjälpfunktion för att tolka sorteringsparametern ("asc" eller "desc") från URL:en (Krav G8).
 */
function parseSortOrder(sortQuery: string | undefined): PropertySortOrder | undefined {
  if (sortQuery === "asc" || sortQuery === "desc") {
    return sortQuery;
  }
  return undefined;
}

/**
 * GET /properties
 * Krav G4, G5 & G8: Alla (även utloggade) kan se listan över boenden.
 * Stödjer filtrering på location, maxprice, maxguests (eller guests) samt sortering på pris (?sort=asc|desc).
 */
properties.get("/", async (c) => {
  const sb = c.get("supabase");
  try {
    const guestsParam = c.req.query("maxguests") || c.req.query("guests");
    const properties = await getProperties(sb, {
      maxPrice: Number(c.req.query("maxprice")) || undefined,
      location: c.req.query("location"),
      maxGuests: Number(guestsParam) || undefined,
      sort: parseSortOrder(c.req.query("sort")),
    });
    return c.json(properties, 200);
  } catch (e) {
    console.warn("Error in fetching properties from SB database", e);
    return c.json([], 200);
  }
});

/**
 * GET /properties/kind/:kind
 * Filtrerar boenden på typ ("apartment" eller "villa") i kombination med sökfilter och sortering.
 */
properties.get("/kind/:kind", propertyParamValidator, async (c) => {
  const kind = c.req.valid("param").kind;
  const sb = c.get("supabase");
  try {
    const guestsParam = c.req.query("maxguests") || c.req.query("guests");
    const properties = await getPropertiesByKind(sb, kind, {
      maxPrice: Number(c.req.query("maxprice")) || undefined,
      location: c.req.query("location"),
      maxGuests: Number(guestsParam) || undefined,
      sort: parseSortOrder(c.req.query("sort")),
    });
    return c.json(properties, 200);
  } catch (e) {
    console.warn("Error in fetching properties from SB database", e);
    return c.json([], 200);
  }
});

/**
 * GET /properties/:id
 * Krav G4 & G14: Hämtar ett enskilt boende för detaljsidan.
 * Om boendet inte finns returneras statuskod 404 Not Found.
 */
properties.get("/:id", async (c) => {
  const propertyId = c.req.param("id") as string;
  const sb = c.get("supabase");
  try {
    const property = await getPropertyById(sb, propertyId);
    return c.json(property, 200);
  } catch (e) {
    console.warn("Error in fetching property from SB database", e);
    return c.json({ message: "Property not found" }, 404);
  }
});

/**
 * POST /properties
 * Krav G6, G7 & G14: Skapar ett nytt boende.
 * Skyddad med requireAuth (401 om ej inloggad) och propertyValidator (400 om ogiltig data).
 * Kopplar boendet till den inloggade användaren via user.id och svarar med 201 Created.
 */
properties.post("/", requireAuth, propertyValidator, async (c) => {
  const propertyBody = c.req.valid("json");
  const sb = c.get("supabase");
  const user = c.get("user") as User;
  try {
    const property = await createProperty(sb, {
      ...propertyBody,
      user_id: user.id,
    });
    return c.json(property, 201);
  } catch (e) {
    console.warn("Error in inserting property into SB DB", e);
    return c.json({ message: "Could not create property", error: e }, 500);
  }
});

/**
 * PATCH /properties/:id
 * Krav G6 & G14: Uppdaterar ett boende.
 * Skyddad med requireAuth (401 om ej inloggad) och propertyOptionalValidator (400 om ogiltig data).
 * Tar bort user_id från body så att ägarskapet inte kan skrivas över.
 */
properties.patch("/:id", requireAuth, propertyOptionalValidator, async (c) => {
  const propertyId = c.req.param("id") as string;
  const propertyBody: Partial<Property> = c.req.valid("json");
  delete propertyBody.user_id;
  const sb = c.get("supabase");
  try {
    const property = await updatePropertyById(sb, propertyId, propertyBody);
    return c.json(property, 200);
  } catch (e) {
    console.warn("Error updating property in SB DB", e);
    return c.json({ message: "Property not found or could not be updated" }, 404);
  }
});

/**
 * DELETE /properties/:id
 * Krav G6 & G14: Tar bort ett boende.
 * Skyddad med requireAuth (bara inloggade får ta bort boenden).
 * Returnerar 200 OK om det togs bort, annars 404 Not Found.
 */
properties.delete("/:id", requireAuth, async (c) => {
  const propertyId = c.req.param("id") as string;
  const sb = c.get("supabase");
  try {
    await deletePropertyById(sb, propertyId);
    return c.json({ message: "Property deleted" }, 200);
  } catch (e) {
    console.warn("Error in deleting property", e);
    return c.json({ message: "Property not found or could not be deleted" }, 404);
  }
});

export default properties;
