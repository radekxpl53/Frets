using System.Text.Json;
using Frets.Core.Entities;
using Frets.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Frets.Infrastructure.Services;

public class ChordIndexer
{
    private readonly AppDbContext _context;

    public ChordIndexer(AppDbContext context)
    {
        _context = context;
    }

    public async Task IndexAsync(Guid versionId, string content)
    {
        var chordIds = ExtractChordIds(content);
        if (chordIds.Count == 0) return;

        var validChordIds = await _context.Chords
            .Where(c => chordIds.Contains(c.Id))
            .Select(c => c.Id)
            .ToListAsync();

        var existing = _context.VersionChordIndex
            .Where(vci => vci.VersionId == versionId);
        _context.VersionChordIndex.RemoveRange(existing);

        foreach (var chordId in validChordIds)
        {
            _context.VersionChordIndex.Add(new VersionChordIndex
            {
                VersionId = versionId,
                ChordId = chordId
            });
        }
    }

    private static HashSet<Guid> ExtractChordIds(string content)
    {
        var result = new HashSet<Guid>();

        try
        {
            using var doc = JsonDocument.Parse(content);

            if (!doc.RootElement.TryGetProperty("sections", out var sections))
                return result;

            foreach (var section in sections.EnumerateArray())
            {
                if (!section.TryGetProperty("lines", out var lines))
                    continue;

                foreach (var line in lines.EnumerateArray())
                {
                    if (!line.TryGetProperty("chords", out var chords))
                        continue;

                    foreach (var chord in chords.EnumerateArray())
                    {
                        if (chord.TryGetProperty("chordId", out var chordIdEl) &&
                            chordIdEl.ValueKind == JsonValueKind.String &&
                            Guid.TryParse(chordIdEl.GetString(), out var chordId))
                        {
                            result.Add(chordId);
                        }
                    }
                }
            }
        }
        catch (JsonException)
        {
            // zwracamy pusty json
        }

        return result;
    }
}