namespace Frets.Core.DTOs.Songs;

public record VoteSummaryDto(
    int PositiveVoteWeight,
    int NegativeVoteWeight,
    bool? UserVoteIsPositive
);
