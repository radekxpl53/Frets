using Frets.Infrastructure.Helpers;
using Microsoft.EntityFrameworkCore;

namespace Frets.Infrastructure.Persistence.Seeders;

public static class UserSlugSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        var users = await db.Users
            .Where(u => u.Slug == null || u.Slug == "")
            .ToListAsync();

        foreach (var user in users)
            user.Slug = await UserSlugHelper.GenerateUniqueAsync(db, user.Username, user.Id);

        if (users.Count > 0)
            await db.SaveChangesAsync();

        await db.Database.ExecuteSqlRawAsync(
            """
            ALTER TABLE "Users" ALTER COLUMN "Slug" SET NOT NULL;
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_Users_Slug" ON "Users" ("Slug");
            """);
    }
}
