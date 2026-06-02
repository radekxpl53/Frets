/** Ujednolica profil z API (camelCase / PascalCase) i zapewnia slug do linków. */
export function normalizeUserProfile(data) {
  if (!data) return null;

  const username = data.username ?? data.Username ?? "";
  const slug = data.slug ?? data.Slug ?? username;

  return {
    ...data,
    username,
    slug,
    email: data.email ?? data.Email,
    role: data.role ?? data.Role,
    level: data.level ?? data.Level,
  };
}

export function getUserProfilePath(user) {
  const normalized = normalizeUserProfile(user);
  if (!normalized?.slug) return "/profile";
  return `/users/${encodeURIComponent(normalized.slug)}`;
}
