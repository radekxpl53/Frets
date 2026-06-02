using Frets.Infrastructure.Helpers;
using Microsoft.EntityFrameworkCore;

namespace Frets.Infrastructure.Persistence.Seeders;

public static class UserSlugSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        var users = new List<(Guid Id, string Username)>();
        
        var connection = db.Database.GetDbConnection();
        var wasOpen = connection.State == System.Data.ConnectionState.Open;
        if (!wasOpen) await connection.OpenAsync();

        try
        {
            using (var command = connection.CreateCommand())
            {
                command.CommandText = @"SELECT ""Id"", ""Username"" FROM ""Users"" WHERE ""Slug"" IS NULL OR ""Slug"" = '';";
                using (var reader = await command.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        var id = reader.GetGuid(0);
                        var username = reader.GetString(1);
                        users.Add((id, username));
                    }
                }
            }
        }
        finally
        {
            if (!wasOpen) await connection.CloseAsync();
        }

        foreach (var user in users)
        {
            var slug = await UserSlugHelper.GenerateUniqueAsync(db, user.Username, user.Id);
            await db.Database.ExecuteSqlRawAsync(
                @"UPDATE ""Users"" SET ""Slug"" = {0} WHERE ""Id"" = {1}",
                slug, user.Id);
        }

        await db.Database.ExecuteSqlRawAsync(
            """
            ALTER TABLE "Users" ALTER COLUMN "Slug" SET NOT NULL;
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_Users_Slug" ON "Users" ("Slug");
            """);
    }
}