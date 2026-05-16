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

    public async Task<string?> VoteAsync(Guid songId, Guid userId, bool isPositive)
    {
        var song = await _context.Songs.FirstOrDefaultAsync(s => s.Id == songId);
        if (song == null) return "Song not found.";

        if (song.Status != "pending")
            return "Song is not open for voting.";

        var existingVote = await _context.SongVotes
            .FirstOrDefaultAsync(v => v.SongId == songId && v.UserId == userId);

        if (existingVote != null)
        {
            existingVote.IsPositive = isPositive;
            existingVote.VotedAt = DateTime.UtcNow;
        }
        else
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return "User not found.";

            var weight = user.Level switch
            {
                <= 4 => 1,
                <= 9 => 2,
                _ => 3
            };

            _context.SongVotes.Add(new SongVote
            {
                Id = Guid.NewGuid(),
                SongId = songId,
                UserId = userId,
                IsPositive = isPositive,
                VoteWeight = weight,
                VotedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();
        await CheckVoteThresholdAsync(songId);

        return null;
    }

    private async Task CheckVoteThresholdAsync(Guid songId)
    {
        var votes = await _context.SongVotes
            .Where(v => v.SongId == songId)
            .ToListAsync();

        var totalWeight = votes.Sum(v => v.VoteWeight);
        if (totalWeight < 10) return;

        var positiveWeight = votes.Where(v => v.IsPositive).Sum(v => v.VoteWeight);
        var ratio = (double)positiveWeight / totalWeight;

        var song = await _context.Songs.FindAsync(songId);
        if (song == null) return;

        if (ratio >= 0.8)
        {
            song.Status = "approved";
            song.StatusChangedAt = DateTime.UtcNow;
        }
        else if (totalWeight >= 30)
        {
            song.Status = "rejected";
            song.StatusChangedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }

}