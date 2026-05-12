namespace Frets.Core.Entities;

public class LevelThreshold
{
	public int Level { get; set; }
	public int XpRequired { get; set; }
	public string Label { get; set; } = string.Empty;
}