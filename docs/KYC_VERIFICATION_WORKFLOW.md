# KYC document verification workflow

RentifyPro treats Gemini as a screening assistant, not the source of truth. New ID and
owner-supporting documents are validated locally, stored outside public uploads, and
placed in MongoDB before an external request is attempted. One worker processes the
queue at a configurable rate. Quota and service failures retry with backoff and then
move to manual review; they never automatically reject an applicant.

## Status flow

`queued -> processing -> pending_review -> verified | rejected`

Temporary provider errors use `retry_wait` before returning to `processing`. With the
recommended `KYC_ALLOW_GEMINI_AUTO_APPROVE=false`, every new document requires a
Super Admin decision even when Gemini reports a pass. Face matching and document
review are independent: a successful selfie produces `challenge_passed`, and the user
becomes `approved` only after the ID is approved.

## Compatibility and data safety

- No migration rewrites users or KYC cases. Existing users with `kycStatus: approved`
  remain approved.
- The new queue states are additions to `PreKycDocument`; legacy `verified`,
  `pending_review`, and `rejected` records remain valid.
- Do not delete or reseed the shared database before testing. Test with a new email and
  leave existing approved accounts in place as a regression check.
- Evidence is private and served only through an authenticated admin endpoint with
  `Cache-Control: private, no-store`. Database records store an object key and checksum,
  not a public URL.

## Free-tier operation

Start conservatively with four Gemini requests per minute and three attempts. The
queue continues accepting uploads when the provider is rate-limited, so user traffic
does not create a burst of parallel Gemini calls. Super Admin can review documents
while automated screening is queued, retrying, or unavailable.

For multi-instance production, replace local evidence storage with private encrypted
object storage and use a distributed queue/lease (for example, a managed queue and
Redis lock). Configure provider billing alerts and daily usage alerts. Do not increase
rate limits until measured quota and load tests support it.

## Operational checks

1. Confirm the Super Admin **Documents** page can preview, approve, and reject evidence.
2. Confirm an unavailable Gemini API ends in manual review, not rejection.
3. Confirm a selfie pass alone leaves the account pending.
4. Confirm approval records the reviewer, timestamp, reason, and audit event.
5. Confirm expired private evidence is removed according to the retention policy while
   the minimal KYC decision record remains.
