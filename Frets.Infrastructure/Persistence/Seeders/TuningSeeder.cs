using Frets.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace Frets.Infrastructure.Persistence.Seeders;

public static class TuningSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (await context.Tunings.AnyAsync())
            return;

        var tunings = new (string Name, string Code)[]
        {
            ("Standard", "standard"),
            ("Drop D", "drop_d"),
            ("Open G", "open_g"),
            ("Open E", "open_e"),
            ("DADGAD", "dadgad"),
        };

        await context.Tunings.AddRangeAsync(tunings.Select(t => new Tuning
        {
            Id = Guid.NewGuid(),
            Name = t.Name,
            Code = t.Code,
            IsActive = true
        }));

        await context.SaveChangesAsync();
    }
}
