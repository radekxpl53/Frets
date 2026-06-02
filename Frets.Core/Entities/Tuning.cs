namespace Frets.Core.Entities;

public class Tuning
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public ICollection<SongVersion> Versions { get; set; } = [];
}
