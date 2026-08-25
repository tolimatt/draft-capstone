# RentifyPro Admin

The admin dashboard uses the same MongoDB database as the main RentifyPro website. This keeps customer, vehicle, and verification-document records consistent without maintaining a second copy of production data.

## Local setup

1. Ensure MongoDB is running.
2. Copy `backend/.env.example` to `backend/.env` and set the admin credentials.
3. Set `MONGODB_URI` to the same MongoDB database used by the website backend.
4. Set `WEBSITE_BACKEND_DIR` to the website's `backend` directory so authenticated previews can read its vehicle and KYC uploads.
5. From this repository root, run `npm run dev`.

The dashboard reads `users`, `vehicles`, `bookings`, and `prekycdocuments` from the shared database. Booking data is limited to operational fields; operator earnings, payment amounts, and payment methods are not requested by the admin API. Admin document approvals are written back to `prekycdocuments`; customer, vehicle, and booking lists are currently read-only.

## Admin authentication and recovery

The first startup creates the single system-admin credential in MongoDB using the values in `backend/.env`. Passwords are stored only as bcrypt hashes. Password recovery uses a six-digit code with a five-minute expiry, a maximum-attempt limit, and a short-lived reset token. Completing a reset invalidates existing admin sessions.

The backend first tries SMTP using its own settings or the main website backend's email settings. `ADMIN_PASSWORD_RESET_DEV_MODE=true` permits an on-screen recovery code only for non-production requests originating from the local machine. Disable this option in production.

Do not commit `backend/.env`. Use a strong `JWT_SECRET`, and use `ADMIN_PASSWORD_HASH` instead of a plain-text password in production.
