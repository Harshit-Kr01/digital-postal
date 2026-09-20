// ==========================================
// 1. Locations & Parties (Public Profiles)
// ==========================================

export interface PostalLocation {
  id: string;
  code?: string;
  city: string;
  region?: string;
  country: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
  timeZone?: string;
}

export interface Party {
  id: string;
  username: string;
  displayName: string;
}

// ==========================================
// 2. User & Auth Contracts
// ==========================================

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  locationId?: string;
  location?: PostalLocation;
  createdAtUtc?: string;
}

export interface RegisterRequest {
  username: string;
  displayName: string;
  email: string;
  password: string;
  locationId: string;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface AuthResponse {
  id: string;
  username: string;
  displayName: string;
  email: string;
  location: PostalLocation;
  accessToken: string;
}

export interface RecipientSearchResult {
  id: string;
  username: string;
  displayName: string;
  locationCity: string;
  locationLatitude: number;
  locationLongitude: number;
  locationCountryCode?: string;
}

export interface PagedResult<T> {
  items: T[];
  nextCursor?: string | null;
  hasMore: boolean;
}

// ==========================================
// 3. Letters, Stamps & Postal Journey
// ==========================================

export type LetterStatus = "IN_TRANSIT" | "DELIVERED" | "RETURNED";

export interface LetterStamp {
  id?: string;
  name: string;
  imageUrl: string;
  appliedAtUtc: string;
}

export interface JourneyEvent {
  id?: string;
  type: string;
  occurredAtUtc: string;
  displayLabel: string;
}

export interface IncomingInTransitLetter {
  id: string;
  status: "IN_TRANSIT";
  estimatedDeliveryAtUtc: string;
  displayEstimate: string;
}

export interface DeliveredIncomingLetter {
  id: string;
  status: "DELIVERED";
  sender: Party;
  content: string;
  origin: PostalLocation;
  destination: PostalLocation;
  sentAtUtc: string;
  estimatedDeliveryAtUtc: string;
  deliveredAtUtc: string;
  stamps: LetterStamp[];
  journey?: JourneyEvent[];
}

export type IncomingLetter = IncomingInTransitLetter | DeliveredIncomingLetter;

export interface SentLetter {
  id: string;
  status: LetterStatus;
  recipient: Party;
  content: string;
  destination: PostalLocation;
  sentAtUtc: string;
  estimatedDeliveryAtUtc: string;
  deliveredAtUtc?: string;
  stamps: LetterStamp[];
  journey?: JourneyEvent[];
}

export interface SendLetterRequest {
  recipientId: string;
  content: string;
}

export interface SendLetterResponse {
  id: string;
  recipientId: string;
  sentAtUtc: string;
  estimatedDeliveryAtUtc: string;
  distanceKm: number;
  status: LetterStatus;
}

// ==========================================
// 4. Notifications & API Errors
// ==========================================

export interface AppNotification {
  id: string;
  userId: string;
  letterId?: string;
  title: string;
  body: string;
  readAtUtc?: string;
  createdAtUtc: string;
}

export interface ApiProblemDetails {
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  error?: string | { message?: string };
  message?: string;
  errors?: Record<string, string[] | string> | Array<string | { message?: string }>;
}

