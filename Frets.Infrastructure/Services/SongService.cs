using Frets.Core.DTOs.Songs;
using Frets.Core.Entities;
using Frets.Core.Helpers;
using Frets.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Frets.Infrastructure.Services;

public class SongService
{
    private readonly AppDbContext _context;
    private readonly ChordIndexer _chordIndexer;
    private readonly XpService _xpService;

    public SongService(AppDbContext context, ChordIndexer chordIndexer, XpService xpService)
    {
        _context = context;
        _chordIndexer = chordIndexer;
        _xpService = xpService;
    }

    public async Task<List<SongResponse>> GetApprovedSongsAsync(string? genre, string? artist, string? search)
    {
        var query = _context.Songs
            .Where(s => s.Status == "approved")
            .Include(s => s.Artist)
            .Include(s => s.Category)
            .Include(s => s.Author)
            .AsQueryable();

        if (!string.IsNullOrEmpty(genre))
            query = query.Where(s =>
                (s.Category != null && s.Category.Name.ToLower() == genre.ToLower()) ||
                (s.Genre != null && s.Genre.ToLower() == genre.ToLower()));

        if (!string.IsNullOrEmpty(artist))
            query = query.Where(s => s.Artist.Slug == SlugHelper.Generate(artist));

        if (!string.IsNullOrEmpty(search))
            query = query.Where(s =>
                s.Title.ToLower().Contains(search.ToLower()) ||
                s.Artist.Name.ToLower().Contains(search.ToLower()));

        return await query
            .Select(s => new SongResponse(
                s.Id,
                s.Title,
                s.Artist.Name,
                s.Category != null ? s.Category.Name : s.Genre,
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
            .Include(s => s.Category)
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
            song.Category != null ? song.Category.Name : song.Genre,
            song.Status,
            song.Author.Username,
            song.SubmittedAt
        );
    }

    public async Task<Song?> GetBySlugInternalAsync(string artistSlug, string titleSlug)
    {
        return await _context.Songs
            .Include(s => s.Artist)
            .FirstOrDefaultAsync(s =>
                s.Artist.Slug == artistSlug &&
                s.TitleSlug == titleSlug);
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
        var category = await _context.Categories
            .FirstOrDefaultAsync(c => c.Id == request.CategoryId && c.IsActive);
        if (category == null) return null;

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
            Genre = category.Name,
            CategoryId = category.Id,
            AuthorId = authorId,
            Status = "draft"
        };

        _context.Songs.Add(song);

        if (request.Version != null)
        {
            var version = new SongVersion
            {
                Id = Guid.NewGuid(),
                SongId = song.Id,
                VersionType = request.Version.VersionType,
                TuningId = request.Version.TuningId,
                Key = request.Version.Key,
                Capo = request.Version.Capo,
                CreatedAt = DateTime.UtcNow
            };

            var tuning = await _context.Tunings
                .FirstOrDefaultAsync(t => t.Id == request.Version.TuningId && t.IsActive);
            if (tuning == null) return null;
            version.Tuning = tuning.Code;

            _context.SongVersions.Add(version);

            if (request.Version.VersionType == "chords")
            {
                _context.VersionChords.Add(new VersionChords
                {
                    Id = Guid.NewGuid(),
                    VersionId = version.Id,
                    Content = request.Version.Content
                });

                await _chordIndexer.IndexAsync(version.Id, request.Version.Content);
            }
            else
            {
                _context.VersionTabs.Add(new VersionTab
                {
                    Id = Guid.NewGuid(),
                    VersionId = version.Id,
                    Content = request.Version.Content
                });
            }
        }

        await _xpService.AddXpAsync(authorId, "song_added", XpService.XpValues.SongAdded, new { songId = song.Id });

        await _context.SaveChangesAsync();

        return new SongResponse(
            song.Id,
            song.Title,
            artist.Name,
            category.Name,
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
            await _xpService.AddXpAsync(song.AuthorId, "song_approved", XpService.XpValues.SongApproved, new { songId = song.Id });
        }
        else if (totalWeight >= 30)
        {
            song.Status = "rejected";
            song.StatusChangedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }

    public async Task<string?> ChangeStatusAsync(Guid songId, string newStatus)
    {
        var song = await _context.Songs.FindAsync(songId);
        if (song == null) return "Song not found.";

        song.Status = newStatus;
        song.StatusChangedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return null;
    }

    public async Task<SongVersionResponse?> CreateVersionAsync(Guid songId, CreateSongVersionRequest request, Guid authorId)
    {
        var song = await _context.Songs.FindAsync(songId);
        if (song == null) return null;

        if (song.AuthorId != authorId) return null;

        var validTypes = new[] { "chords", "tab" };
        if (!validTypes.Contains(request.VersionType)) return null;

        var version = new SongVersion
        {
            Id = Guid.NewGuid(),
            SongId = songId,
            VersionType = request.VersionType,
            TuningId = request.TuningId,
            Key = request.Key,
            Capo = request.Capo,
            CreatedAt = DateTime.UtcNow
        };

        var tuning = await _context.Tunings
            .FirstOrDefaultAsync(t => t.Id == request.TuningId && t.IsActive);
        if (tuning == null) return null;
        version.Tuning = tuning.Code;

        _context.SongVersions.Add(version);

        if (request.VersionType == "chords")
        {
            _context.VersionChords.Add(new VersionChords
            {
                Id = Guid.NewGuid(),
                VersionId = version.Id,
                Content = request.Content
            });

            await _chordIndexer.IndexAsync(version.Id, request.Content);
        }
        else
        {
            _context.VersionTabs.Add(new VersionTab
            {
                Id = Guid.NewGuid(),
                VersionId = version.Id,
                Content = request.Content
            });
        }

        await _context.SaveChangesAsync();

        return new SongVersionResponse(
            version.Id,
            version.VersionType,
                tuning.Name,
            version.Key,
            version.Capo,
            request.Content
        );
    }

    public async Task<List<SongVersionResponse>> GetVersionsAsync(Guid songId)
    {
        var versions = await _context.SongVersions
            .Include(v => v.TuningEntity)
            .Where(v => v.SongId == songId)
            .ToListAsync();

        var result = new List<SongVersionResponse>();

        foreach (var version in versions)
        {
            string content = string.Empty;

            if (version.VersionType == "chords")
            {
                content = await _context.VersionChords
                    .Where(vc => vc.VersionId == version.Id)
                    .Select(vc => vc.Content)
                    .FirstOrDefaultAsync() ?? string.Empty;
            }
            else
            {
                content = await _context.VersionTabs
                    .Where(vt => vt.VersionId == version.Id)
                    .Select(vt => vt.Content)
                    .FirstOrDefaultAsync() ?? string.Empty;
            }

            result.Add(new SongVersionResponse(
                version.Id,
                version.VersionType,
                version.TuningEntity?.Name ?? version.Tuning,
                version.Key,
                version.Capo,
                content
            ));
        }

        return result;
    }

    public async Task<SongResponse?> UpdateAsync(string artistSlug, string titleSlug, Guid userId, UpdateSongRequest request)
    {
        var song = await _context.Songs
            .Include(s => s.Artist)
            .Include(s => s.Category)
            .Include(s => s.Author)
            .FirstOrDefaultAsync(s =>
                s.Artist.Slug == artistSlug &&
                s.TitleSlug == titleSlug);

        if (song == null) return null;
        if (song.AuthorId != userId) return null;

        if (!string.IsNullOrEmpty(request.Title))
        {
            song.Title = request.Title;
            song.TitleSlug = SlugHelper.Generate(request.Title);
        }

        if (!string.IsNullOrEmpty(request.Genre))
        {
            song.Genre = request.Genre;
            var category = await _context.Categories
                .FirstOrDefaultAsync(c => c.Name.ToLower() == request.Genre.ToLower() && c.IsActive);
            song.CategoryId = category?.Id;
        }

        await _context.SaveChangesAsync();

        return new SongResponse(
            song.Id,
            song.Title,
            song.Artist.Name,
            song.Category != null ? song.Category.Name : song.Genre,
            song.Status,
            song.Author.Username,
            song.SubmittedAt
        );
    }

    public async Task<bool> DeleteAsync(string artistSlug, string titleSlug, Guid userId, bool isAdmin)
    {
        var song = await _context.Songs
            .Include(s => s.Artist)
            .FirstOrDefaultAsync(s =>
                s.Artist.Slug == artistSlug &&
                s.TitleSlug == titleSlug);

        if (song == null) return false;
        if (song.AuthorId != userId && !isAdmin) return false;

        song.IsDeleted = true;
        song.DeletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<SongVersionResponse?> UpdateVersionAsync(Guid versionId, Guid userId, UpdateSongVersionRequest request)
    {
        var version = await _context.SongVersions
            .Include(v => v.Song)
            .Include(v => v.TuningEntity)
            .FirstOrDefaultAsync(v => v.Id == versionId);

        if (version == null) return null;
        if (version.Song.AuthorId != userId) return null;

        if (!string.IsNullOrEmpty(request.Tuning))
        {
            version.Tuning = request.Tuning;
            var tuning = await _context.Tunings
                .FirstOrDefaultAsync(t => t.Name.ToLower() == request.Tuning.ToLower() && t.IsActive);
            version.TuningId = tuning?.Id;
        }

        if (request.Key != null)
            version.Key = request.Key;

        if (request.Capo.HasValue)
            version.Capo = request.Capo.Value;

        if (!string.IsNullOrEmpty(request.Content))
        {
            if (version.VersionType == "chords")
            {
                var versionChords = await _context.VersionChords
                    .FirstOrDefaultAsync(vc => vc.VersionId == versionId);
                if (versionChords != null)
                    versionChords.Content = request.Content;

                await _chordIndexer.IndexAsync(versionId, request.Content);
            }
            else
            {
                var versionTab = await _context.VersionTabs
                    .FirstOrDefaultAsync(vt => vt.VersionId == versionId);
                if (versionTab != null)
                    versionTab.Content = request.Content;
            }
        }

        await _context.SaveChangesAsync();

        var content = version.VersionType == "chords"
            ? await _context.VersionChords
                .Where(vc => vc.VersionId == versionId)
                .Select(vc => vc.Content)
                .FirstOrDefaultAsync() ?? string.Empty
            : await _context.VersionTabs
                .Where(vt => vt.VersionId == versionId)
                .Select(vt => vt.Content)
                .FirstOrDefaultAsync() ?? string.Empty;

        return new SongVersionResponse(
            version.Id,
            version.VersionType,
            version.TuningEntity?.Name ?? version.Tuning,
            version.Key,
            version.Capo,
            content
        );
    }

    public async Task<bool> DeleteVersionAsync(Guid versionId, Guid userId, bool isAdmin)
    {
        var version = await _context.SongVersions
            .Include(v => v.Song)
            .FirstOrDefaultAsync(v => v.Id == versionId);

        if (version == null) return false;
        if (version.Song.AuthorId != userId && !isAdmin) return false;

        _context.SongVersions.Remove(version);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<SongResponse>> GetAllSongsAdminAsync(string? status)
    {
        var query = _context.Songs
            .Include(s => s.Artist)
            .Include(s => s.Category)
            .Include(s => s.Author)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(s => s.Status == status);

        return await query
            .Select(s => new SongResponse(
                s.Id,
                s.Title,
                s.Artist.Name,
                s.Category != null ? s.Category.Name : s.Genre,
                s.Status,
                s.Author.Username,
                s.SubmittedAt
            ))
            .ToListAsync();
    }

    public async Task<SongMetadataResponse> GetMetadataAsync()
    {
        var categories = await _context.Categories
            .Where(c => c.IsActive)
            .OrderBy(c => c.Slug == "inne" ? 1 : 0)
            .ThenBy(c => c.Name)
            .Select(c => new SongCategoryResponse(c.Id, c.Name, c.Slug))
            .ToListAsync();

        var tunings = await _context.Tunings
            .Where(t => t.IsActive)
            .OrderBy(t => t.Name)
            .Select(t => new SongTuningResponse(t.Id, t.Name, t.Code))
            .ToListAsync();

        return new SongMetadataResponse(categories, tunings);
    }
}