namespace Frets.Core.DTOs.Users;

public record UpdateUserRequest(
    string? Username,
    string? Bio = null
);