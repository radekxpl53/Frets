using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Frets.Core.Entities;
using Frets.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Frets.Core.DTOs.Auth;
using Frets.Infrastructure.Helpers;

namespace Frets.Infrastructure.Services;

public class AuthService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly EmailService _emailService;
    private readonly ImageService _imageService;

    public AuthService(
        AppDbContext context,
        IConfiguration configuration,
        EmailService emailService,
        ImageService imageService)
    {
        _context = context;
        _configuration = configuration;
        _emailService = emailService;
        _imageService = imageService;
    }

    public async Task<User?> RegisterAsync(string username, string email, string password)
    {
        if (await _context.Users.AnyAsync(u => u.Email == email))
            return null;

        if (await _context.Users.AnyAsync(u => u.Username == username))
            return null;

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = username,
            Slug = await UserSlugHelper.GenerateUniqueAsync(_context, username),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            CreatedAt = DateTime.UtcNow,
            EmailConfirmed = false
        };

        _context.Users.Add(user);

        var token = Guid.NewGuid().ToString("N");
        _context.EmailConfirmationTokens.Add(new Core.Entities.EmailConfirmationToken
        {
            Id = Guid.NewGuid(),
            Token = token,
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(1),
            Used = false
        });

        await _context.SaveChangesAsync();
        await _imageService.AssignDefaultAvatarAsync(user.Id);

        var confirmLink = $"{GetClientBaseUrl()}/confirm-email?token={token}";
        await _emailService.SendAsync(
            user.Email,
            "Frets — Confirm your email",
            $"<p>Welcome to Frets! Confirm your email by clicking the link below:</p><a href='{confirmLink}'>{confirmLink}</a><p>The link expires in 24 hours.</p>"
        );

        return user;
    }

    public async Task<(AuthResponse? Response, string? Error)> LoginAsync(string login, string password)
    {
        var trimmed = login.Trim();
        var loginLower = trimmed.ToLowerInvariant();

        var user = await _context.Users.FirstOrDefaultAsync(u =>
            u.Email.ToLower() == loginLower || u.Username.ToLower() == loginLower);

        if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return (null, "Invalid email, username or password.");

        if (!user.EmailConfirmed)
            return (null, "Please confirm your email before logging in.");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        if (user.LastActivityDate != today)
        {
            if (user.LastActivityDate == today.AddDays(-1))
                user.CurrentStreak++;
            else
                user.CurrentStreak = 1;

            if (user.CurrentStreak > user.LongestStreak)
                user.LongestStreak = user.CurrentStreak;

            user.LastActivityDate = today;
            user.Xp += 10;

            _context.XpEvents.Add(new Core.Entities.XpEvent
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                EventType = "daily_login",
                XpAmount = 10,
                CreatedAt = DateTime.UtcNow
            });

            if (user.CurrentStreak % 7 == 0)
            {
                user.Xp += 25;
                _context.XpEvents.Add(new Core.Entities.XpEvent
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    EventType = "streak_bonus",
                    XpAmount = 25,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
        }

        var token = GenerateToken(user);

        return (new AuthResponse(
            Token: token,
            UserId: user.Id,
            Username: user.Username,
            Role: user.Role
        ), null);
    }

    private string GenerateToken(User user)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));

        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("role", user.Role),
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(
                double.Parse(_configuration["Jwt:ExpiryHours"]!)),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<bool> ForgotPasswordAsync(string email)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null) return false;

        var oldTokens = _context.PasswordResetTokens
            .Where(t => t.UserId == user.Id && !t.Used);
        _context.PasswordResetTokens.RemoveRange(oldTokens);

        var token = Guid.NewGuid().ToString("N");

        _context.PasswordResetTokens.Add(new Core.Entities.PasswordResetToken
        {
            Id = Guid.NewGuid(),
            Token = token,
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            Used = false
        });

        await _context.SaveChangesAsync();

        var resetLink = $"{GetClientBaseUrl()}/reset-password?token={token}";
        await _emailService.SendAsync(
            user.Email,
            "Frets — Reset your password",
            $"<p>Click the link below to reset your password:</p><a href='{resetLink}'>{resetLink}</a><p>The link expires in 1 hour.</p>"
        );

        return true;
    }

    public async Task<bool> ResetPasswordAsync(string token, string newPassword)
    {
        var resetToken = await _context.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == token && !t.Used);

        if (resetToken == null) return false;
        if (resetToken.ExpiresAt < DateTime.UtcNow) return false;

        resetToken.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        resetToken.Used = true;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ConfirmEmailAsync(string token)
    {
        var confirmToken = await _context.EmailConfirmationTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == token && !t.Used);

        if (confirmToken == null) return false;
        if (confirmToken.ExpiresAt < DateTime.UtcNow) return false;

        confirmToken.User.EmailConfirmed = true;
        confirmToken.Used = true;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<string?> RequestEmailChangeAsync(Guid userId, string newEmail, string currentPassword)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return "User not found.";

        if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
            return "Current password is incorrect.";

        newEmail = newEmail.Trim().ToLowerInvariant();
        if (string.Equals(user.Email, newEmail, StringComparison.OrdinalIgnoreCase))
            return "New email must be different from the current one.";

        if (await _context.Users.AnyAsync(u => u.Email == newEmail && u.Id != userId))
            return "Email is already in use.";

        var pending = _context.EmailChangeTokens.Where(t => t.UserId == userId && !t.Used);
        _context.EmailChangeTokens.RemoveRange(pending);

        var token = Guid.NewGuid().ToString("N");
        _context.EmailChangeTokens.Add(new EmailChangeToken
        {
            Id = Guid.NewGuid(),
            Token = token,
            NewEmail = newEmail,
            UserId = userId,
            ExpiresAt = DateTime.UtcNow.AddDays(1),
            Used = false
        });

        await _context.SaveChangesAsync();

        var confirmLink = $"{GetClientBaseUrl()}/confirm-email-change?token={token}";
        await _emailService.SendAsync(
            newEmail,
            "Frets — Confirm your new email",
            $"<p>Confirm your new email address for Frets:</p><a href='{confirmLink}'>{confirmLink}</a><p>The link expires in 24 hours. If you did not request this change, ignore this message.</p>"
        );

        return null;
    }

    public async Task<bool> ConfirmEmailChangeAsync(string token)
    {
        var changeToken = await _context.EmailChangeTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == token && !t.Used);

        if (changeToken == null) return false;
        if (changeToken.ExpiresAt < DateTime.UtcNow) return false;

        if (await _context.Users.AnyAsync(u => u.Email == changeToken.NewEmail && u.Id != changeToken.UserId))
            return false;

        changeToken.User.Email = changeToken.NewEmail;
        changeToken.User.EmailConfirmed = true;
        changeToken.Used = true;

        await _context.SaveChangesAsync();
        return true;
    }

    private string GetClientBaseUrl() =>
        _configuration["App:ClientBaseUrl"]?.TrimEnd('/')
        ?? "http://localhost:5173";
}