namespace Frets.Core.DTOs.Auth;

public record LoginRequest(
    string Login,
    string Password
);