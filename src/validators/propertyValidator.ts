import * as z from "zod";
import { zValidator } from "@hono/zod-validator";
import { getValidatorError } from "../utils/validation.js";
import type { PropertyKind } from "../types/property.js";

/**
 * Krav G6, G7, G14 & G16: Zod-schema för att validera ett nytt boende.
 * Om indata är ogiltig (t.ex. pris under 100 kr eller 0 gäster) nekas anropet med statuskod 400.
 */
const propertySchema = z.object({
  title: z.string().min(2, "Title is necessary"),
  description: z.string().min(3, "Description is necessary"),
  max_guests: z.number().min(1, "Max guests needs to be min 1"),
  price_per_night: z
    .number()
    .min(100, "Price per night needs to be a minimum of 100"),
  location: z.string().min(2, "Location is necessary"),
  kind: z.enum<PropertyKind[]>(
    ["apartment", "villa"],
    `Must be one of "apartment", "villa"`,
  ),
  property_id: z.string().optional(),
  created_at: z.string().optional(),
});

// .partial() gör alla fält frivilliga vid PATCH (uppdatering av boende)
const propertyOptionalSchema = propertySchema.partial();

const propertyParamSchema = z.object({
  kind: z.enum<PropertyKind[]>(
    ["apartment", "villa"],
    `Param must be one of "apartment", "villa"`,
  ),
});

export const propertyValidator = zValidator(
  "json",
  propertySchema,
  (result, c) => {
    if (!result.success) {
      return c.json(getValidatorError(result.error), 400);
    }
  },
);

export const propertyOptionalValidator = zValidator(
  "json",
  propertyOptionalSchema,
  (result, c) => {
    if (!result.success) {
      return c.json(getValidatorError(result.error), 400);
    }
  },
);

export const propertyParamValidator = zValidator(
  "param",
  propertyParamSchema,
  (result, c) => {
    if (!result.success) {
      return c.json(getValidatorError(result.error), 400);
    }
  },
);
