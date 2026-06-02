namespace Frets.Core.DTOs.Users;

public record RequestEmailChangeRequest(string NewEmail, string CurrentPassword);
