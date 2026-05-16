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

    public AuthService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
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
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return user;
    }

    public async Task<AuthResponse?> LoginAsync(string email, string password)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return null;

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

        return new AuthResponse(
            Token: token,
            UserId: user.Id,
            Username: user.Username,
            Role: user.Role
        );
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
            new Claim(ClaimTypes.Role, user.Role)
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
}