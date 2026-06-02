import mediaUrl from "../utils/mediaUrl";

const FALLBACK_IMAGE =
  "https://api.dicebear.com/9.x/lorelei-neutral/png?seed=frets-default&size=400";

function EntityAvatar({ imageUrl, size = 96, className = "" }) {
  const src = mediaUrl(imageUrl) || FALLBACK_IMAGE;

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`rounded-circle object-fit-cover ${className}`}
      style={{
        width: size,
        height: size,
        objectFit: "cover",
        border: "2px solid #fff",
        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.12)",
      }}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = FALLBACK_IMAGE;
      }}
    />
  );
}

export default EntityAvatar;
