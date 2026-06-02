import { USERNAME_PATTERN } from "./usernameRules";

export const PASSWORD_MESSAGES = {
  required: "Podaj hasło.",
  minLength: "Hasło musi mieć co najmniej 8 znaków.",
  uppercase: "Hasło musi zawierać wielką literę.",
  lowercase: "Hasło musi zawierać małą literę.",
  digit: "Hasło musi zawierać cyfrę.",
  mismatch: "Hasła nie są identyczne.",
};

export function validatePassword(password) {
  if (!password) return PASSWORD_MESSAGES.required;
  if (password.length < 8) return PASSWORD_MESSAGES.minLength;
  if (!/[A-Z]/.test(password)) return PASSWORD_MESSAGES.uppercase;
  if (!/[a-z]/.test(password)) return PASSWORD_MESSAGES.lowercase;
  if (!/[0-9]/.test(password)) return PASSWORD_MESSAGES.digit;
  return null;
}

export function validateEmail(email) {
  const trimmed = email?.trim() ?? "";
  if (!trimmed) return "Podaj adres email.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Nieprawidłowy format adresu email.";
  return null;
}

export function validateUsername(username) {
  const trimmed = username?.trim() ?? "";
  if (!trimmed) return "Podaj nazwę użytkownika.";
  if (!USERNAME_PATTERN.test(trimmed)) {
    return "Nazwa użytkownika może zawierać tylko litery a–z, cyfry i podkreślnik.";
  }
  return null;
}

export function validateRequired(value, message = "To pole jest wymagane.") {
  if (typeof value === "string" && !value.trim()) return message;
  if (value == null || value === "") return message;
  return null;
}
