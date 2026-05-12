using Frets.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace Frets.Infrastructure.Persistence.Seeders;

public static class LevelThresholdSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (await context.LevelThresholds.AnyAsync())
            return;

        var levels = new List<LevelThreshold>
        {
            new() { Level = 1,  XpRequired = 0,    Label = "Beginner" },
            new() { Level = 2,  XpRequired = 100,  Label = "Novice" },
            new() { Level = 3,  XpRequired = 250,  Label = "Amateur" },
            new() { Level = 4,  XpRequired = 500,  Label = "Guitarist" },
            new() { Level = 5,  XpRequired = 900,  Label = "Regular" },
            new() { Level = 6,  XpRequired = 1400, Label = "Advanced" },
            new() { Level = 7,  XpRequired = 2000, Label = "Experienced" },
            new() { Level = 8,  XpRequired = 2800, Label = "Expert" },
            new() { Level = 9,  XpRequired = 3800, Label = "Veteran" },
            new() { Level = 10, XpRequired = 5000, Label = "Virtuoso" },
        };

        await context.LevelThresholds.AddRangeAsync(levels);
        await context.SaveChangesAsync();
    }
}