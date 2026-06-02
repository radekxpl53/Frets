namespace Frets.Core.DTOs.Songs;

public record SongMetadataResponse(
    List<SongCategoryResponse> Categories,
    List<SongTuningResponse> Tunings
);

public record SongCategoryResponse(Guid Id, string Name, string Slug);
public record SongTuningResponse(Guid Id, string Name, string Code);
