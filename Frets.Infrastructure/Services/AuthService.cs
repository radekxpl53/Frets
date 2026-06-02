using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Frets.Core.Entities;
using Frets.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Frets.Core.DTOs.Auth;

namespace Frets.Infrastructure.Services;

public class AuthService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly EmailService _emailService;

    public AuthService(AppDbContext context, IConfiguration configuration, EmailService emailService)
    {
        _context = context;
        _configuration = configuration;
        _emailService = emailService;
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

        var confirmLink = $"http://localhost:5173/confirm-email?token={token}";
        await _emailService.SendAsync(
            user.Email,
            "Frets — Confirm your email",
            $"<p>Welcome to Frets! Confirm your email by clicking the link below:</p><a href='{confirmLink}'>{confirmLink}</a><p>The link expires in 24 hours.</p>"
        );

        return user;
    }

    public async Task<(AuthResponse? Response, string? Error)> LoginAsync(string email, string password)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return (null, "Invalid email or password.");

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

        var resetLink = $"http://localhost:5173/reset-password?token={token}";
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
}