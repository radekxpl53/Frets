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

}