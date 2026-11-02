import * as z from "zod";
import { zValidator } from "@hono/zod-validator";
import { getValidatorError } from "../utils/validation.js";

/**
 * Krav G10 & G16: Zod-schema som validerar bokningsuppgifter.
 * Nekar ogiltig e-post, färre än 1 gäst och felaktiga datumformat (YYYY-MM-DD).
 */
const bookingObject = z.object({
  guest_name: z.string().min(2, "Guest name is necessary (at least 2 characters)"),
  guest_email: z.email("Guest email is not valid"),
  check_in: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Check in date is not valid YYYY-MM-DD"),
  check_out: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Check out date is not valid YYYY-MM-DD"),
  guests: z.number().min(1, "Guests needs to be at least 1"),
  status: z.enum(["pending", "confirmed", "cancelled"]).default("pending"),
});

/**
 * Krav G10: Kontroll att incheckning är före utcheckning (minst 1 natt).
 */
const dateOrder = {
  message: "Check-out date must be after check-in date (at least 1 night)",
  path: ["check_in"],
};

const bookingSchema = bookingObject.refine(
  (data) => data.check_in < data.check_out,
  dateOrder,
);

/**
 * Krav G12: Schema för PATCH (uppdatering av bokning) där alla fält är frivilliga (.partial()).
 */
const bookingOptionalSchema = bookingObject
  .partial()
  .refine(
    (data) =>
      !data.check_in || !data.check_out || data.check_in < data.check_out,
    dateOrder,
  );

/**
 * Krav G10 & G14: Returnerar statuskod 400 Bad Request med begripliga felmeddelanden om valideringen misslyckas.
 */
export const bookingValidator = zValidator(
  "json",
  bookingSchema,
  (result, c) => {
    if (!result.success) {
      return c.json(getValidatorError(result.error), 400);
    }
  },
);

export const bookingOptionalValidator = zValidator(
  "json",
  bookingOptionalSchema,
  (result, c) => {
    if (!result.success) {
      return c.json(getValidatorError(result.error), 400);
    }
  },
);
