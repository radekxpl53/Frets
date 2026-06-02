import { getYouTubeVideoId } from "../utils/youtubeUtils";

function YouTubeEmbed({ url, title = "YouTube" }) {
  const videoId = getYouTubeVideoId(url);

  if (!videoId) return null;

  return (
    <div className="ratio ratio-16x9 rounded overflow-hidden shadow-sm">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

export default YouTubeEmbed;
