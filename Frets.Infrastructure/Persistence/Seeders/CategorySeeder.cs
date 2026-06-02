using Frets.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace Frets.Infrastructure.Persistence.Seeders;

public static class CategorySeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (await context.Categories.AnyAsync())
            return;

        var categories = new[]
        {
            "Rock", "Pop", "Metal", "Blues", "Jazz", "Hip-Hop", "Elektroniczna", "Folk", "Klasyczna", "Inne"
        };

        await context.Categories.AddRangeAsync(categories.Select(name => new Category
        {
            Id = Guid.NewGuid(),
            Name = name,
            Slug = name.ToLower().Replace(" ", "-"),
            IsActive = true
        }));

        await context.SaveChangesAsync();
    }
}
