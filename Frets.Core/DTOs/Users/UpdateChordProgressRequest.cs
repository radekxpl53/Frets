namespace Frets.Core.DTOs.Users;

public record UpdateChordProgressRequest(
    string MasteryLevel // new | practiced | mastered
);