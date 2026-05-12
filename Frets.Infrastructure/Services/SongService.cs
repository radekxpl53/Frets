using Frets.Core.DTOs.Songs;
using Frets.Core.Entities;
using Frets.Core.Helpers;
using Frets.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Frets.Infrastructure.Services;

public class SongService
{
    private readonly AppDbContext _context;

    public SongService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<SongResponse>> GetApprovedSongsAsync()
    {
        return await _context.Songs
            .Where(s => s.Status == "approved")
            .Include(s => s.Artist)
            .Include(s => s.Author)
            .Select(s => new SongResponse(
                s.Id,
                s.Title,
                s.Artist.Name,
                s.Genre,
                s.Status,
                s.Author.Username,
                s.SubmittedAt
            ))
            .ToListAsync();
    }

    public async Task<SongResponse?> GetBySlugAsync(string artistSlug, string titleSlug)
    {
        var song = await _context.Songs
            .Include(s => s.Artist)
            .Include(s => s.Author)
            .FirstOrDefaultAsync(s =>
                s.Artist.Slug == artistSlug &&
                s.TitleSlug == titleSlug &&
                s.Status == "approved");

        if (song == null) return null;

        return new SongResponse(
            song.Id,
            song.Title,
            song.Artist.Name,
            song.Genre,
            song.Status,
            song.Author.Username,
            song.SubmittedAt
        );
    }

    public async Task<SongResponse?> CreateAsync(CreateSongRequest request, Guid authorId)
    {
        var artistSlug = SlugHelper.Generate(request.Artist);
        var artist = await _context.Artists
            .FirstOrDefaultAsync(a => a.Slug == artistSlug);

        if (artist == null)
        {
            artist = new Artist
            {
                Id = Guid.NewGuid(),
                Name = request.Artist,
                Slug = artistSlug
            };
            _context.Artists.Add(artist);
        }

        var titleSlug = SlugHelper.Generate(request.Title);

        var exists = await _context.Songs.AnyAsync(s =>
            s.ArtistId == artist.Id &&
            s.TitleSlug == titleSlug);

        if (exists) return null;

        var author = await _context.Users.FindAsync(authorId);
        if (author == null) return null;

        var song = new Song
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            TitleSlug = titleSlug,
            ArtistId = artist.Id,
            Genre = request.Genre,
            AuthorId = authorId,
            Status = "draft"
        };

        _context.Songs.Add(song);
        await _context.SaveChangesAsync();

        return new SongResponse(
            song.Id,
            song.Title,
            artist.Name,
            song.Genre,
            song.Status,
            author.Username,
            song.SubmittedAt
        );
    }
}