namespace Frets.Core.DTOs.Auth;

public record RegisterRequest(
    string Username,
    string Email,
    string Password
);