export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateUsername(username: string): string | null {
  const trimmed = username.trim();
  if (!trimmed) {
    return "Username is required.";
  }
  if (trimmed.length < 3 || trimmed.length > 30) {
    return "Username must be 3-30 characters long.";
  }
  if (!USERNAME_REGEX.test(trimmed)) {
    return "Username must contain only letters, numbers, or underscores.";
  }
  return null;
}

export function validatePassword(password: string, isLogin: boolean = false): string | null {
  if (!password) {
    return "Password is required.";
  }
  if (!isLogin && password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  return null;
}

export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Full name is required.";
  }
  if (trimmed.length > 80) {
    return "Full name must be between 1 and 80 characters.";
  }
  return null;
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return "Email is required.";
  }
  if (!trimmed.includes("@") || !EMAIL_REGEX.test(trimmed)) {
    return "A valid email address is required.";
  }
  return null;
}

export function validateLocation(locationId: string): string | null {
  if (!locationId || !locationId.trim()) {
    return "Please select a home postal location.";
  }
  return null;
}

export function validateUsernameOrEmail(identifier: string): string | null {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return "Username or email is required.";
  }
  return null;
}
