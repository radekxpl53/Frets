namespace Frets.Core.DTOs.Auth;

public record LoginRequest(
    string Email,
    string Password
);