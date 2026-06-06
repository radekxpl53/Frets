using Frets.Core.DTOs.Artists;
using Frets.Core.DTOs.Songs;
using Frets.Core.Helpers;
using Frets.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Frets.Infrastructure.Services;

public class ArtistService
{
    private readonly AppDbContext _context;
    private readonly ImageService _imageService;

    public ArtistService(AppDbContext context, ImageService imageService)
    {
        _context = context;
        _imageService = imageService;
    }

    public async Task<List<ArtistResponse>> GetAllAsync(string? search = null, int limit = 10)
    {
        var query = _context.Artists.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(a => a.Name.ToLower().Contains(term));
        }

        var ordered = query
            .Select(a => new
            {
                a.Id,
                a.Name,
                a.Slug,
                SongCount = a.Songs.Count(s => s.Status == "approved"),
                ImagePath = a.ArtistImage != null ? a.ArtistImage.Image.StoragePath : null,
            })
            .OrderBy(a => a.Name);

        var artists = await (string.IsNullOrWhiteSpace(search)
            ? ordered
            : ordered.Take(limit))
            .ToListAsync();

        return artists.Select(a => new ArtistResponse(
            a.Id,
            a.Name,
            a.Slug,
            a.SongCount,
            _imageService.ResolveStoredImageUrl(a.ImagePath)
        )).ToList();
    }

    public async Task<(ArtistResponse Artist, List<SongResponse> Songs)?> GetBySlugAsync(string slug)
    {
        var artist = await _context.Artists
            .Include(a => a.ArtistImage)
            .ThenInclude(ai => ai!.Image)
            .Include(a => a.Songs.Where(s => s.Status == "approved"))
            .ThenInclude(s => s.Author)
            .FirstOrDefaultAsync(a => a.Slug == slug);

        if (artist == null) return null;

        var imageUrl = _imageService.ResolveStoredImageUrl(artist.ArtistImage?.Image.StoragePath);

        var artistResponse = new ArtistResponse(
            artist.Id,
            artist.Name,
            artist.Slug,
            artist.Songs.Count,
            imageUrl
        );

        var songs = artist.Songs.Select(s => new SongResponse(
            s.Id,
            s.Title,
            artist.Name,
            s.Genre,
            s.Status,
            s.Author.Username,
            s.SubmittedAt
        )).ToList();

        return (artistResponse, songs);
    }

    public async Task<(string? Error, ArtistResponse? Artist)> UpdateAsync(Guid id, string name)
    {
        var trimmed = (name ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            return ("Nazwa artysty nie może być pusta.", null);

        var artist = await _context.Artists
            .Include(a => a.ArtistImage)
            .ThenInclude(ai => ai!.Image)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (artist == null)
            return ("Nie znaleziono artysty.", null);

        var newSlug = SlugHelper.Generate(trimmed);
        if (string.IsNullOrWhiteSpace(newSlug))
            return ("Nieprawidłowa nazwa artysty.", null);

        var slugTaken = await _context.Artists
            .AnyAsync(a => a.Slug == newSlug && a.Id != id);
        if (slugTaken)
            return ("Artysta o takiej nazwie już istnieje.", null);

        artist.Name = trimmed;
        artist.Slug = newSlug;
        await _context.SaveChangesAsync();

        var songCount = await _context.Songs
            .CountAsync(s => s.ArtistId == artist.Id && s.Status == "approved");

        return (null, new ArtistResponse(
            artist.Id,
            artist.Name,
            artist.Slug,
            songCount,
            _imageService.ResolveStoredImageUrl(artist.ArtistImage?.Image.StoragePath)
        ));
    }
}
