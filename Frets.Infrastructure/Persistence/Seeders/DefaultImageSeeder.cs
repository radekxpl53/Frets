using Frets.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace Frets.Infrastructure.Persistence.Seeders;

public static class DefaultImageSeeder
{
    public static async Task SeedAsync(AppDbContext db, ImageService imageService)
    {
        imageService.EnsureDefaultFilesExist();
        await imageService.SyncSystemDefaultImageRecordsAsync();

        var artistsWithoutImage = await db.Artists
            .Where(a => !db.ArtistImages.Any(ai => ai.ArtistId == a.Id))
            .Select(a => a.Id)
            .ToListAsync();

        foreach (var artistId in artistsWithoutImage)
        {
            await imageService.AssignDefaultArtistImageAsync(artistId);
        }

        var usersWithoutAvatar = await db.Users
            .Where(u => !db.UserProfileImages.Any(ui => ui.UserId == u.Id))
            .Select(u => u.Id)
            .ToListAsync();

        foreach (var userId in usersWithoutAvatar)
        {
            await imageService.AssignDefaultAvatarAsync(userId);
        }
    }
}
