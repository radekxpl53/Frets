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
        var refs = ExtractChordRefs(content);

        var resolved = new HashSet<Guid>();

        // 1) Po jawnym chordId (jeśli istnieje w bazie)
        var explicitIds = refs.Where(r => r.Id.HasValue).Select(r => r.Id!.Value).Distinct().ToList();
        if (explicitIds.Count > 0)
        {
            var validIds = await _context.Chords
                .Where(c => explicitIds.Contains(c.Id))
                .Select(c => c.Id)
                .ToListAsync();
            foreach (var id in validIds) resolved.Add(id);
        }

        // 2) Fallback po nazwie akordu (np. "C", "Am") — naprawia dane bez chordId
        var names = refs
            .Where(r => !string.IsNullOrWhiteSpace(r.Name))
            .Select(r => r.Name!.Trim().ToLowerInvariant())
            .ToHashSet();
        if (names.Count > 0)
        {
            var allChords = await _context.Chords
                .Select(c => new { c.Id, c.Key, c.Suffix })
                .ToListAsync();

            var byName = new Dictionary<string, Guid>();
            foreach (var c in allChords)
                byName[DisplayName(c.Key, c.Suffix).ToLowerInvariant()] = c.Id;

            foreach (var n in names)
                if (byName.TryGetValue(n, out var id))
                    resolved.Add(id);
        }

        // Zawsze wyczyść stary indeks dla tej wersji
        var existing = _context.VersionChordIndex.Where(vci => vci.VersionId == versionId);
        _context.VersionChordIndex.RemoveRange(existing);

        foreach (var chordId in resolved)
        {
            _context.VersionChordIndex.Add(new VersionChordIndex
            {
                VersionId = versionId,
                ChordId = chordId
            });
        }
    }

    private static string DisplayName(string key, string suffix) =>
        suffix == "major" ? key
        : suffix == "minor" ? key + "m"
        : key + suffix;

    private readonly record struct ChordRef(Guid? Id, string? Name);

    private static List<ChordRef> ExtractChordRefs(string content)
    {
        var result = new List<ChordRef>();

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
                        Guid? id = null;
                        string? name = null;

                        if (chord.TryGetProperty("chordId", out var chordIdEl) &&
                            chordIdEl.ValueKind == JsonValueKind.String &&
                            Guid.TryParse(chordIdEl.GetString(), out var parsed))
                        {
                            id = parsed;
                        }

                        if (chord.TryGetProperty("chord", out var nameEl) &&
                            nameEl.ValueKind == JsonValueKind.String)
                        {
                            name = nameEl.GetString();
                        }

                        if (id.HasValue || !string.IsNullOrWhiteSpace(name))
                            result.Add(new ChordRef(id, name));
                    }
                }
            }
        }
        catch (JsonException)
        {
            // niepoprawny JSON — zwracamy pustą listę
        }

        return result;
    }
}
