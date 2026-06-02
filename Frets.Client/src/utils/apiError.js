export function getApiError(err, fallback = "Operacja nie powiodła się.") {
  const data = err?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data?.message && typeof data.message === "string") return data.message;
  if (data?.title && typeof data.title === "string") return data.title;
  if (data?.errors && typeof data.errors === "object") {
    const messages = Object.values(data.errors).flat().filter(Boolean);
    if (messages.length > 0) return messages.join(" ");
  }
  if (err?.response?.status === 403) {
    return "Brak uprawnień. Wyloguj się i zaloguj ponownie po nadaniu roli admin.";
  }
  return fallback;
}

export function isAdminUser(user) {
  return user?.role?.toLowerCase() === "admin";
}

export function getSongId(song) {
  return song?.id ?? song?.Id ?? null;
}
