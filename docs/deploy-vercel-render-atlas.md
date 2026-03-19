# Deploy RentifyPro: Vercel + Render + MongoDB Atlas

## 1. MongoDB Atlas setup

1. Create a database user (Database Access) and save username/password.
2. In Network Access, add:
   - `0.0.0.0/0` (quick start), or
   - your exact trusted IP ranges.
3. In Atlas "Connect" -> "Drivers" -> Node.js:
   - copy the SRV URI (`mongodb+srv://...`) for `MONGO_URI`
   - copy the standard URI (`mongodb://host1,host2,...`) for `MONGO_URI_DIRECT` fallback.
4. Use a URI with your DB name, for example `/rentifypro`.

## 2. Render backend environment variables

Set at least:

- `NODE_ENV=production`
- `PORT=10000` (or let Render inject `PORT`)
- `MONGO_URI=<atlas-srv-uri>`
- `MONGO_URI_DIRECT=<atlas-standard-uri>` (recommended fallback)
- `MONGO_DB_NAME=rentifypro`
- `FRONTEND_URL=https://<your-vercel-domain>` (or comma-separated origins)
- `ALLOW_VERCEL_PREVIEW_ORIGINS=true` (optional, for Vercel preview links)
- `JWT_SECRET=<strong-secret>`
- `INTERNAL_API_KEY=<shared-secret>`
- `SMTP_HOST=smtp.gmail.com` (or your SMTP host)
- `SMTP_PORT=587`
- `SMTP_SECURE=false` (`true` if using port 465)
- `SMTP_USER=<email>`
- `SMTP_PASS=<app-password>`
- `EMAIL_FROM=<email>`
- `EMAIL_FROM_NAME=RentifyPro`
- `FACE_SERVICE_AUTOSTART=false`
- `CHATBOT_SERVICE_AUTOSTART=false`

If face/chatbot are deployed as separate services, set:

- `FACE_SERVICE_URL=https://<your-face-service-domain>`
- `CHATBOT_URL=https://<your-chatbot-service-domain>`

If you deploy `face-service`, use the same Mongo variables there as well:

- `MONGO_URI=<atlas-srv-uri>`
- `MONGO_URI_DIRECT=<atlas-standard-uri>`
- `MONGO_DB_NAME=rentifypro`

## 3. Vercel frontend environment variables

Set:

- `VITE_API_BASE_URL=https://<your-render-backend-domain>`
- `VITE_SOCKET_URL=https://<your-render-backend-domain>`
- `VITE_BOOKING_LEDGER_CONTRACT_ADDRESS=<optional>`

Important:
- Use `https://` URLs (not `http://`) to avoid browser mixed-content fetch failures.

## 4. Fix for `querySrv ECONNREFUSED`

If you see:

`querySrv ECONNREFUSED _mongodb._tcp.<cluster>.mongodb.net`

it means SRV DNS lookup failed on your current network/DNS path.

Use one or more of these fixes:

1. Set `MONGO_URI_DIRECT` to the standard (non-SRV) Atlas URI.
2. Switch DNS to Cloudflare (`1.1.1.1`) or Google (`8.8.8.8`).
3. Disable VPN/proxy/firewall DNS filtering temporarily and retest.
4. Confirm Atlas Network Access allows your source IP.

## 5. Fix for `bad auth : authentication failed`

If direct URI connects to hosts but returns Atlas `code 8000`, credentials are invalid.

1. Atlas -> Database Access -> select your database user -> reset password.
2. Put the exact new credentials into both `MONGO_URI` and `MONGO_URI_DIRECT`.
3. If password has special characters, URL-encode it before placing it in URI.
4. Confirm the user has at least `readWriteAnyDatabase` (or required scoped role).

For local verification from backend folder:

`npm run db:check`
