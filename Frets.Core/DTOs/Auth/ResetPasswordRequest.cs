namespace Frets.Core.DTOs.Auth;

public record ResetPasswordRequest(string Token, string NewPassword);