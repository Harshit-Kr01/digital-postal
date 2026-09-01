// ==========================
// Locations
// ==========================
export interface PostalLocation {
  id: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  isActive: boolean;
}

// ==========================
// Users & Auth
// ==========================
export interface User {
  id: string;
  username: string;
  email: string;
  postalLocationId?: string;
  postalLocation?: PostalLocation;
  createdAtUtc: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  postalLocationId: string;
}

// ==========================
// Letters & Delivery
// ==========================
export type LetterStatus = 
  | 'DRAFT'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'RETURNED'
  | 'FAILED';

export type LetterEventType =
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'ARRIVED_AT_POSTAL_HUB'
  | 'DEPARTED_POSTAL_HUB'
  | 'ARRIVED_AT_DESTINATION'
  | 'DELIVERED'
  | 'RETURNED';

export interface Stamp {
  id: string;
  locationId?: string;
  code: string;
  name: string;
  imageUrl: string;
  description?: string;
  version?: number;
  isActive: boolean;
}

export interface LetterStamp {
  id: string;
  letterId: string;
  stampId: string;
  stamp: Stamp;
  letterEventId?: string;
  appliedAtUtc: string;
}

export interface LetterEvent {
  id: string;
  letterId: string;
  eventType: LetterEventType;
  locationId?: string;
  location?: PostalLocation;
  occurredAtUtc: string;
}

// In-Transit / Mailbox Preview Letter (Sender & Content hidden if still in transit!)
export interface IncomingLetterSummary {
  id: string;
  status: LetterStatus;
  sentAtUtc: string;
  estimatedDeliveryAtUtc: string;
  isDelivered: boolean;
  // Available only after delivery:
  senderUsername?: string;
  originLocation?: PostalLocation;
}

// Full Letter (Available once delivered or for sender in Sent box)
export interface LetterDetail {
  id: string;
  senderId: string;
  senderUsername: string;
  recipientId: string;
  recipientUsername: string;
  originLocation: PostalLocation;
  destinationLocation: PostalLocation;
  content: string;
  status: LetterStatus;
  sentAtUtc: string;
  estimatedDeliveryAtUtc: string;
  deliveredAtUtc?: string;
  events: LetterEvent[];
  stamps: LetterStamp[];
}

export interface SendLetterRequest {
  recipientUsername: string;
  content: string;
  stampIds?: string[];
}

export interface DeliveryEstimateResponse {
  distanceKm: number;
  estimatedHours: number;
  estimatedDeliveryAtUtc: string;
}

// ==========================
// Notifications
// ==========================
export interface Notification {
  id: string;
  userId: string;
  letterId?: string;
  type: string;
  title: string;
  body: string;
  readAtUtc?: string;
  createdAtUtc: string;
}
