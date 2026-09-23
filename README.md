# Digital Postal

Digital Postal is a deliberate, slow-messaging web application modeled after international postal systems. Instead of instant delivery, letters travel across physical distance over time based on the geographical coordinates of sender and recipient post offices.

Recipients are notified of an incoming dispatch with an estimated arrival time, but the sender identity, origin city, and letter content remain strictly confidential and sealed until the scheduled delivery moment.

---

## Architectural Principles

1. Time-Delayed Transit: Letters calculate deterministic travel time using great-circle distance (Haversine formula) between global postal hubs.
2. Privacy During Transit: While in flight, letters return sealed responses (`RedactedLetterDto`). Sender details and body text are hidden from recipient views until delivered.
3. Immutability: Once sealed and dispatched, the routing coordinates, stamps, and dispatch timestamps cannot be altered.
4. Background Delivery Worker: A background service (`DeliveryProcessor`) evaluates pending dispatches against stored delivery timestamps, updates statuses, logs journey events, and emits delivery notifications.
5. Philatelic Stamp Generation: Letters incorporate generative postage stamps styled with route indicators, denomination values, and procedural artwork.

---

## Repository Structure

```text
digital-postal/
├── backend/
│   ├── src/
│   │   ├── DigitalPostal.Api/          # ASP.NET Core 10 Minimal APIs & Background Services
│   │   ├── DigitalPostal.Domain/       # Domain Entities (Letters, Users, Locations, Stamps)
│   │   └── DigitalPostal.Infrastructure/ # EF Core, PostgreSQL Persistence, Migrations
│   └── tests/
│       ├── DigitalPostal.Api.UnitTests/        # Unit test suite
│       └── DigitalPostal.Api.IntegrationTests/ # End-to-end API integration tests
├── frontend/
│   ├── src/
│   │   ├── app/                        # Next.js 16 App Router pages
│   │   ├── components/                 # React UI components (Shell, Mailbox, Modal, Desk)
│   │   ├── context/                    # AuthContext and state management
│   │   ├── lib/                        # Axios HTTP client, token refresh interceptors
│   │   └── types/                      # TypeScript domain definitions and API envelopes
│   └── public/                         # Static assets and icons
└── README.md
```

---

## Tech Stack

### Backend
- Framework: ASP.NET Core 10 (C#)
- Architecture: Modular Monolith with Minimal API endpoints
- Database: PostgreSQL with Entity Framework Core 10
- Authentication: Stateless JWT access tokens (15-minute expiry) and rotating HTTP-only refresh tokens (14-day expiry)
- Background Jobs: Hosted Services (`BackgroundService`) for delivery processing

### Frontend
- Framework: Next.js 16 (React 19)
- Styling: Tailwind CSS
- Icons: Phosphor Icons
- HTTP Client: Axios with automatic silent token refresh interceptors
- Generative Artwork: Procedural SVG postage stamps via external Stampy API

---

## Prerequisites

Before starting, ensure the following are installed:
- .NET 10 SDK: `dotnet --version` (10.0+)
- Node.js: `node --version` (20.0+)
- PostgreSQL: `psql --version` (15.0+)
- npm: `npm --version` (10.0+)

---

## Setup and Installation

### 1. Database Configuration

Create a dedicated PostgreSQL user and database:

```sql
CREATE USER digitalpostal WITH PASSWORD 'mashdb';
CREATE DATABASE digitalpostal_db OWNER digitalpostal;
GRANT ALL PRIVILEGES ON DATABASE digitalpostal_db TO digitalpostal;
```

### 2. Backend Setup

1. Navigate to the backend API directory:
   ```bash
   cd backend/src/DigitalPostal.Api
   ```

2. Verify or update `appsettings.Development.json` with your database connection details and JWT signing configuration:
   ```json
   {
     "ConnectionStrings": {
       "Postgres": "Host=localhost;Port=5432;Database=digitalpostal_db;Username=digitalpostal;Password=mashdb"
     },
     "Delivery": {
       "PollSeconds": 30,
       "BaseHandlingHours": 4,
       "TransitSpeedKmPerHour": 120,
       "InternationalSurchargeHours": 24
     },
     "Cors": {
       "AllowedOrigins": [
         "http://localhost:3000",
         "http://localhost:5173"
       ]
     },
     "Jwt": {
       "Issuer": "DigitalPostal",
       "Audience": "DigitalPostalWeb",
       "SigningKey": "digital-postal-local-development-secret-key-2026",
       "AccessTokenExpiryMinutes": 15,
       "RefreshTokenExpiryDays": 14
     }
   }
   ```

3. Apply database migrations and execute initial location seeding:
   ```bash
   dotnet ef database update --project ../DigitalPostal.Infrastructure
   ```

4. Launch the ASP.NET Core API server:
   ```bash
   dotnet run
   ```
   The backend API listens on `http://localhost:5271` (or `https://localhost:7198`). Swagger documentation is accessible at `http://localhost:5271/swagger`.

### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file based on `.env.example`:
   ```bash
   cp .env.example .env.local
   ```

   Verify environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:5271/api/v1
   NEXT_PUBLIC_STAMP_API_URL=https://stampyyy.vercel.app/api/stamp
   ```

4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## Delivery Calculation Model

Delivery times are calculated deterministically when a letter is dispatched:

1. Great-Circle Distance:
   `Distance = 2 * R * asin(sqrt(sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)))`
   where `R = 6,371 km`.

2. Travel Duration:
   `TransitHours = (DistanceKm / TransitSpeedKmPerHour)` (default: 120 km/h).

3. Handling and Border Processing:
   - Domestic mail: `BaseHandlingHours` (default: 4 hours).
   - International mail: `BaseHandlingHours + InternationalSurchargeHours` (default: 28 hours).

4. Scheduled Delivery:
   `EstimatedDeliveryAtUtc = SentAtUtc + TotalHours`.

---

## Core API Endpoints

### Authentication
- `POST /api/v1/auth/register`: Create a member profile with designated home post office.
- `POST /api/v1/auth/login`: Authenticate and receive JWT access token + refresh cookie.
- `POST /api/v1/auth/refresh`: Silently exchange refresh cookie for a renewed access token.
- `POST /api/v1/auth/logout`: Revoke active refresh session.

### Letters & Dispatch
- `POST /api/v1/letters`: Dispatch a new letter (supports `Idempotency-Key` header).
- `GET /api/v1/letters/{id}`: Inspect letter by ID (returns redacted view if still in transit).
- `GET /api/v1/letters/{id}/journey`: Retrieve waypoint timeline (restricted for in-transit incoming letters).

### Mailbox Views
- `GET /api/v1/mailbox/incoming`: Cursor-paginated incoming letters (delivered and inbound).
- `GET /api/v1/mailbox/sent`: Cursor-paginated dispatched letters history.

### User & Directory
- `GET /api/v1/me`: Retrieve current authenticated profile.
- `PUT /api/v1/me/location`: Update current home post office location.
- `GET /api/v1/users/search?q={query}`: Search registered recipients with privacy-safe projections.
- `GET /api/v1/locations`: List active global post office stations.

### In-App Notifications
- `GET /api/v1/notifications`: Cursor-paginated alert inbox.
- `POST /api/v1/notifications/{id}/read`: Mark notification as read.

---

## Testing and Verification

### Backend Tests
Execute all unit and integration test suites:
```bash
dotnet test backend/tests/DigitalPostal.Api.UnitTests/DigitalPostal.Api.UnitTests.csproj
dotnet test backend/tests/DigitalPostal.Api.IntegrationTests/DigitalPostal.Api.IntegrationTests.csproj
```

### Frontend Verification
Verify TypeScript compilation and lint compliance:
```bash
cd frontend
npm run lint
npm run build
```

---

## License

This project is licensed under the MIT License.