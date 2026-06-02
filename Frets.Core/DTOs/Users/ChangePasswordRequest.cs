namespace Frets.Core.DTOs.Users;

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
