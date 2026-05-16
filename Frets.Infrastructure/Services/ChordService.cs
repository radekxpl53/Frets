using Frets.Core.DTOs.Chords;
using Frets.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Frets.Infrastructure.Services;

public class ChordService
{
    private readonly AppDbContext _context;

    public ChordService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ChordResponse>> GetAllAsync()
    {
        return await _context.Chords
            .Select(c => new ChordResponse(c.Id, c.Key, c.Suffix))
            .ToListAsync();
    }

    public async Task<ChordResponse?> GetByKeyAndSuffixAsync(string key, string suffix)
    {
        var chord = await _context.Chords
            .FirstOrDefaultAsync(c => c.Key == key && c.Suffix == suffix);

        if (chord == null) return null;

        return new ChordResponse(chord.Id, chord.Key, chord.Suffix);
    }
}