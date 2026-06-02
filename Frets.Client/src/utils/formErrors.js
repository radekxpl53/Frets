const VALIDATION_MESSAGES_PL = {
  "Username is required.": "Podaj nazwę użytkownika.",
  "Username must be at least 3 characters.": "Nazwa użytkownika musi mieć co najmniej 3 znaki.",
  "Username must not exceed 30 characters.": "Nazwa użytkownika może mieć maksymalnie 30 znaków.",
  "Username can only contain English letters, numbers and underscores.":
    "Nazwa użytkownika może zawierać tylko litery a–z, cyfry i podkreślnik.",
  "Email is required.": "Podaj adres email.",
  "Invalid email format.": "Nieprawidłowy format adresu email.",
  "Email or username is required.": "Podaj email lub nazwę użytkownika.",
  "Password is required.": "Podaj hasło.",
  "Password must be at least 8 characters.": "Hasło musi mieć co najmniej 8 znaków.",
  "Password must contain at least one uppercase letter.":
    "Hasło musi zawierać wielką literę.",
  "Password must contain at least one lowercase letter.":
    "Hasło musi zawierać małą literę.",
  "Password must contain at least one number.": "Hasło musi zawierać cyfrę.",
  "Current password is required.": "Podaj obecne hasło.",
  "Token is required.": "Brak tokenu w linku.",
};

const API_MESSAGES_PL = {
  "Invalid email or password.": "Nieprawidłowy email, nazwa użytkownika lub hasło.",
  "Invalid email, username or password.": "Nieprawidłowy email, nazwa użytkownika lub hasło.",
  "Please confirm your email before logging in.":
    "Potwierdź adres email przed logowaniem.",
  "Username or email already exists.": "Nazwa użytkownika lub email jest już zajęty.",
  "Username already taken.": "Ta nazwa użytkownika jest już zajęta.",
  "Current password is incorrect.": "Obecne hasło jest nieprawidłowe.",
  "New email must be different from the current one.":
    "Nowy email musi być inny niż obecny.",
  "Email is already in use.": "Ten adres email jest już używany.",
  "Invalid or expired token.": "Link jest nieprawidłowy lub wygasł.",
};

const API_FIELD_MAP = {
  Username: "username",
  Email: "email",
  Password: "password",
  Login: "login",
  NewPassword: "newPassword",
  CurrentPassword: "currentPassword",
  ConfirmPassword: "confirmPassword",
  Title: "title",
  Artist: "artist",
  YouTubeUrl: "youTubeUrl",
  CategoryId: "categoryId",
  TuningId: "tuningId",
  Key: "songKey",
  Capo: "capo",
  Content: "content",
  Comment: "comment",
  Token: "token",
  "Version.Content": "content",
  Version: "content",
};

function toFieldKey(apiKey, fieldMap) {
  if (fieldMap[apiKey]) return fieldMap[apiKey];
  if (API_FIELD_MAP[apiKey]) return API_FIELD_MAP[apiKey];
  const last = apiKey.includes(".") ? apiKey.split(".").pop() : apiKey;
  return last.charAt(0).toLowerCase() + last.slice(1);
}

export function translateValidationMessage(message) {
  if (!message || typeof message !== "string") return "Nieprawidłowa wartość.";
  const trimmed = message.trim();
  return VALIDATION_MESSAGES_PL[trimmed] ?? API_MESSAGES_PL[trimmed] ?? trimmed;
}

export function translateApiMessage(message) {
  if (!message || typeof message !== "string") return null;
  return API_MESSAGES_PL[message.trim()] ?? translateValidationMessage(message);
}

/** @returns {{ fields: Record<string, string>, message: string | null }} */
export function parseApiValidationError(err, fieldMap = {}) {
  const data = err?.response?.data;
  const fields = {};

  if (typeof data === "string") {
    return { fields, message: translateApiMessage(data) };
  }

  if (data?.errors && typeof data.errors === "object") {
    for (const [key, raw] of Object.entries(data.errors)) {
      const msgs = Array.isArray(raw) ? raw : [raw];
      const first = msgs.find((m) => typeof m === "string" && m.trim());
      if (!first) continue;
      fields[toFieldKey(key, fieldMap)] = translateValidationMessage(first);
    }
    return { fields, message: null };
  }

  const status = err?.response?.status;
  if (status === 401) {
    return {
      fields: {},
      message: translateApiMessage(data) ?? "Nieprawidłowy email, nazwa użytkownika lub hasło.",
    };
  }

  if (typeof data?.title === "string" && data.title !== "One or more validation errors occurred.") {
    return { fields, message: translateApiMessage(data.title) };
  }

  return { fields, message: null };
}

export function invalidControlProps(error) {
  return { isInvalid: Boolean(error) };
}
