import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { prettyJSON } from 'hono/pretty-json'

import { optionalAuth } from './middleware/auth.js'
import properties from './routes/properties.js'
import bookings from './routes/bookings.js'
import auth from './routes/auth.js'
import { env } from './env.js'

const app = new Hono({ strict: false })

/**
 * CORS-inställningar:
 * - origin: Tillåter anrop från vår Next.js-frontend (http://localhost:3001).
 * - credentials: true: Krävs för att webbläsaren ska få skicka och ta emot
 *   våra HttpOnly-inloggningscookies mellan port 3001 och port 3000 (Krav G1 & G2).
 */
app.use('*', cors({
  origin: env.frontendUrl,
  allowHeaders: ['Authorization', 'Content-Type'],
  credentials: true
}))

app.use(prettyJSON())

/**
 * optionalAuth körs på alla anrop och skapar en Supabase-klient kopplad till
 * användarens cookies samt sätter c.get("user") om användaren är inloggad.
 */
app.use('*', optionalAuth)

app.get('/', (c) => {
  return c.json({
    name: "Stay Finder"
  })
})

// Kopplar in våra tre huvudroutes
app.route("/properties", properties)
app.route("/bookings", bookings)
app.route("/auth", auth)

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
