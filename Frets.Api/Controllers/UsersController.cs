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
    private readonly ImageService _imageService;
    private readonly AuthService _authService;

    public UsersController(UserService userService, ImageService imageService, AuthService authService)
    {
        _userService = userService;
        _imageService = imageService;
        _authService = authService;
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

    [HttpGet("me/chords")]
    [Authorize]
    public async Task<IActionResult> GetChordProgress()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null) return Unauthorized();

        var userId = Guid.Parse(userIdClaim);
        var progress = await _userService.GetChordProgressAsync(userId);

        return Ok(progress);
    }

    [HttpGet("me/songs")]
    [Authorize]
    public async Task<IActionResult> GetPlayableSongs()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null) return Unauthorized();

        var userId = Guid.Parse(userIdClaim);
        var songs = await _userService.GetPlayableSongsAsync(userId);

        return Ok(songs);
    }

    [HttpPost("me/activity")]
    [Authorize]
    public async Task<IActionResult> RecordActivity()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null) return Unauthorized();

        var userId = Guid.Parse(userIdClaim);
        await _userService.RecordActivityAsync(userId);

        return Ok("Activity recorded.");
    }

    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateUserRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null) return Unauthorized();

        var userId = Guid.Parse(userIdClaim);
        var profile = await _userService.UpdateProfileAsync(userId, request);

        if (profile == null)
            return BadRequest("Username already taken.");

        return Ok(profile);
    }

    [HttpPut("me/password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null) return Unauthorized();

        var userId = Guid.Parse(userIdClaim);
        var error = await _userService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword);

        if (error != null) return BadRequest(error);

        return Ok("Password changed successfully.");
    }

    [HttpPost("me/email/change-request")]
    [Authorize]
    public async Task<IActionResult> RequestEmailChange([FromBody] RequestEmailChangeRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null) return Unauthorized();

        var userId = Guid.Parse(userIdClaim);
        var error = await _authService.RequestEmailChangeAsync(userId, request.NewEmail, request.CurrentPassword);

        if (error != null) return BadRequest(error);

        return Ok("Confirmation link sent to the new email address.");
    }

    [HttpPut("me/image")]
    [Authorize]
    public async Task<IActionResult> SetProfileImage([FromBody] SetUserProfileImageRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null) return Unauthorized();

        var userId = Guid.Parse(userIdClaim);
        var error = await _imageService.SetUserProfileImageAsync(userId, request.ImageId);

        if (error != null) return BadRequest(error);

        var profile = await _userService.GetProfileAsync(userId);
        return Ok(profile);
    }

    [HttpGet("{slug}/songs")]
    public async Task<IActionResult> GetUserSongs(string slug)
    {
        var songs = await _userService.GetUserApprovedSongsAsync(slug);
        return Ok(songs);
    }

    [HttpGet("{slug}/drafts")]
    public async Task<IActionResult> GetUserDrafts(string slug)
    {
        var drafts = await _userService.GetUserPublicDraftsAsync(slug);
        return Ok(drafts);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetPublicProfile(string slug)
    {
        var profile = await _userService.GetPublicProfileAsync(slug);

        if (profile == null) return NotFound();

        return Ok(profile);
    }
}