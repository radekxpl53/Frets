using System.Reflection;
using System.Text.Json;
using Frets.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace Frets.Infrastructure.Persistence.Seeders;

public static class ChordSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (await context.Chords.AnyAsync())
            return;

        var assembly = Assembly.GetExecutingAssembly();
        var resourceName = assembly.GetManifestResourceNames()
            .First(x => x.EndsWith("guitar.json"));

        using var stream = assembly.GetManifestResourceStream(resourceName)!;
        using var doc = await JsonDocument.ParseAsync(stream);

        var chords = new List<Chord>();

        var keys = doc.RootElement.GetProperty("keys");
        var suffixes = doc.RootElement.GetProperty("suffixes");
        var chordsData = doc.RootElement.GetProperty("chords");

        foreach (var key in keys.EnumerateArray())
        {
            var keyStr = key.GetString()!;

            if (!chordsData.TryGetProperty(keyStr, out var keyChords))
                continue;

            foreach (var chordEntry in keyChords.EnumerateArray())
            {
                var suffix = chordEntry.GetProperty("suffix").GetString()!;

                chords.Add(new Chord
                {
                    Id = Guid.NewGuid(),
                    Key = keyStr,
                    Suffix = suffix
                });
            }
        }

        await context.Chords.AddRangeAsync(chords);
        await context.SaveChangesAsync();
    }
}