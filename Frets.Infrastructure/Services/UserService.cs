using Frets.Core.DTOs.Songs;
using Frets.Core.DTOs.Users;
using Frets.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Frets.Infrastructure.Services;

public class UserService
{
	private readonly AppDbContext _context;

	public UserService(AppDbContext context)
	{
		_context = context;
	}

	public async Task<UserProfileResponse?> GetProfileAsync(Guid userId)
	{
		var user = await _context.Users
			.FirstOrDefaultAsync(u => u.Id == userId);

		if (user == null) return null;

		var levelLabel = await _context.LevelThresholds
			.Where(l => l.Level == user.Level)
			.Select(l => l.Label)
			.FirstOrDefaultAsync() ?? "Beginner";

		var chordsLearned = await _context.UserChordProgress
			.CountAsync(p => p.UserId == userId && p.MasteryLevel == "mastered");

		var songsAdded = await _context.Songs
			.CountAsync(s => s.AuthorId == userId);

		return new UserProfileResponse(
			user.Id,
			user.Username,
			user.Email,
			user.Role,
			user.Xp,
			user.Level,
			levelLabel,
			user.CurrentStreak,
			user.LongestStreak,
			chordsLearned,
			songsAdded,
			user.CreatedAt
		);
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
		}
		else
		{
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
				!v.ChordIndex.Any() ||
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

		await AddXpAsync(user, "daily_login", 10, null);

		if (user.CurrentStreak % 7 == 0)
			await AddXpAsync(user, "streak_bonus", 25, null);

		await _context.SaveChangesAsync();
	}

	private async Task AddXpAsync(Core.Entities.User user, string eventType, int xpAmount, object? meta)
	{
		user.Xp += xpAmount;

		var newLevel = await _context.LevelThresholds
			.Where(l => l.XpRequired <= user.Xp)
			.OrderByDescending(l => l.Level)
			.Select(l => l.Level)
			.FirstOrDefaultAsync();

		if (newLevel > user.Level)
			user.Level = newLevel;

		_context.XpEvents.Add(new Core.Entities.XpEvent
		{
			Id = Guid.NewGuid(),
			UserId = user.Id,
			EventType = eventType,
			XpAmount = xpAmount,
			Meta = meta != null ? System.Text.Json.JsonSerializer.Serialize(meta) : null,
			CreatedAt = DateTime.UtcNow
		});
	}

	public async Task<PublicUserProfileResponse?> GetPublicProfileAsync(string username)
	{
		var user = await _context.Users
			.FirstOrDefaultAsync(u => u.Username == username);

		if (user == null) return null;

		var levelLabel = await _context.LevelThresholds
			.Where(l => l.Level == user.Level)
			.Select(l => l.Label)
			.FirstOrDefaultAsync() ?? "Beginner";

		var chordsLearned = await _context.UserChordProgress
			.CountAsync(p => p.UserId == user.Id && p.MasteryLevel == "mastered");

		var songsAdded = await _context.Songs
			.CountAsync(s => s.AuthorId == user.Id);

		return new PublicUserProfileResponse(
			user.Username,
			user.Level,
			levelLabel,
			user.CurrentStreak,
			user.LongestStreak,
			chordsLearned,
			songsAdded,
			user.CreatedAt
		);
	}
}