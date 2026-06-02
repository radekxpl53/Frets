namespace Frets.Core.DTOs.Users;

public record ProfileSongItem(
    Guid Id,
    string Title,
    string Artist,
    string ArtistSlug,
    string TitleSlug,
    string Status
);
