namespace Frets.Core.DTOs.Artists;

public record ArtistResponse(
    Guid Id,
    string Name,
    string Slug,
    int SongCount
);