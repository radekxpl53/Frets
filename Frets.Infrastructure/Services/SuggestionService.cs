using Frets.Core.DTOs.Songs;
using Frets.Core.Entities;
using Frets.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Frets.Infrastructure.Services;

public class SuggestionService
{
    private readonly AppDbContext _context;

    public SuggestionService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<SuggestionResponse?> CreateAsync(Guid versionId, Guid authorId, CreateSuggestionRequest request)
    {
        var version = await _context.SongVersions.FindAsync(versionId);
        if (version == null) return null;

        var author = await _context.Users.FindAsync(authorId);
        if (author == null) return null;

        var suggestion = new VersionSuggestion
        {
            Id = Guid.NewGuid(),
            VersionId = versionId,
            AuthorId = authorId,
            Content = request.Content,
            Comment = request.Comment,
            Status = "pending",
            CreatedAt = DateTime.UtcNow
        };

        _context.VersionSuggestions.Add(suggestion);
        await _context.SaveChangesAsync();

        return new SuggestionResponse(
            suggestion.Id,
            suggestion.Content,
            suggestion.Status,
            suggestion.Comment,
            author.Username,
            suggestion.CreatedAt
        );
    }

    public async Task<List<SuggestionResponse>> GetByVersionAsync(Guid versionId)
    {
        return await _context.VersionSuggestions
            .Where(s => s.VersionId == versionId)
            .Include(s => s.Author)
            .Select(s => new SuggestionResponse(
                s.Id,
                s.Content,
                s.Status,
                s.Comment,
                s.Author.Username,
                s.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<string?> VoteAsync(Guid suggestionId, Guid userId, bool isPositive)
    {
        var suggestion = await _context.VersionSuggestions.FindAsync(suggestionId);
        if (suggestion == null) return "Suggestion not found.";

        if (suggestion.Status != "pending")
            return "Suggestion is not open for voting.";

        var existingVote = await _context.SuggestionVotes
            .FirstOrDefaultAsync(v => v.SuggestionId == suggestionId && v.UserId == userId);

        if (existingVote != null)
        {
            existingVote.IsPositive = isPositive;
            existingVote.VotedAt = DateTime.UtcNow;
        }
        else
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return "User not found.";

            var weight = user.Level switch
            {
                <= 4 => 1,
                <= 9 => 2,
                _ => 3
            };

            _context.SuggestionVotes.Add(new SuggestionVote
            {
                Id = Guid.NewGuid(),
                SuggestionId = suggestionId,
                UserId = userId,
                IsPositive = isPositive,
                VoteWeight = weight,
                VotedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();
        await CheckVoteThresholdAsync(suggestionId);

        return null;
    }

    private async Task CheckVoteThresholdAsync(Guid suggestionId)
    {
        var votes = await _context.SuggestionVotes
            .Where(v => v.SuggestionId == suggestionId)
            .ToListAsync();

        var totalWeight = votes.Sum(v => v.VoteWeight);
        if (totalWeight < 10) return;

        var positiveWeight = votes.Where(v => v.IsPositive).Sum(v => v.VoteWeight);
        var ratio = (double)positiveWeight / totalWeight;

        var suggestion = await _context.VersionSuggestions
            .Include(s => s.SongVersion)
            .FirstOrDefaultAsync(s => s.Id == suggestionId);
        if (suggestion == null) return;

        if (ratio >= 0.8)
        {
            if (suggestion.SongVersion.VersionType == "chords")
            {
                var versionChords = await _context.VersionChords
                    .FirstOrDefaultAsync(vc => vc.VersionId == suggestion.VersionId);
                if (versionChords != null)
                    versionChords.Content = suggestion.Content;
            }
            else
            {
                var versionTab = await _context.VersionTabs
                    .FirstOrDefaultAsync(vt => vt.VersionId == suggestion.VersionId);
                if (versionTab != null)
                    versionTab.Content = suggestion.Content;
            }

            suggestion.Status = "approved";
            suggestion.ReviewedAt = DateTime.UtcNow;
        }
        else if (totalWeight >= 30)
        {
            suggestion.Status = "rejected";
            suggestion.ReviewedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }

    public async Task<string?> AdminReviewAsync(Guid suggestionId, string status)
    {
        var suggestion = await _context.VersionSuggestions
            .Include(s => s.SongVersion)
            .FirstOrDefaultAsync(s => s.Id == suggestionId);

        if (suggestion == null) return "Suggestion not found.";

        if (status == "approved")
        {
            if (suggestion.SongVersion.VersionType == "chords")
            {
                var versionChords = await _context.VersionChords
                    .FirstOrDefaultAsync(vc => vc.VersionId == suggestion.VersionId);
                if (versionChords != null)
                    versionChords.Content = suggestion.Content;
            }
            else
            {
                var versionTab = await _context.VersionTabs
                    .FirstOrDefaultAsync(vt => vt.VersionId == suggestion.VersionId);
                if (versionTab != null)
                    versionTab.Content = suggestion.Content;
            }
        }

        suggestion.Status = status;
        suggestion.ReviewedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return null;
    }

}