# Digital Postal Messaging App

## 1. Product Idea

Build a web application where users can send digital letters to other users.

The main concept is that letters are **not delivered immediately**.

Instead, after a user sends a letter, the system calculates an estimated delivery time based on the postal locations of the sender and recipient. The recipient must wait until the letter is delivered.

The experience should feel similar to sending physical mail.

### Example

A user in Mumbai sends a letter to a user in London.

Instead of receiving the message immediately, the recipient sees:

> Someone has sent you a letter.
> Estimated arrival: 3 days.

The recipient knows that a letter is coming, but **does not know who sent it or what it contains**.

Once the delivery time is reached, the recipient can open the letter and see:

* Who sent it
* The message
* Where it came from
* The postal journey
* Stamps associated with the journey

The goal is to create a fun and unusual alternative to instant messaging based on **anticipation, waiting, and the feeling of physical mail**.

---

# 2. Core Product Rules

### Rule 1: Messages are delayed

A message is not delivered immediately.

Every dispatched letter has an estimated delivery time.

### Rule 2: The recipient does not know the sender before delivery

Before delivery, the recipient can only know that a letter is in transit.

They cannot see:

* Sender
* Message content
* Origin location
* Sender identity
* Location-specific stamps
* Detailed journey information that could reveal the origin

### Rule 3: A dispatched letter is immutable

Once a letter has been sent, its essential delivery information should not change.

For example, if a recipient changes their location after a letter has been sent, the existing letter should continue to travel to its original destination.

### Rule 4: Delivery is based on stored timestamps

The system should calculate and store a delivery time.

It should not keep an individual timer running for every letter.

A background worker should find letters whose delivery time has been reached and mark them as delivered.

### Rule 5: Location is used for postal simulation

Users have a postal location rather than exposing their exact physical address.

For example:

* Mumbai, India
* London, UK
* Tokyo, Japan
* New York, USA

The system can use location coordinates internally to calculate distance.

---

# 3. Initial Architecture

Use a **modular monolith**, not microservices.

The initial architecture should be:

```text
Frontend
    |
    | REST / JSON over HTTPS
    |
ASP.NET Core Backend
    |
    +-- Authentication
    +-- Users
    +-- Locations
    +-- Letters
    +-- Mailbox
    +-- Delivery
    +-- Stamps
    +-- Notifications
    +-- Background Worker
    |
PostgreSQL Database
```

The backend should be one ASP.NET Core application.

The frontend framework can be chosen by the other developer.

The two developers should communicate through a clearly defined REST API contract.

---

# 4. Technology Direction

## Backend

Use:

* ASP.NET Core
* C#
* Entity Framework Core
* PostgreSQL
* ASP.NET Core BackgroundService for delivery processing
* REST API
* OpenAPI / Swagger for API documentation

## Frontend

The frontend developer can choose the framework.

Possible choices include React, Next.js, Vue, etc.

The frontend communicates with the backend only through the REST API.

---

# 5. Main Domain Entities

The initial system should contain these main entities.

## User

Contains account information and the user's current postal location.

Example fields:

```text
Id
Username
DisplayName
Email
PasswordHash
CurrentLocationId
TimeZone
CreatedAtUtc
Status
```

## Location

Represents a postal location.

Example fields:

```text
Id
Code
City
Region
Country
CountryCode
Latitude
Longitude
TimeZone
IsActive
```

Locations should be selected from a predefined list.

## Letter

Represents the actual message being mailed.

Example fields:

```text
Id
SenderId
RecipientId
OriginLocationId
DestinationLocationId
Content
Status
SentAtUtc
EstimatedDeliveryAtUtc
DeliveredAtUtc
CreatedAtUtc
```

The origin and destination should represent the locations at the time the letter was sent.

## LetterEvent

Represents events in the postal journey.

Example:

```text
Id
LetterId
EventType
LocationId
OccurredAtUtc
```

Possible event types:

```text
DISPATCHED
IN_TRANSIT
ARRIVED_AT_POSTAL_HUB
DEPARTED_POSTAL_HUB
ARRIVED_AT_DESTINATION
DELIVERED
RETURNED
```

The MVP can initially use only a small subset of these events.

## Stamp

Represents a postal stamp associated with a location.

Example fields:

```text
Id
LocationId
Code
Name
ImageUrl
Description
Version
IsActive
```

## LetterStamp

Associates a stamp with a letter.

Example fields:

```text
Id
LetterId
StampId
LetterEventId
AppliedAtUtc
```

A letter should be able to have multiple stamps.

## Notification

Represents notifications shown to users.

Example fields:

```text
Id
UserId
LetterId
Type
Title
Body
ReadAtUtc
CreatedAtUtc
```

---

# 6. Location Snapshot Concept

When a letter is sent, the system should preserve the sender and recipient postal locations used for that delivery.

Example:

```text
At time of sending:

Sender location = Mumbai
Recipient location = London
```

The letter stores:

```text
Origin = Mumbai
Destination = London
```

If the recipient later changes their location to Paris, the existing letter should still be delivered to London.

Only future letters should use the new location.

This is important for both correctness and predictable delivery times.

---

# 7. Delivery Calculation

The initial implementation can use a distance-based calculation.

The backend knows:

```text
Origin coordinates
Destination coordinates
```

Calculate the approximate distance between them using the Haversine formula.

Then calculate an estimated travel time.

Example concept:

```text
Delivery Time =
Base Handling Time
+
Distance / Simulated Transit Speed
+
Optional International Handling Time
```

Example configuration:

```text
Base handling: 4 hours
Simulated transit speed: 120 km/hour
International handling: 24 hours
```

The exact values are product decisions and should be configurable rather than hardcoded throughout the application.

The delivery calculation should be isolated behind a service/interface so it can later be replaced by a more sophisticated postal-routing system.

Example:

```csharp
IDeliveryTimeCalculator
```

Possible future implementations:

* Simple distance-based calculation
* Postal zone calculation
* Postal hub routing
* Country-specific rules
* Weekend/holiday delays
* More realistic simulated transit times

---

# 8. Sending a Letter

When a user presses "Send":

1. Authenticate the sender.
2. Load the sender's current postal location.
3. Load the recipient.
4. Load the recipient's current postal location.
5. Create the origin and destination snapshot for the letter.
6. Calculate the distance.
7. Calculate the delivery duration.
8. Calculate and store the estimated delivery time.
9. Create the letter with status `IN_TRANSIT`.
10. Create a `DISPATCHED` event.
11. Apply the appropriate origin stamp.
12. Create an anonymous notification for the recipient.
13. Commit everything in one database transaction.
14. Return the letter ID and delivery information to the sender.

The recipient notification should not contain the sender identity or message content.

---

# 9. Background Delivery Worker

Use an ASP.NET Core `BackgroundService`.

The worker periodically checks for letters where:

```text
Status = IN_TRANSIT
AND
EstimatedDeliveryAtUtc <= current time
```

For each matching letter:

1. Acquire/process the letter safely.
2. Change status to `DELIVERED`.
3. Set `DeliveredAtUtc`.
4. Create a `DELIVERED` event.
5. Apply the destination stamp.
6. Create a delivery notification.
7. Commit the changes.

The processing must be safe if multiple worker instances exist or the application restarts.

The system should use database state rather than in-memory timers.

---

# 10. Recipient Experience

Immediately after a letter is dispatched, the recipient should see something like:

```text
Someone has sent you a letter.

Estimated arrival:
September 3, 2026
```

The recipient can know:

* A letter exists
* It is in transit
* Approximate/estimated delivery time
* Basic status

The recipient cannot know:

* Sender
* Message
* Origin
* Origin stamp
* Detailed route
* Other information that could reveal the sender

After delivery, the recipient sees the complete letter.

Example:

```text
A letter has arrived.

From: Rahul

[Message]

Hey...
```

They can also see the associated postal stamps and journey.

---

# 11. API Design

The API should be versioned.

Base path:

```text
/api/v1
```

## Authentication

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

## Current User

```text
GET /api/v1/me
PUT /api/v1/me/location
```

## Locations

```text
GET /api/v1/locations
GET /api/v1/locations/search?q=
GET /api/v1/locations/{id}
```

## Users / Recipient Search

```text
GET /api/v1/users/search?q=
```

Search results should expose only information needed to select a recipient.

Do not expose private location or email information unnecessarily.

## Letters

```text
POST /api/v1/letters
GET /api/v1/letters/{id}
```

## Mailbox

```text
GET /api/v1/mailbox/incoming
GET /api/v1/mailbox/incoming/{id}
GET /api/v1/mailbox/sent
GET /api/v1/mailbox/sent/{id}
```

## Journey

```text
GET /api/v1/letters/{id}/journey
```

The returned information must depend on the user's relationship to the letter and whether the letter has been delivered.

## Notifications

```text
GET /api/v1/notifications
POST /api/v1/notifications/{id}/read
```

## Stamps

```text
GET /api/v1/stamps
GET /api/v1/stamps/{id}
GET /api/v1/locations/{id}/stamps
```

---

# 12. Important Authorization Rule

The backend must enforce different visibility rules depending on the user and the letter status.

## Sender

The sender can see:

* Recipient
* Message
* Destination
* Delivery time
* Journey
* Stamps
* Current status

## Recipient, before delivery

The recipient can see:

* Letter exists
* Delivery estimate
* Basic status

The recipient cannot see:

* Sender
* Message
* Origin
* Origin location
* Location-specific stamps
* Detailed route information

## Recipient, after delivery

The recipient can see:

* Sender
* Message
* Origin
* Destination
* Journey
* Stamps
* Delivery information

These rules must be enforced in the backend.

The frontend should not simply receive the sensitive information and hide it.

---

# 13. Stamp System

Stamps are part of the postal identity of the application.

Each location can have its own stamps.

Example:

```text
Mumbai
- Gateway of India
- Mumbai Skyline
- Maharashtra Special
```

London could have its own stamps.

When a letter passes through a location, a stamp can be applied.

For the MVP:

```text
Origin stamp
Destination stamp
```

Later:

```text
Origin
    ↓
Transit location
    ↓
Transit location
    ↓
Destination
```

could result in multiple stamps.

The stamp associated with a delivered letter should not change if the original stamp design is later updated.

---

# 14. Future Postal Journey

A more advanced version can simulate real postal routing.

Example:

```text
Mumbai
   ↓
Mumbai Sorting Office
   ↓
International Dispatch
   ↓
Dubai Postal Hub
   ↓
London Sorting Office
   ↓
London Local Delivery
   ↓
Recipient
```

Each step can create a `LetterEvent`.

The frontend can display the journey visually.

This should be added later; the MVP only needs the basic delivery state.

---

# 15. Database and Data Integrity

Use PostgreSQL.

Important relationships:

```text
User → Location
Letter → Sender User
Letter → Recipient User
Letter → Origin Location
Letter → Destination Location
LetterEvent → Letter
LetterStamp → Letter
LetterStamp → Stamp
Stamp → Location
Notification → User
Notification → Letter
```

Useful database indexes include:

```text
Users.Username
Users.Email

Letters.SenderId
Letters.RecipientId
Letters.Status
Letters.EstimatedDeliveryAtUtc

LetterEvents.LetterId

Notifications.UserId
Notifications.ReadAtUtc
```

The delivery worker's query should be optimized because it will frequently search for due letters.

---

# 16. Backend Project Structure

A simple modular structure is preferred.

Example:

```text
Backend
│
├── Features
│   ├── Auth
│   ├── Users
│   ├── Locations
│   ├── Letters
│   ├── Mailbox
│   ├── Stamps
│   └── Notifications
│
├── Domain
│   ├── Entities
│   ├── Enums
│   ├── ValueObjects
│   └── Services
│
├── Infrastructure
│   ├── Persistence
│   ├── Identity
│   └── Repositories
│
├── Workers
│   └── DeliveryWorker
│
└── Program.cs
```

Do not introduce unnecessary layers or microservices in the first version.

---

# 17. Development Split Between Two Developers

## Backend developer

Responsible for:

* ASP.NET Core
* REST API
* PostgreSQL
* Entity Framework Core
* Authentication
* Letter logic
* Delivery calculation
* Background worker
* Stamps
* Notifications
* API documentation

## Frontend developer

Responsible for:

* Frontend framework
* Login/register UI
* User profile
* Location selection
* Recipient search
* Letter composition
* Send experience
* Mailbox
* Countdown / delivery status
* Delivered letter experience
* Stamp display
* Postal journey UI
* Animations and visual design

Both developers should agree on the API contract before implementation.

Swagger/OpenAPI should be used as the shared backend/frontend contract.

---

# 18. Security and Abuse Prevention

Basic protections should exist in the MVP.

### Authentication

Passwords must be securely hashed.

Use HTTPS.

Use appropriate authentication/session/token handling.

### Rate limiting

Prevent a user from sending an unlimited number of letters.

For example:

```text
Maximum letters per hour
Maximum letters per day
Maximum message size
```

### Blocking

A future version should allow users to block another user from sending letters.

### Reporting

A future version should allow users to report abusive letters.

### Logging

Do not log letter content in application logs.

Sensitive message content should never appear in normal production logs.

---

# 19. MVP Scope

The first version should remain small.

Build:

```text
User registration/login
User profiles
Postal location selection
Recipient search
Send letter
Distance-based delivery calculation
Stored delivery time
Background delivery worker
Anonymous incoming mailbox
Sent mailbox
Delivered letters
Basic notifications
Basic location-based stamps
```

Do not start with:

```text
Microservices
Complex routing engine
Real-world postal APIs
Advanced social features
Collectible economy
Complex notification infrastructure
Large-scale analytics
```

The first goal is to determine whether the core experience is enjoyable.

---

# 20. Future Features

Potential future features include:

```text
Multiple postal stamps
Postmarks
Postal hubs
Detailed journey tracking
Postcards
Images
Audio letters
Express mail
Registered mail
Scheduled letters
Return-to-sender
Blocking
Reporting
Rare/collectible stamps
Seasonal stamps
Achievements
Special delivery types
More realistic postal simulation
```

---

# 21. Core System Flow

The complete initial flow is:

```text
User
  ↓
Select recipient
  ↓
Write letter
  ↓
Press Send
  ↓
Backend authenticates sender
  ↓
Load sender location
  ↓
Load recipient location
  ↓
Create location snapshots
  ↓
Calculate distance
  ↓
Calculate delivery duration
  ↓
Calculate delivery timestamp
  ↓
Create letter
  ↓
Status = IN_TRANSIT
  ↓
Create DISPATCHED event
  ↓
Apply origin stamp
  ↓
Notify recipient anonymously
  ↓
Wait
  ↓
Background Worker detects delivery time
  ↓
Change status to DELIVERED
  ↓
Create DELIVERED event
  ↓
Apply destination stamp
  ↓
Notify recipient
  ↓
Recipient opens letter
  ↓
Sender + content + journey + stamps become visible
```

---

# 22. Architectural Principles

The implementation should follow these principles:

1. Keep the backend as one modular ASP.NET Core service.
2. Use REST APIs as the frontend/backend boundary.
3. Keep delivery state in PostgreSQL, not in application memory.
4. Keep delivery calculation isolated behind a service.
5. Treat dispatched letters as immutable.
6. Preserve origin and destination for existing letters.
7. Enforce anonymity in the backend.
8. Keep stamps as separate entities so the system can grow later.
9. Use background processing for delivery.
10. Prefer simple architecture for the MVP and extract services only if there is a real need later.

---

# 23. Main Goal

The technical architecture exists to support one central product experience:

> **Someone sent you a letter. You know it is coming, but you have to wait to discover who sent it and what it says.**

The application should make that waiting period feel intentional, interesting, and similar to the experience of physical mail.
