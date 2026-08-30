# Digital Postal Messaging — Backend Implementation Plan

## Goal

Build a single ASP.NET Core REST API that owns accounts, postal locations, letters, delivery, stamps, and notifications. It exposes `/api/v1` for the separately built frontend and stores all durable state in PostgreSQL.

Follow the shared system rules in [`TECHNICAL_ARCHITECTURE.md`](./TECHNICAL_ARCHITECTURE.md). In particular: never return sender/content/origin information to the recipient before delivery.

## Technology choices

| Concern | Choice |
|---|---|
| Runtime | Current supported .NET LTS SDK |
| API | ASP.NET Core Web API, controllers or minimal endpoints grouped by feature |
| Database | PostgreSQL + Entity Framework Core + Npgsql provider |
| Authentication | ASP.NET Core Identity password hashing; JWT access token plus refresh-token cookie |
| API contract | OpenAPI/Swagger, versioned under `/api/v1` |
| Tests | xUnit; integration tests with a disposable PostgreSQL database/container |
| Background work | `BackgroundService` in the API process for MVP |

Use UTC for every persisted timestamp. Use `DateTimeOffset`, not local `DateTime`, in domain and API code.

## Directory structure

Create the backend in the shared repository as follows. This keeps feature code together while avoiding unnecessary layers.

```text
digital-postal/
├── docs/
├── backend/
│   ├── DigitalPostal.sln
│   ├── Directory.Build.props
│   ├── .gitignore
│   ├── README.md
│   ├── src/
│   │   └── DigitalPostal.Api/
│   │       ├── DigitalPostal.Api.csproj
│   │       ├── Program.cs
│   │       ├── appsettings.json
│   │       ├── appsettings.Development.json      # no real secrets committed
│   │       ├── Features/
│   │       │   ├── Auth/
│   │       │   │   ├── AuthEndpoints.cs
│   │       │   │   ├── AuthService.cs
│   │       │   │   ├── AuthDtos.cs
│   │       │   │   └── RefreshTokenService.cs
│   │       │   ├── Users/
│   │       │   │   ├── MeEndpoints.cs
│   │       │   │   ├── UserSearchEndpoints.cs
│   │       │   │   └── UserDtos.cs
│   │       │   ├── Locations/
│   │       │   │   ├── LocationEndpoints.cs
│   │       │   │   └── LocationDtos.cs
│   │       │   ├── Letters/
│   │       │   │   ├── LetterEndpoints.cs
│   │       │   │   ├── LetterService.cs
│   │       │   │   ├── DeliveryTimeCalculator.cs
│   │       │   │   ├── LetterAuthorizer.cs
│   │       │   │   └── LetterDtos.cs
│   │       │   ├── Mailbox/
│   │       │   │   ├── MailboxEndpoints.cs
│   │       │   │   └── MailboxDtos.cs
│   │       │   ├── Notifications/
│   │       │   │   ├── NotificationEndpoints.cs
│   │       │   │   └── NotificationDtos.cs
│   │       │   └── Stamps/
│   │       │       ├── StampEndpoints.cs
│   │       │       └── StampDtos.cs
│   │       ├── Domain/
│   │       │   ├── Entities/                     # User, Location, Letter, etc.
│   │       │   ├── Enums/                        # LetterStatus, LetterEventType
│   │       │   └── ValueObjects/                 # LocationSnapshot, DeliveryEstimate
│   │       ├── Infrastructure/
│   │       │   ├── Persistence/
│   │       │   │   ├── AppDbContext.cs
│   │       │   │   ├── Configurations/           # EF entity mappings
│   │       │   │   ├── Migrations/
│   │       │   │   └── Seed/
│   │       │   ├── Identity/
│   │       │   └── OpenApi/
│   │       ├── Workers/
│   │       │   └── DeliveryWorker.cs
│   │       └── Common/
│   │           ├── Errors/                       # Problem Details mapping
│   │           ├── Pagination/
│   │           ├── Time/
│   │           └── Validation/
│   └── tests/
│       ├── DigitalPostal.Api.UnitTests/
│       └── DigitalPostal.Api.IntegrationTests/
└── frontend/                                      # owned by frontend developer
```

Start with one API project. Do **not** create separate Domain/Application/Infrastructure class-library projects until the codebase gives a real reason to do so. Feature folders should contain endpoints, DTOs, and feature services; entities and persistence stay shared as shown.

## Phase 0 — Create the skeleton

Install the current .NET LTS SDK and PostgreSQL locally. From the repository root:

```bash
mkdir -p backend/src backend/tests
cd backend
dotnet new sln -n DigitalPostal
dotnet new webapi -n DigitalPostal.Api -o src/DigitalPostal.Api
dotnet new xunit -n DigitalPostal.Api.UnitTests -o tests/DigitalPostal.Api.UnitTests
dotnet new xunit -n DigitalPostal.Api.IntegrationTests -o tests/DigitalPostal.Api.IntegrationTests
dotnet sln add src/DigitalPostal.Api/DigitalPostal.Api.csproj
dotnet sln add tests/DigitalPostal.Api.UnitTests/DigitalPostal.Api.UnitTests.csproj
dotnet sln add tests/DigitalPostal.Api.IntegrationTests/DigitalPostal.Api.IntegrationTests.csproj
dotnet add tests/DigitalPostal.Api.UnitTests reference src/DigitalPostal.Api/DigitalPostal.Api.csproj
dotnet add tests/DigitalPostal.Api.IntegrationTests reference src/DigitalPostal.Api/DigitalPostal.Api.csproj
```

Add the EF Core PostgreSQL provider, EF migrations tooling, JWT bearer authentication, OpenAPI support, and FluentValidation (or use built-in validation consistently). Choose package versions that match the installed .NET major version; do not mix major EF Core versions.

Commit this as the first backend commit after `dotnet build` and `dotnet test` pass.

## Phase 1 — Configuration, database, and location data

1. Create a PostgreSQL database such as `digital_postal_dev`.
2. Add `ConnectionStrings__Postgres` through user secrets or environment variables. Do not commit a real connection string or JWT secret.
3. Add `AppDbContext`, migrations, and EF configurations.
4. Add a seed routine for a small predefined set of city-level locations. Use stable `Code` values such as `IN-MUMBAI` and `GB-LONDON`.
5. Add `GET /health`, `GET /api/v1/locations`, and `GET /api/v1/locations/search?q=`.
6. Add OpenAPI and configure the development Swagger UI.

Suggested local secrets/configuration:

```text
ConnectionStrings__Postgres=Host=localhost;Port=5432;Database=digital_postal_dev;Username=...;Password=...
Jwt__Issuer=DigitalPostal
Jwt__Audience=DigitalPostalWeb
Jwt__SigningKey=<at least 32 random bytes; development only>
Auth__RefreshTokenDays=14
Delivery__PollSeconds=30
Delivery__BaseHandlingHours=4
Delivery__TransitSpeedKmPerHour=120
Delivery__InternationalSurchargeHours=24
Cors__AllowedOrigins__0=http://localhost:5173
```

Run migrations with `dotnet ef migrations add InitialCreate` and `dotnet ef database update` from the API project (or configure the startup/project arguments explicitly). Commit generated migration files.

## Phase 2 — Accounts and authentication

Implement this before letters.

1. Create `User` with `Id`, normalized unique username/email, `Username`, `DisplayName`, `Email`, `PasswordHash`, `CurrentLocationId`, `TimeZone`, `CreatedAtUtc`, and `Status`.
2. Add unique database indexes for normalized username and email.
3. Implement `POST /auth/register`: validate the requested username/display name/email/password/location; hash the password; create the user; return an authenticated account/session response as defined in OpenAPI.
4. Implement `POST /auth/login`, returning a short-lived access JWT and setting a secure HttpOnly refresh cookie.
5. Persist hashed refresh tokens with expiration and revocation metadata; implement refresh rotation and logout revocation.
6. Add `GET /me` and `PUT /me/location`. Changing current location affects future letters only.
7. Implement `GET /users/search?q=`. Require two characters, search username only, and return only `{ id, username, displayName }`.

Use an authorization policy that resolves the current user ID from the JWT. A JWT must never be trusted for another user ID supplied in a route/body.

For a separately hosted SPA, permit only its configured origin through CORS. If refresh/logout depend on cookies, add CSRF protection for cookie-authenticated endpoints and test it from the frontend origin.

## Phase 3 — Letter domain and dispatch

Create these entities and enums:

```text
LetterStatus: IN_TRANSIT, DELIVERED, RETURNED
LetterEventType: DISPATCHED, DELIVERED  # MVP; add transit events later
Letter: sender/recipient IDs, origin/destination snapshots, content,
        status, SentAtUtc, EstimatedDeliveryAtUtc, DeliveredAtUtc
LetterEvent, Stamp, LetterStamp, Notification
```

Implement a `LocationSnapshot` value object containing the city/region/country/country code/coordinates/time zone at sending time. Implement `IDeliveryTimeCalculator` and a Haversine-based first calculator; place all timing constants in configuration.

Implement `POST /api/v1/letters` in one transaction:

1. Resolve the authenticated sender; load sender and recipient plus their active locations.
2. Validate recipient, content, rate limits, and idempotency key.
3. Snapshot locations and calculate/store the delivery timestamp.
4. Insert `Letter` in `IN_TRANSIT`, a `DISPATCHED` event, origin stamp snapshot, and an anonymous recipient notification.
5. Commit and return the sender-safe result.

Add an idempotency table/columns keyed by `(SenderId, IdempotencyKey)` with a unique index. A network retry with the same key must return the first successful letter, not create another one.

## Phase 4 — Mailbox visibility and authorization

This phase protects the core experience.

1. Create distinct DTOs: `IncomingInTransitLetterDto`, `DeliveredIncomingLetterDto`, and `SentLetterDto`.
2. Implement incoming/sent list and detail endpoints.
3. Implement `LetterAuthorizer` used by **every** letter, mailbox, journey, and notification endpoint.
4. Return `404` for letters the caller does not own/receive.
5. Recipient pre-delivery DTOs must not contain sender, content, origin, detailed journey, origin stamp, or raw IDs that reveal them.
6. Implement basic in-app notification list and mark-read endpoints.
7. Add the journey endpoint. Senders can view their allowed journey; recipients receive it only after delivery.

Write integration tests that deserialize the actual pre-delivery recipient response and assert the forbidden JSON property names are absent.

## Phase 5 — Delivery worker and stamps

1. Add `DeliveryWorker : BackgroundService` and register it as a hosted service.
2. On each poll, query due in-transit letters in small batches.
3. Claim letters transactionally with PostgreSQL row locks (`FOR UPDATE SKIP LOCKED`) or an equally safe atomic claim implementation.
4. Transition each claimed letter once: set delivered time/status, append `DELIVERED`, snapshot destination stamp, and create the delivery notification in the same transaction.
5. Add unique constraints to avoid duplicated delivery events, stamps, and notification types when a worker retries.
6. Verify two worker instances and a restarted process cannot double-deliver a letter.

The worker must query stored timestamps; it must not create one in-memory timer per letter.

## Phase 6 — Contract, testing, and frontend handoff

1. Document every endpoint, status code, request/response DTO, pagination, and Problem Details error in OpenAPI.
2. Export `openapi.json` to `docs/` or publish it from the running API; agree with the frontend developer which source they generate from.
3. Create seeded development accounts and locations, but never commit real user secrets.
4. Add integration tests for registration, case-insensitive username uniqueness, recipient-search privacy, login/refresh/logout, authorization, dispatch idempotency, snapshot immutability, pre-delivery anonymity, and delivery-worker concurrency.
5. Make a frontend-accessible development URL or local CORS setup once the first endpoints are stable.

## First API milestone

The frontend developer can begin live integration once these are deployed and stable:

```text
POST /auth/register, POST /auth/login, POST /auth/refresh, POST /auth/logout
GET  /me, PUT /me/location
GET  /locations, GET /locations/search
GET  /users/search
POST /letters
GET  /mailbox/incoming, GET /mailbox/incoming/{id}
GET  /mailbox/sent, GET /mailbox/sent/{id}
GET  /notifications, POST /notifications/{id}/read
```

The worker/journey/stamps may follow, as long as the OpenAPI contract marks any unavailable endpoint clearly. Until then, the frontend can use the typed mock models in [`FRONTEND_HANDOFF.md`](./FRONTEND_HANDOFF.md).

## Definition of done for the backend MVP

- `dotnet build` and all tests pass from `backend/`.
- Migrations create a clean PostgreSQL database and seed locations.
- Swagger/OpenAPI accurately describes the deployed `/api/v1` contract.
- Passwords and refresh tokens are never stored in plaintext; sensitive values/content are absent from logs.
- Every database write is authorized and validated.
- Pre-delivery recipient responses do not disclose protected information.
- Multiple worker instances produce one delivery transition, event, stamp, and delivery notification.
- The frontend can register, select location, find a username, send a letter, see pending/delivered mailbox states, and log out without direct database access.
