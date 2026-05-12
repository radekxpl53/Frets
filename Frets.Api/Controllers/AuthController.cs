using Frets.Core.DTOs.Auth;
using Frets.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;

namespace Frets.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var user = await _authService.RegisterAsync(
            request.Username,
            request.Email,
            request.Password);

        if (user == null)
            return BadRequest("Username or email already exists.");

        return Ok(new AuthResponse(
            Token: string.Empty,
            UserId: user.Id,
            Username: user.Username,
            Role: user.Role
        ));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request.Email, request.Password);

        if (result == null)
            return Unauthorized("Invalid email or password.");

        return Ok(result);
    }
}