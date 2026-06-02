using Frets.Core.DTOs.Songs;
using Frets.Core.DTOs.Users;
using Frets.Core.Entities;
using Frets.Infrastructure.Helpers;
using Frets.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Frets.Infrastructure.Services;

public class UserService
{
    private readonly AppDbContext _context;
    private readonly XpService _xpService;
    private readonly ImageService _imageService;

    public UserService(AppDbContext context, XpService xpService, ImageService imageService)
    {
        _context = context;
        _xpService = xpService;
        _imageService = imageService;
    }

    public async Task<bool> IsAdminAsync(Guid userId)
    {
        var role = await _context.Users
            .Where(u => u.Id == userId)
            .Select(u => u.Role)
            .FirstOrDefaultAsync();

        return string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase);
    }

    public async Task<UserProfileResponse?> GetProfileAsync(Guid userId)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

        if (user == null) return null;

        return await MapUserProfileAsync(user);
    }

    public async Task<bool> UpdateChordProgressAsync(Guid userId, Guid chordId, string masteryLevel)
    {
        var validLevels = new[] { "new", "practiced", "mastered" };
        if (!validLevels.Contains(masteryLevel))
            return false;

        var chord = await _context.Chords.FindAsync(chordId);
        if (chord == null) return false;

        var progress = await _context.UserChordProgress
            .FirstOrDefaultAsync(p => p.UserId == userId && p.ChordId == chordId);

        if (progress == null)
        {
            _context.UserChordProgress.Add(new Core.Entities.UserChordProgress
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ChordId = chordId,
                MasteryLevel = masteryLevel,
                FirstSeenAt = DateTime.UtcNow,
                LastPracticed = DateTime.UtcNow
            });

            if (masteryLevel == "mastered")
                await _xpService.AddXpAsync(userId, "chord_learned", XpService.XpValues.ChordLearned, new { chordId });
        }
        else
        {
            if (progress.MasteryLevel != "mastered" && masteryLevel == "mastered")
                await _xpService.AddXpAsync(userId, "chord_learned", XpService.XpValues.ChordLearned, new { chordId });

            progress.MasteryLevel = masteryLevel;
            progress.LastPracticed = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<UserChordProgressResponse>> GetChordProgressAsync(Guid userId)
    {
        return await _context.UserChordProgress
            .Where(p => p.UserId == userId)
            .Include(p => p.Chord)
            .Select(p => new UserChordProgressResponse(
                p.ChordId,
                p.Chord.Key,
                p.Chord.Suffix,
                p.MasteryLevel,
                p.FirstSeenAt,
                p.LastPracticed
            ))
            .ToListAsync();
    }

    public async Task<List<SongResponse>> GetPlayableSongsAsync(Guid userId)
    {
        var masteredChordIds = await _context.UserChordProgress
            .Where(p => p.UserId == userId && p.MasteryLevel == "mastered")
            .Select(p => p.ChordId)
            .ToListAsync();

        var playableSongs = await _context.Songs
            .Where(s => s.Status == "approved")
            .Include(s => s.Artist)
            .Include(s => s.Author)
            .Where(s => s.Versions.Any(v =>
                v.ChordIndex.Any() &&
                v.ChordIndex.All(ci => masteredChordIds.Contains(ci.ChordId))))
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

        Console.WriteLine($"[Playable] {playableSongs.Count} playable songs found");

        return playableSongs;
    }

    public async Task RecordActivityAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        if (user.LastActivityDate == today) return;

        if (user.LastActivityDate == today.AddDays(-1))
            user.CurrentStreak++;
        else
            user.CurrentStreak = 1;

        if (user.CurrentStreak > user.LongestStreak)
            user.LongestStreak = user.CurrentStreak;

        user.LastActivityDate = today;

        await _xpService.AddXpAsync(userId, "daily_login", XpService.XpValues.DailyLogin);

        if (user.CurrentStreak % 7 == 0)
            await _xpService.AddXpAsync(userId, "streak_bonus", XpService.XpValues.StreakBonus);

        await _context.SaveChangesAsync();
    }

    public async Task<PublicUserProfileResponse?> GetPublicProfileAsync(string slug)
    {
        var user = await FindUserBySlugOrUsernameAsync(slug);

        if (user == null) return null;

        var levelLabel = await GetLevelLabelAsync(user.Level);
        var chordsLearned = await CountChordsLearnedAsync(user.Id);
        var songsAdded = await CountSongsAddedAsync(user.Id);
        var imageUrl = await _imageService.ResolveUserImageUrlAsync(user.Id);

        return new PublicUserProfileResponse(
            user.Username,
            user.Slug,
            user.Level,
            levelLabel,
            user.CurrentStreak,
            user.LongestStreak,
            chordsLearned,
            songsAdded,
            user.CreatedAt,
            user.Bio,
            imageUrl
        );
    }

    public async Task<List<ProfileSongItem>> GetUserApprovedSongsAsync(string slug)
    {
        var user = await FindUserBySlugOrUsernameAsync(slug);
        if (user == null) return [];

        return await MapProfileSongsAsync(user.Id, approvedOnly: true);
    }

    public async Task<List<ProfileSongItem>> GetUserPublicDraftsAsync(string slug)
    {
        var user = await FindUserBySlugOrUsernameAsync(slug);
        if (user == null) return [];

        return await MapProfileSongsAsync(user.Id, approvedOnly: false);
    }

    private Task<User?> FindUserBySlugOrUsernameAsync(string slugOrUsername) =>
        _context.Users.FirstOrDefaultAsync(u =>
            !u.IsDeleted && (u.Slug == slugOrUsername || u.Username == slugOrUsername));

    private async Task<List<ProfileSongItem>> MapProfileSongsAsync(Guid authorId, bool approvedOnly)
    {
        var query = _context.Songs
            .Where(s => !s.IsDeleted && s.AuthorId == authorId);

        query = approvedOnly
            ? query.Where(s => s.Status == "approved")
            : query.Where(s =>
                s.Status == null ||
                s.Status.Trim().ToLower() == "draft" ||
                s.Status.Trim().ToLower() == "pending");

        return await query
            .OrderByDescending(s => s.SubmittedAt)
            .ThenBy(s => s.Title)
            .Select(s => new ProfileSongItem(
                s.Id,
                s.Title,
                s.Artist.Name,
                s.Artist.Slug,
                s.TitleSlug,
                s.Status
            ))
            .ToListAsync();
    }

    public async Task<string?> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return "User not found.";

        if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
            return "Current password is incorrect.";

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        await _context.SaveChangesAsync();
        return null;
    }

    public async Task<UserProfileResponse?> UpdateProfileAsync(Guid userId, UpdateUserRequest request)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return null;

        if (!string.IsNullOrEmpty(request.Username))
        {
            var exists = await _context.Users
                .AnyAsync(u => u.Username == request.Username && u.Id != userId);
            if (exists) return null;

            user.Username = request.Username.Trim();
            user.Slug = await UserSlugHelper.GenerateUniqueAsync(_context, user.Username, userId);
        }

        if (request.Bio != null)
            user.Bio = string.IsNullOrWhiteSpace(request.Bio) ? null : request.Bio.Trim();

        await _context.SaveChangesAsync();

        return await MapUserProfileAsync(user);
    }

    private async Task<string> GetLevelLabelAsync(int level) =>
        await _context.LevelThresholds
            .Where(l => l.Level == level)
            .Select(l => l.Label)
            .FirstOrDefaultAsync() ?? "Beginner";

    private Task<int> CountChordsLearnedAsync(Guid userId) =>
        _context.UserChordProgress.CountAsync(p => p.UserId == userId && p.MasteryLevel == "mastered");

    private Task<int> CountSongsAddedAsync(Guid userId) =>
        _context.Songs.CountAsync(s => s.AuthorId == userId && !s.IsDeleted);

    private async Task<UserProfileResponse> MapUserProfileAsync(User user)
    {
        var levelLabel = await GetLevelLabelAsync(user.Level);
        var chordsLearned = await CountChordsLearnedAsync(user.Id);
        var songsAdded = await CountSongsAddedAsync(user.Id);
        var imageUrl = await _imageService.ResolveUserImageUrlAsync(user.Id);

        return new UserProfileResponse(
            user.Id,
            user.Username,
            user.Slug,
            user.Email,
            user.Role,
            user.Xp,
            user.Level,
            levelLabel,
            user.CurrentStreak,
            user.LongestStreak,
            chordsLearned,
            songsAdded,
            user.CreatedAt,
            user.Bio,
            imageUrl
        );
    }

    public async Task<bool> DeleteAccountAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        user.IsDeleted = true;
        user.DeletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<UserProfileResponse>> GetAllUsersAdminAsync()
    {
        return await _context.Users
            .Select(u => new UserProfileResponse(
                u.Id,
                u.Username,
                u.Slug,
                u.Email,
                u.Role,
                u.Xp,
                u.Level,
                "N/A",
                u.CurrentStreak,
                u.LongestStreak,
                0,
                0,
                u.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<bool> DeleteUserAdminAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        user.IsDeleted = true;
        user.DeletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }
}