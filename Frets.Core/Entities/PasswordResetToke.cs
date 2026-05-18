namespace Frets.Core.Entities;

public class PasswordResetToken
{
    public Guid Id { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool Used { get; set; }

    public Guid UserId { get; set; }

    public User User { get; set; } = null!;
}