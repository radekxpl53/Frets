namespace Frets.Core.DTOs.Auth;

public record AuthResponse(
    string Token,
    Guid UserId,
    string Username,
    string Role
);