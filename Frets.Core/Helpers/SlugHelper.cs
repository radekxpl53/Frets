using System.Text.RegularExpressions;

namespace Frets.Core.Helpers;

public static class SlugHelper
{
    public static string Generate(string input)
    {
        var slug = input.ToLowerInvariant();
        slug = slug.Replace("ą", "a").Replace("ę", "e").Replace("ó", "o")
                   .Replace("ś", "s").Replace("ł", "l").Replace("ż", "z")
                   .Replace("ź", "z").Replace("ć", "c").Replace("ń", "n");
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = slug.Trim('-');
        return slug;
    }
}