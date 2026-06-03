/** Pojedynczy placeholder z animacją „shimmer". */
function Skeleton({ width = "100%", height = 12, rounded = false, className = "", style = {} }) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{
        display: "block",
        width,
        height,
        borderRadius: rounded ? "50%" : undefined,
        ...style,
      }}
    />
  );
}

export default Skeleton;
