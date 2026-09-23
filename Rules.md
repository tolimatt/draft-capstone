# RentifyPro — Strict Project Change Rules

You are working on RentifyPro, an existing MERN application.

Your primary responsibility is to implement ONLY the changes explicitly requested by the user while preserving all existing functionality outside the requested scope.

Treat the existing project as a working production codebase.

---

## 1. PRIMARY RULE: STAY WITHIN SCOPE

Only modify files, components, functions, styles, APIs, schemas, routes, or configuration that are directly necessary to complete the requested task.

DO NOT:
- redesign unrelated pages
- refactor unrelated code
- rename unrelated variables
- rename unrelated files
- reorganize folders without being asked
- change unrelated styles
- modify unrelated APIs
- modify unrelated database logic
- update unrelated dependencies
- remove existing features
- rewrite working components unnecessarily
- make "cleanup" changes outside the requested task
- improve unrelated code just because you notice it

If something is outside the requested scope, leave it unchanged.

---

## 2. INSPECT BEFORE MODIFYING

Before editing anything:

1. Read the user's request carefully.
2. Identify exactly what behavior or UI must change.
3. Inspect the relevant existing files.
4. Trace the affected component's dependencies.
5. Determine the smallest reasonable set of files that must be modified.
6. Understand existing patterns before writing new code.

Do not immediately start rewriting files.

Prefer modifying the existing implementation over replacing it.

---

## 3. USE THE SMALLEST POSSIBLE CHANGE

Follow the principle:

> Minimum necessary change, maximum preservation of existing behavior.

Prefer:
- changing a few lines instead of rewriting a whole component
- extending existing utilities instead of creating duplicates
- reusing existing components
- reusing existing hooks
- reusing existing services
- reusing existing design tokens
- reusing existing API patterns

Avoid large rewrites unless the user explicitly requests one.

---

## 4. DO NOT ASSUME PERMISSION

A user request to change one thing does NOT automatically give permission to change related things.

Example:

If the user asks:
"Fix the vehicle card spacing"

You may change:
- vehicle card spacing
- directly related container spacing
- responsive spacing needed for that card

You may NOT automatically change:
- colors
- typography
- navigation
- buttons
- backend APIs
- vehicle data
- page architecture
- other cards
- unrelated responsive layouts

Only make additional changes when they are necessary for the requested feature to work correctly.

---

## 5. ASK BEFORE EXPANDING SCOPE

If completing the request requires a significant change outside the original scope, DO NOT silently make that change.

Instead, explain:

- what additional change is required
- why it is required
- which files/features would be affected

Then wait for user approval when practical.

Do not use a small request as justification for a large refactor.

---

## 6. PRESERVE EXISTING FUNCTIONALITY

Existing working behavior must continue working after the modification.

Preserve:
- routes
- authentication
- authorization
- role permissions
- API contracts
- request/response formats
- database behavior
- validation
- payment behavior
- booking behavior
- notification behavior
- messaging behavior
- document verification behavior
- existing component functionality

Never intentionally break an existing feature to simplify implementation.

---

## 7. FRONTEND RULES

When modifying the React frontend:

DO NOT unnecessarily:
- rewrite an entire page
- replace existing components
- change global styles
- change the application's design language
- modify unrelated breakpoints
- change shared components for one page unless required
- introduce inline styles when the project already uses another styling approach
- duplicate existing components

Maintain:
- existing visual identity
- existing layout conventions
- existing state management
- existing routing
- existing API integration
- responsiveness
- accessibility

If modifying a shared component, verify that every page using that component still behaves correctly.

---

## 8. BACKEND RULES

When modifying the Node/Express backend:

DO NOT:
- change unrelated endpoints
- rename existing API fields
- change response formats unnecessarily
- weaken authentication
- weaken authorization
- bypass validation
- remove error handling
- expose sensitive information
- modify unrelated middleware

Keep existing frontend/backend API contracts compatible.

If an API contract must change, update every affected caller intentionally.

---

## 9. DATABASE SAFETY

Treat MongoDB schemas and stored data as sensitive.

DO NOT:
- delete fields
- rename fields
- change field types
- change relationships
- remove indexes
- modify production data
- create destructive migrations

unless explicitly required.

Schema changes must preserve compatibility whenever possible.

Never destroy existing user, vehicle, booking, payment, message, review, or audit data.

---

## 10. SECURITY MUST NOT REGRESS

Never weaken existing security to make a feature easier to implement.

Preserve:
- authentication
- role-based authorization
- protected routes
- input validation
- sanitization
- secure password handling
- token handling
- payment security
- rate limiting where present
- secure file handling

Never expose:
- passwords
- API secrets
- JWT secrets
- database credentials
- payment credentials
- private environment variables

Never commit secrets into source files.

---

## 11. DEPENDENCY RULE

Do not install a new package unless it provides clear value and the requested change cannot reasonably be implemented using the project's existing dependencies.

Before adding a dependency:
1. Check whether an existing package already solves the problem.
2. Prefer native/browser/Node functionality when appropriate.
3. Avoid large packages for trivial functionality.

Do not upgrade unrelated packages.

Do not perform mass dependency updates unless explicitly requested.

---

## 12. UI/UX CHANGES

When the user requests a specific UI change, implement that specific change.

Do not use the request as permission for a full redesign.

Maintain consistency with:
- existing typography
- existing colors
- existing icons
- existing spacing system
- existing border radius
- existing shadows
- existing components

Do not introduce a completely different visual style unless explicitly requested.

---

## 13. RESPONSIVE DESIGN

When changing UI, check that the affected area still works on:

- desktop
- tablet
- mobile

Do not solve responsiveness by simply shrinking everything.

Use appropriate:
- wrapping
- stacking
- responsive grids
- breakpoints
- scrolling behavior

Do not modify unrelated mobile layouts.

---

## 14. SHARED COMPONENT SAFETY

Be especially careful with shared files.

Before editing:
- shared components
- global CSS
- layouts
- middleware
- utilities
- hooks
- API services
- schemas

determine where they are used.

A local problem should preferably receive a local solution.

Do not alter shared behavior unless necessary.

---

## 15. NO UNREQUESTED "IMPROVEMENTS"

Do not make opportunistic changes such as:

- formatting the whole project
- cleaning unrelated code
- renaming everything for consistency
- changing architecture
- changing folder organization
- replacing libraries
- adding animations
- changing colors
- changing fonts
- improving unrelated accessibility issues
- optimizing unrelated components
- changing unrelated responsive behavior

You may mention these as recommendations, but DO NOT implement them without permission.

---

## 16. DO NOT DELETE WORKING CODE

Do not delete existing code simply because another implementation seems cleaner.

Before removing anything, verify:
- it is truly unused
- it is not imported elsewhere
- it is not needed by another role
- it is not needed by another page
- it is not part of an API contract

When uncertain, preserve it.

---

## 17. PRESERVE USER ROLES

RentifyPro contains different user experiences.

Be careful not to accidentally affect:

- renters
- vehicle owners
- administrators

A change requested for one role should not automatically modify another role.

Example:

A change to the renter vehicle page must not modify the owner vehicle management page unless explicitly requested.

---

## 18. RENTIFYPRO DOMAIN SAFETY

Be especially careful with core rental flows.

Do not unintentionally change:

- vehicle availability
- booking calculations
- rental dates
- payment calculations
- 30% down-payment logic
- full-payment logic
- PayMongo integration
- GCash/Maya/card behavior
- walk-in payment logic
- cancellation logic
- booking extension logic
- late-return logic
- penalties
- vehicle ownership
- driver availability
- messaging
- reviews
- notifications
- document verification

Changes affecting these areas must be explicitly requested.

---

## 19. VERIFY BEFORE FINISHING

After making changes:

1. Review every modified file.
2. Check the Git diff.
3. Confirm that no unrelated files were changed.
4. Confirm there are no accidental deletions.
5. Check for syntax errors.
6. Check imports.
7. Check routes.
8. Check API usage.
9. Check affected responsive layouts.
10. Run relevant tests/build/lint commands when available.
11. Fix errors caused by your changes.

Do not hide failing tests or build errors.

---

## 20. REVIEW THE DIFF

Before considering a task complete, ask:

- Is every changed line related to the user's request?
- Did I modify anything unrelated?
- Did I accidentally change shared behavior?
- Did I create duplicate code?
- Did I remove working behavior?
- Did I alter an API contract?
- Did I affect another role?
- Did I introduce a new dependency unnecessarily?

If an unrelated change exists, revert it.

---

## 21. NEVER MASK PROBLEMS

Do not fix errors by:
- disabling validation
- commenting out failing logic
- removing security checks
- swallowing errors
- hiding console errors
- hardcoding successful responses
- using fake data in production paths
- disabling tests

Fix the underlying issue within the requested scope.

---

## 22. EXISTING CODE TAKES PRIORITY

Follow the existing project's:
- naming conventions
- component patterns
- architecture
- folder structure
- coding style
- API style
- error handling
- state management

Do not introduce a new architectural pattern for one small feature.

---

## 23. DO NOT OVERENGINEER

Choose the simplest implementation that correctly solves the requested problem.

Avoid creating unnecessary:
- abstractions
- factories
- services
- contexts
- hooks
- wrappers
- configuration files
- state managers
- helper layers

Small problems should usually have small solutions.

---

## 24. ERROR HANDLING

Do not remove existing error handling.

New functionality must appropriately handle:
- loading
- success
- empty data
- validation failure
- API failure
- authorization failure

Do not expose internal server errors to users.

---

## 25. TASK INTERPRETATION

Treat the user's exact request as the source of truth.

When requirements are clear:
implement them directly.

When requirements are ambiguous:
inspect the existing implementation and choose the interpretation that requires the least disruptive change.

When a decision could significantly alter behavior:
ask before proceeding.

---

## 26. COMPLETION REPORT

After completing the task, provide a concise summary containing:

### Changed
Only list what was intentionally changed.

### Files Modified
List the files that were changed.

### Preserved
Confirm important existing behavior that was intentionally left unchanged.

### Verification
Mention relevant tests/build/lint/checks performed.

### Notes
Mention anything that requires user attention.

Do not claim something was tested if it was not actually tested.

---

# ABSOLUTE RULE

NEVER modify unrelated parts of RentifyPro just because you believe they could be improved.

The user's requested scope is a boundary, not a suggestion.

When in doubt:

PRESERVE EXISTING CODE.
MAKE THE SMALLEST CHANGE.
DO NOT EXPAND THE SCOPE.