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

    public async Task<List<SuggestionResponse>> GetByVersionAsync(Guid versionId, Guid? userId = null)
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
                s.CreatedAt,
                _context.SuggestionVotes
                    .Where(v => v.SuggestionId == s.Id && v.IsPositive)
                    .Sum(v => (int?)v.VoteWeight) ?? 0,
                _context.SuggestionVotes
                    .Where(v => v.SuggestionId == s.Id && !v.IsPositive)
                    .Sum(v => (int?)v.VoteWeight) ?? 0,
                userId.HasValue
                    ? _context.SuggestionVotes
                        .Where(v => v.SuggestionId == s.Id && v.UserId == userId.Value)
                        .Select(v => (bool?)v.IsPositive)
                        .FirstOrDefault()
                    : null
            ))
            .ToListAsync();
    }

    public async Task<VoteSummaryDto> GetSuggestionVoteSummaryAsync(Guid suggestionId, Guid? userId = null)
    {
        var votes = await _context.SuggestionVotes
            .Where(v => v.SuggestionId == suggestionId)
            .ToListAsync();

        var positive = votes.Where(v => v.IsPositive).Sum(v => v.VoteWeight);
        var negative = votes.Where(v => !v.IsPositive).Sum(v => v.VoteWeight);
        bool? userVote = userId.HasValue
            ? votes.FirstOrDefault(v => v.UserId == userId.Value)?.IsPositive
            : null;

        return new VoteSummaryDto(positive, negative, userVote);
    }

    public async Task<(string? Error, VoteSummaryDto? Summary)> VoteAsync(Guid suggestionId, Guid userId, bool isPositive)
    {
        var suggestion = await _context.VersionSuggestions.FindAsync(suggestionId);
        if (suggestion == null) return ("Suggestion not found.", null);

        if (suggestion.Status != "pending")
            return ("Suggestion is not open for voting.", null);

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
            if (user == null) return ("User not found.", null);

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

        var summary = await GetSuggestionVoteSummaryAsync(suggestionId, userId);
        return (null, summary);
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

    public async Task<bool> DeleteAsync(Guid suggestionId, Guid userId, bool isAdmin)
    {
        var suggestion = await _context.VersionSuggestions
            .FirstOrDefaultAsync(s => s.Id == suggestionId);

        if (suggestion == null) return false;
        if (suggestion.AuthorId != userId && !isAdmin) return false;

        _context.VersionSuggestions.Remove(suggestion);
        await _context.SaveChangesAsync();
        return true;
    }
}