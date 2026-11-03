import { Hono } from "hono";
import type { PostgrestError, User } from "@supabase/supabase-js";

import {
  bookingOptionalValidator,
  bookingValidator,
} from "../validators/bookingValidator.js";
import {
  createBooking,
  deleteBooking,
  getBookingsByPropertyId,
  updateBooking,
} from "../database/bookings.js";
import { requireAuth } from "../middleware/auth.js";
import type { Booking } from "../types/booking.js";

// PostgreSQL felkoder för saknat boende (Foreign Key) och ogiltigt UUID-format
const FOREIGN_KEY_VIOLATION = "23503";
const INVALID_UUID = "22P02";

const bookings = new Hono({ strict: false });

/**
 * GET /bookings/properties/:propertyId
 * Krav G12 & G14: En inloggad användare kan se bokningar för ett boende.
 * Skyddad med requireAuth (returnerar 401 om användaren inte är inloggad).
 */
bookings.get("/properties/:propertyId", requireAuth, async (c) => {
  const propertyId = c.req.param("propertyId") as string;
  const sb = c.get("supabase");
  try {
    const bookings = await getBookingsByPropertyId(sb, propertyId);
    return c.json(bookings, 200);
  } catch (e) {
    console.warn("Error in fetching bookings from SB database", e);
    if ((e as PostgrestError).code === INVALID_UUID) {
      return c.json({ message: "Invalid property ID" }, 400);
    }
    return c.json({ message: "Could not fetch bookings" }, 500);
  }
});

/**
 * POST /bookings/properties/:propertyId
 * Krav G9, G10 & G14: En inloggad användare kan boka ett boende.
 * 1. requireAuth kollar att användaren är inloggad (401 om utloggad).
 * 2. bookingValidator kollar att e-post, antal gäster och datum är giltiga (400 om ogiltig data).
 * 3. Om boendet inte finns returneras 404 Not Found, vid lyckad bokning returneras 201 Created.
 */
bookings.post(
  "/properties/:propertyId",
  requireAuth,
  bookingValidator,
  async (c) => {
    const propertyId = c.req.param("propertyId") as string;
    const bookingBody = c.req.valid("json");
    const sb = c.get("supabase");
    const user = c.get("user") as User;
    try {
      const booking = await createBooking(sb, {
        ...bookingBody,
        property_id: propertyId,
        user_id: user.id,
      });
      return c.json(booking, 201);
    } catch (e) {
      console.warn("Error in inserting booking into SB DB", e);
      const errorCode = (e as PostgrestError).code;
      if (errorCode === FOREIGN_KEY_VIOLATION) {
        return c.json({ message: "Property not found" }, 404);
      }
      if (errorCode === INVALID_UUID) {
        return c.json({ message: "Invalid property ID" }, 400);
      }
      return c.json({ message: "Could not create booking" }, 500);
    }
  },
);

/**
 * PATCH /bookings/properties/:propertyId/:bookingId
 * Krav G12 & G14: En inloggad användare kan ändra en bokning för ett boende.
 * Tar bort user_id och property_id från body så att bokningens ägare/boende inte kan manipuleras.
 */
bookings.patch(
  "/properties/:propertyId/:bookingId",
  requireAuth,
  bookingOptionalValidator,
  async (c) => {
    const propertyId = c.req.param("propertyId") as string;
    const bookingId = c.req.param("bookingId") as string;
    const bookingBody: Partial<Booking> = c.req.valid("json");
    delete bookingBody.user_id;
    delete bookingBody.property_id;
    const sb = c.get("supabase");
    try {
      const booking = await updateBooking(sb, propertyId, bookingId, bookingBody);
      return c.json(booking, 200);
    } catch (e) {
      console.warn("Error updating booking in SB DB", e);
      return c.json({ message: "Booking not found or could not be updated" }, 404);
    }
  },
);

/**
 * DELETE /bookings/properties/:propertyId/:bookingId
 * Krav G12 & G14: En inloggad användare kan ta bort en bokning för ett boende.
 */
bookings.delete("/properties/:propertyId/:bookingId", requireAuth, async (c) => {
  const propertyId = c.req.param("propertyId") as string;
  const bookingId = c.req.param("bookingId") as string;
  const sb = c.get("supabase");
  try {
    await deleteBooking(sb, propertyId, bookingId);
    return c.json({ message: "Booking deleted" }, 200);
  } catch (e) {
    console.warn("Error in deleting booking", e);
    return c.json({ message: "Booking not found or could not be deleted" }, 404);
  }
});

export default bookings;
