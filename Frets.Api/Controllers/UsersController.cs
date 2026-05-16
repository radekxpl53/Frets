using Frets.Core.DTOs.Users;
using Frets.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Frets.Api.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly UserService _userService;

    public UsersController(UserService userService)
    {
        _userService = userService;
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetProfile()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null) return Unauthorized();

        var userId = Guid.Parse(userIdClaim);
        var profile = await _userService.GetProfileAsync(userId);

        if (profile == null) return NotFound();

        return Ok(profile);
    }

    [HttpPut("me/chords/{chordId}")]
    [Authorize]
    public async Task<IActionResult> UpdateChordProgress(Guid chordId, [FromBody] UpdateChordProgressRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null) return Unauthorized();

        var userId = Guid.Parse(userIdClaim);
        var success = await _userService.UpdateChordProgressAsync(userId, chordId, request.MasteryLevel);

        if (!success) return BadRequest("Invalid mastery level or chord not found.");

        return Ok("Chord progress updated.");
    }

}