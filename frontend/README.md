# Digital Postal — Frontend

The web application for **Digital Postal**: slow and intentional messaging where digital letters travel across real geographical distance and time.

Letters remain sealed while in transit. Recipients see that an anonymous letter is coming along with an arrival estimate, but cannot see who sent it or read its contents until delivery.

---

## Design System & Aesthetic Language

The frontend strictly implements the **Stampy design language**:

- **Typography**:
  - **Body & UI**: `DM Sans` for clean, modern readability.
  - **Editorial Accents**: `Playfair Display` (serif italic) for headings and poetic emphasis (`<em>Let it take its time.</em>`).
  - **Technical & Postal Meta**: `DM Mono` for tracking-spaced uppercase eyebrows, journey metrics, timestamps, and route codes.
- **Color Palette**:
  - `--paper`: `#ffffff` (pure white canvas)
  - `--ink`: `#151515` (deep architectural charcoal-black)
  - `--line`: `#e5e5e0` (hairline dividers)
  - `--soft`: `#f8f8f5` (warm surface fills)
  - `--accent`: `#ff5a1f` (international postal vermilion with subtle glow hover states)
- **UI Components**:
  - **Pill Buttons**: `rounded-full` (`border-radius: 999px`) pill buttons with uppercase monospace labels and subtle hover elevation (`translateY(-1.5px)`).
  - **Underline Input Fields**: Architectural inputs with borderless bodies and hairline bottom borders focusing to deep ink (`.field-label`, `.field-title`, `.field-sub`).
  - **Floating Letter Stage**: Realistic envelopes with drop shadow (`.stamp-shadow`) and live animated transit markers.
  - **Floating Dock Navigation**: On mobile viewports (`< 768px`), header navigation pills are tucked away and replaced with an elevated, tactile floating pill dock inspired directly by Stampy (`.mobile-dock-wrapper` & `.apple-dock`), featuring active route indicators, safe-area inset compensation, and a prominent primary writing CTA.

---

## Pages & User Flows

| Route | Screen | Purpose |
|---|---|---|
| `/` | Landing Page | Minimalist hero with editorial copy, call-to-action buttons, and a floating letter card illustrating transit progress and sealed status. |
| `/compose` | Write a Letter | **Writing-first letter sheet**: takes up the majority of the screen for manuscript drafting, with username search on the top-left and a compact route postage stamp nestled in the top-right corner. |
| `/dashboard` | Postal Desk | Overview of active in-transit letters, delivered correspondence archive, and home postal base telemetry. |
| `/settings` | Postal Settings | Manage home postal location (city, country, coordinates) that calculates delivery times for outgoing letters. |
| `/login` & `/register` | Authentication | Clean, centered editorial authentication cards with username, credentials, and home location selection. |

---

## Postage Stamp Integration

Route stamps are fetched from the Stampy dynamic image API:

- **Endpoint**: Configured via `NEXT_PUBLIC_STAMP_API_URL` (defaults to `https://stampyyy.vercel.app/api/stamp`).
- **Pure-Digit Denominations**: Stamps sanitize and drop all currency affixes (`₹`, `$`, `¢`, etc.), rendering pure numerical denominations (`10`, `25`, `50`, `80`) based on physical journey distance.
- **In-Memory Caching**: Fetched SVG representations are cached client-side to prevent redundant network requests and ensure instantaneous renders.

---

## Getting Started

### 1. Environment Setup

Copy `.env.example` to `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:5271/api/v1
NEXT_PUBLIC_STAMP_API_URL=https://stampyyy.vercel.app/api/stamp
```

### 2. Install Dependencies & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 3. Production Build & Verification

```bash
npm run build
```

---

## Seed Demo Accounts

During local backend development, these pre-seeded accounts are available for testing postal routes and delivery simulations:

| Username | City | Password |
|---|---|---|
| `maya_mumbai` | Mumbai, India | `PostalDemo123!` |
| `oliver_london` | London, United Kingdom | `PostalDemo123!` |
| `yuki_tokyo` | Tokyo, Japan | `PostalDemo123!` |
| `alex_nyc` | New York, United States | `PostalDemo123!` |
