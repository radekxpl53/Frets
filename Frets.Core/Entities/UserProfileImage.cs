namespace Frets.Core.Entities;

public class UserProfileImage
{
    public Guid UserId { get; set; }
    public Guid ImageId { get; set; }

    public User User { get; set; } = null!;
    public Image Image { get; set; } = null!;
}
