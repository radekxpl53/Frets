using Frets.Core.Helpers;
using Frets.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Frets.Infrastructure.Helpers;

public static class UserSlugHelper
{
    public static async Task<string> GenerateUniqueAsync(
        AppDbContext context,
        string username,
        Guid? excludeUserId = null,
        CancellationToken cancellationToken = default)
    {
        var baseSlug = SlugHelper.Generate(username);
        if (string.IsNullOrEmpty(baseSlug))
            baseSlug = "user";

        var slug = baseSlug;
        var suffix = 2;

        while (await context.Users.AnyAsync(
                   u => u.Slug == slug && (!excludeUserId.HasValue || u.Id != excludeUserId),
                   cancellationToken))
        {
            slug = $"{baseSlug}-{suffix}";
            suffix++;
        }

        return slug;
    }
}
