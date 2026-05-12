namespace Frets.Core.Entities;

public class Chord
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Suffix { get; set; } = string.Empty;

    public ICollection<VersionChordIndex> VersionChordIndex { get; set; } = [];
    public ICollection<UserChordProgress> UserChordProgress { get; set; } = [];
}