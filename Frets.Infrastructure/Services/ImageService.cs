using Frets.Core.DTOs.Images;
using Frets.Core.Entities;
using Frets.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Frets.Infrastructure.Services;

public class ImageService
{
    public const string DefaultImageKey = "default";
    public const string DefaultAvatarKey = DefaultImageKey;
    public const string DefaultArtistKey = DefaultImageKey;

    private const string DefaultImageRelativePath = "images/defaults/default.jpg";

    private static readonly string[] DefaultImageFileCandidates =
    [
        "default.jpg",
        "default.jpeg",
        "default.png",
        "default.webp",
        "default-avatar.jpg",
        "default-artist.jpg",
    ];

    private const long MaxUploadBytes = 2 * 1024 * 1024;

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp",
    };

    private readonly AppDbContext _context;
    private readonly string _webRootPath;
    private readonly string _publicBaseUrl;
    private readonly string _fallbackImageUrl;

    public ImageService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _webRootPath = configuration["Media:WebRootPath"]
            ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        _publicBaseUrl = configuration["Media:PublicBaseUrl"]?.TrimEnd('/')
            ?? "http://localhost:5041";
        _fallbackImageUrl = configuration["Media:DefaultImageUrl"]
            ?? configuration["Media:DefaultAvatarUrl"]
            ?? "https://api.dicebear.com/9.x/lorelei-neutral/png?seed=frets-default&size=400";
    }

    public string GetPublicUrl(string? storagePath)
    {
        if (string.IsNullOrWhiteSpace(storagePath)) return GetDefaultImageUrl();
        return $"{_publicBaseUrl}/{storagePath.TrimStart('/')}";
    }

    public string GetDefaultImageUrl() => ResolveDefaultImageUrl();

    public string GetDefaultAvatarUrl() => GetDefaultImageUrl();

    public string GetDefaultArtistUrl() => GetDefaultImageUrl();

    public string? FindBundledDefaultRelativePath()
    {
        var defaultsDir = Path.Combine(_webRootPath, "images", "defaults");
        if (!Directory.Exists(defaultsDir))
            return null;

        foreach (var fileName in DefaultImageFileCandidates)
        {
            if (File.Exists(Path.Combine(defaultsDir, fileName)))
                return $"images/defaults/{fileName}";
        }

        var anyFile = Directory
            .EnumerateFiles(defaultsDir)
            .FirstOrDefault(path => !Path.GetFileName(path).StartsWith('.'));

        return anyFile == null ? null : $"images/defaults/{Path.GetFileName(anyFile)}";
    }

    private string ResolveDefaultImageUrl()
    {
        var bundledPath = FindBundledDefaultRelativePath();
        if (bundledPath != null)
            return GetPublicUrl(bundledPath);

        return _fallbackImageUrl;
    }

    public async Task<Image> GetOrCreateSystemImageAsync(string systemKey, string storagePath, string contentType)
    {
        var existing = await _context.Images.FirstOrDefaultAsync(i => i.SystemKey == systemKey);
        if (existing != null) return existing;

        var image = new Image
        {
            Id = Guid.NewGuid(),
            StoragePath = storagePath,
            ContentType = contentType,
            FileSizeBytes = 0,
            SystemKey = systemKey,
            CreatedAt = DateTime.UtcNow,
        };
        _context.Images.Add(image);
        await _context.SaveChangesAsync();
        return image;
    }

    public async Task AssignDefaultAvatarAsync(Guid userId)
    {
        if (await _context.UserProfileImages.AnyAsync(x => x.UserId == userId))
            return;

        var avatar = await GetOrCreateDefaultImageAsync();

        _context.UserProfileImages.Add(new UserProfileImage
        {
            UserId = userId,
            ImageId = avatar.Id,
        });
        await _context.SaveChangesAsync();
    }

    public async Task AssignDefaultArtistImageAsync(Guid artistId)
    {
        if (await _context.ArtistImages.AnyAsync(x => x.ArtistId == artistId))
            return;

        var artistImage = await GetOrCreateDefaultImageAsync();

        _context.ArtistImages.Add(new ArtistImage
        {
            ArtistId = artistId,
            ImageId = artistImage.Id,
        });
        await _context.SaveChangesAsync();
    }

    public async Task<string> ResolveArtistImageUrlAsync(Guid artistId)
    {
        var path = await _context.ArtistImages
            .Where(x => x.ArtistId == artistId)
            .Select(x => x.Image.StoragePath)
            .FirstOrDefaultAsync();

        return ResolveStoredImageUrl(path);
    }

    public string ResolveStoredImageUrl(string? storagePath)
    {
        if (string.IsNullOrWhiteSpace(storagePath))
            return GetDefaultImageUrl();

        var fullPath = Path.Combine(_webRootPath, storagePath.Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(fullPath))
            return GetPublicUrl(storagePath);

        if (storagePath.Contains("defaults/", StringComparison.OrdinalIgnoreCase))
            return GetDefaultImageUrl();

        return GetPublicUrl(storagePath);
    }

    public async Task<Image> GetOrCreateDefaultImageAsync()
    {
        var storagePath = FindBundledDefaultRelativePath() ?? DefaultImageRelativePath;
        return await GetOrCreateSystemImageAsync(
            DefaultImageKey,
            storagePath,
            GuessContentType(storagePath));
    }

    private static string GuessContentType(string storagePath) =>
        Path.GetExtension(storagePath).ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => "image/jpeg",
        };

    public async Task<ImageUploadResponse?> UploadAsync(IFormFile file)
    {
        var error = ValidateUpload(file);
        if (error != null) return null;

        Directory.CreateDirectory(Path.Combine(_webRootPath, "uploads"));

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension))
        {
            extension = file.ContentType switch
            {
                "image/png" => ".png",
                "image/webp" => ".webp",
                _ => ".jpg",
            };
        }

        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var storagePath = $"uploads/{fileName}";
        var fullPath = Path.Combine(_webRootPath, storagePath.Replace('/', Path.DirectorySeparatorChar));

        await using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var image = new Image
        {
            Id = Guid.NewGuid(),
            StoragePath = storagePath,
            ContentType = file.ContentType,
            FileSizeBytes = file.Length,
            CreatedAt = DateTime.UtcNow,
        };

        _context.Images.Add(image);
        await _context.SaveChangesAsync();

        return new ImageUploadResponse(image.Id, GetPublicUrl(image.StoragePath));
    }

    public async Task<string?> SetUserProfileImageAsync(Guid userId, Guid imageId)
    {
        var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
        if (!userExists) return "User not found.";

        var image = await _context.Images.FindAsync(imageId);
        if (image == null) return "Image not found.";

        var existing = await _context.UserProfileImages.FindAsync(userId);
        if (existing == null)
        {
            _context.UserProfileImages.Add(new UserProfileImage { UserId = userId, ImageId = imageId });
        }
        else
        {
            existing.ImageId = imageId;
        }

        await _context.SaveChangesAsync();
        return null;
    }

    public async Task<string> ResolveUserImageUrlAsync(Guid userId)
    {
        var path = await _context.UserProfileImages
            .Where(x => x.UserId == userId)
            .Select(x => x.Image.StoragePath)
            .FirstOrDefaultAsync();

        return ResolveStoredImageUrl(path);
    }

    public async Task<string?> SetArtistImageAsync(Guid artistId, Guid imageId)
    {
        var artistExists = await _context.Artists.AnyAsync(a => a.Id == artistId);
        if (!artistExists) return "Artist not found.";

        var image = await _context.Images.FindAsync(imageId);
        if (image == null) return "Image not found.";

        var existing = await _context.ArtistImages.FindAsync(artistId);
        if (existing == null)
        {
            _context.ArtistImages.Add(new ArtistImage { ArtistId = artistId, ImageId = imageId });
        }
        else
        {
            existing.ImageId = imageId;
        }

        await _context.SaveChangesAsync();
        return null;
    }

    public string? ValidateUpload(IFormFile? file)
    {
        if (file == null || file.Length == 0) return "No file uploaded.";
        if (file.Length > MaxUploadBytes) return "File exceeds 2 MB limit.";
        if (!AllowedContentTypes.Contains(file.ContentType)) return "Only JPG, PNG and WebP images are allowed.";
        return null;
    }

    public void EnsureDefaultFilesExist()
    {
        Directory.CreateDirectory(Path.Combine(_webRootPath, "images", "defaults"));
    }

    public async Task SyncSystemDefaultImageRecordsAsync()
    {
        var storagePath = FindBundledDefaultRelativePath() ?? DefaultImageRelativePath;
        var contentType = GuessContentType(storagePath);
        var defaultImage = await UpsertSystemImageAsync(DefaultImageKey, storagePath, contentType);

        var legacyKeys = new[] { "default-avatar", "default-artist" };
        var legacyImages = await _context.Images
            .Where(i => i.SystemKey != null && legacyKeys.Contains(i.SystemKey))
            .ToListAsync();

        foreach (var legacy in legacyImages)
        {
            if (legacy.Id == defaultImage.Id) continue;
            legacy.SystemKey = null;
            legacy.StoragePath = storagePath;
            legacy.ContentType = contentType;
        }

        await _context.SaveChangesAsync();
    }

    private async Task<Image> UpsertSystemImageAsync(string systemKey, string storagePath, string contentType)
    {
        var fullPath = Path.Combine(_webRootPath, storagePath.Replace('/', Path.DirectorySeparatorChar));
        var fileSize = File.Exists(fullPath) ? new FileInfo(fullPath).Length : 0;

        var image = await _context.Images.FirstOrDefaultAsync(i => i.SystemKey == systemKey);
        if (image == null)
        {
            image = new Image
            {
                Id = Guid.NewGuid(),
                SystemKey = systemKey,
                StoragePath = storagePath,
                ContentType = contentType,
                FileSizeBytes = fileSize,
                CreatedAt = DateTime.UtcNow,
            };
            _context.Images.Add(image);
        }
        else
        {
            image.StoragePath = storagePath;
            image.ContentType = contentType;
            image.FileSizeBytes = fileSize;
        }

        await _context.SaveChangesAsync();
        return image;
    }
}
