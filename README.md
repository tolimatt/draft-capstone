# RentifyPro Admin

The admin dashboard uses the same MongoDB database as the main RentifyPro website. This keeps customer, vehicle, and verification-document records consistent without maintaining a second copy of production data.

## Local setup

1. Ensure MongoDB is running.
2. Copy `backend/.env.example` to `backend/.env` and set the admin credentials.
3. Set `MONGODB_URI` to the same MongoDB database used by the website backend.
4. Set `WEBSITE_BACKEND_DIR` to the website's `backend` directory so authenticated previews can read its vehicle and KYC uploads.
5. From this repository root, run `npm run dev`.

The dashboard reads `users`, `vehicles`, `bookings`, and `prekycdocuments` from the shared database. Customer changes, account restrictions, privacy-preserving archives, and document decisions are written back to that same database. Archiving anonymizes personal data while preserving linked booking history.

## Admin authentication and recovery

The first startup creates the single system-admin credential in MongoDB using the values in `backend/.env`. Passwords are stored only as bcrypt hashes. Every login requires a second six-digit email code before the server creates a session. Password recovery uses a separate six-digit code with a five-minute expiry, a maximum-attempt limit, and a short-lived reset token. Completing a reset invalidates existing admin sessions.

The backend first tries SMTP using its own settings or the main website backend's email settings. Admin sign-in MFA codes are delivered only by email and are never returned to the browser. `ADMIN_PASSWORD_RESET_DEV_MODE=true` permits an on-screen password-reset code only for non-production requests originating from the local machine; disable it in production.

Sensitive customer changes require the current Super Admin password. Disable/enable and archive actions also require a written reason. Security events and management decisions are available under **Governance → Audit Logs**. The frontend and backend import `shared/adminApiContract.js` and verify its version on each admin data response so incompatible checkouts fail clearly instead of silently drifting.

The **Governance → Security** page lists active admin sessions and allows the Super
Admin to revoke one session or every other session. The sign-in verification surface
is intentionally limited to the secret passkey and email backup.

The Security page can also configure a separate secret admin passkey. It is strength-
validated and stored only as a bcrypt hash. Once enabled, the secret passkey is the
default verification step after the account password; email codes are generated and
sent only when the admin chooses the email backup option.

Customer profile changes require a reason and password, record before/after values in
the audit log, notify the user, and force email re-verification when the email changes.
Direct renter-to-owner role changes are blocked until the required owner document is
approved; customers should normally use the website's **Become a Vehicle Owner** flow.

The **Customers → Documents** page is the final decision point for queued KYC evidence.
It shows screening confidence, mismatch/tampering indicators, retry state, and notes.
A Gemini outage leaves the item available for manual review instead of rejecting it.

Do not commit `backend/.env`. Use a strong `JWT_SECRET`, and use `ADMIN_PASSWORD_HASH` instead of a plain-text password in production.
