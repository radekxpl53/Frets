using Frets.Core.Entities;
using Frets.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Frets.Infrastructure.Services;

public class XpService
{
    private readonly AppDbContext _context;

    public static class XpValues
    {
        public const int DailyLogin = 10;
        public const int StreakBonus = 25;
        public const int SongAdded = 20;
        public const int SongApproved = 50;
        public const int ChordLearned = 30;
    }

    public XpService(AppDbContext context)
    {
        _context = context;
    }

    public async Task AddXpAsync(Guid userId, string eventType, int xpAmount, object? meta = null)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return;

        user.Xp += xpAmount;

        var newLevel = await _context.LevelThresholds
            .Where(l => l.XpRequired <= user.Xp)
            .OrderByDescending(l => l.Level)
            .Select(l => l.Level)
            .FirstOrDefaultAsync();

        if (newLevel > user.Level)
            user.Level = newLevel;

        _context.XpEvents.Add(new XpEvent
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            EventType = eventType,
            XpAmount = xpAmount,
            Meta = meta != null ? System.Text.Json.JsonSerializer.Serialize(meta) : null,
            CreatedAt = DateTime.UtcNow
        });
    }
}