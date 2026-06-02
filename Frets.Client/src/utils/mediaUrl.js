export const API_ORIGIN = "http://localhost:5041";

export default function mediaUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_ORIGIN}/${url.replace(/^\//, "")}`;
}
