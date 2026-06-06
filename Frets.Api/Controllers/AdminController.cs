using Frets.Core.DTOs.Artists;
using Frets.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Frets.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly SongService _songService;
    private readonly SuggestionService _suggestionService;
    private readonly UserService _userService;
    private readonly ImageService _imageService;
    private readonly ArtistService _artistService;

    public AdminController(
        SongService songService,
        SuggestionService suggestionService,
        UserService userService,
        ImageService imageService,
        ArtistService artistService)
    {
        _songService = songService;
        _suggestionService = suggestionService;
        _userService = userService;
        _imageService = imageService;
        _artistService = artistService;
    }

    private async Task<IActionResult?> EnsureAdminAsync()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null)
            return Unauthorized();

        if (!await _userService.IsAdminAsync(Guid.Parse(userIdClaim)))
            return StatusCode(403, "Wymagane uprawnienia administratora.");

        return null;
    }

    [HttpPost("songs/{id}/approve")]
    public async Task<IActionResult> ApproveSong(Guid id)
    {
        var denied = await EnsureAdminAsync();
        if (denied != null) return denied;

        var error = await _songService.ChangeStatusAsync(id, "approved");
        if (error != null) return BadRequest(error);
        return Ok(new { message = "Song approved.", status = "approved" });
    }

    [HttpPost("songs/{id}/reject")]
    public async Task<IActionResult> RejectSong(Guid id)
    {
        var denied = await EnsureAdminAsync();
        if (denied != null) return denied;

        var error = await _songService.ChangeStatusAsync(id, "rejected");
        if (error != null) return BadRequest(error);
        return Ok(new { message = "Song rejected.", status = "rejected" });
    }

    [HttpPost("songs/{id}/pending")]
    public async Task<IActionResult> SetPending(Guid id)
    {
        var denied = await EnsureAdminAsync();
        if (denied != null) return denied;

        var error = await _songService.ChangeStatusAsync(id, "pending");
        if (error != null) return BadRequest(error);
        return Ok(new { message = "Song set to pending.", status = "pending" });
    }

    [HttpPost("suggestions/{id}/approve")]
    public async Task<IActionResult> ApproveSuggestion(Guid id)
    {
        var denied = await EnsureAdminAsync();
        if (denied != null) return denied;

        var error = await _suggestionService.AdminReviewAsync(id, "approved");
        if (error != null) return BadRequest(error);
        return Ok("Suggestion approved.");
    }

    [HttpPost("suggestions/{id}/reject")]
    public async Task<IActionResult> RejectSuggestion(Guid id)
    {
        var denied = await EnsureAdminAsync();
        if (denied != null) return denied;

        var error = await _suggestionService.AdminReviewAsync(id, "rejected");
        if (error != null) return BadRequest(error);
        return Ok("Suggestion rejected.");
    }

    [HttpGet("songs")]
    public async Task<IActionResult> GetAllSongs([FromQuery] string? status)
    {
        var denied = await EnsureAdminAsync();
        if (denied != null) return denied;

        var songs = await _songService.GetAllSongsAdminAsync(status);
        return Ok(songs);
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetAllUsers()
    {
        var denied = await EnsureAdminAsync();
        if (denied != null) return denied;

        var users = await _userService.GetAllUsersAdminAsync();
        return Ok(users);
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        var denied = await EnsureAdminAsync();
        if (denied != null) return denied;

        var success = await _userService.DeleteUserAdminAsync(id);
        if (!success) return NotFound();
        return Ok("User deleted.");
    }

    [HttpGet("artists")]
    public async Task<IActionResult> GetArtists()
    {
        var denied = await EnsureAdminAsync();
        if (denied != null) return denied;

        var artists = await _artistService.GetAllAsync();
        return Ok(artists);
    }

    [HttpPut("artists/{id}")]
    public async Task<IActionResult> UpdateArtist(Guid id, [FromBody] UpdateArtistRequest request)
    {
        var denied = await EnsureAdminAsync();
        if (denied != null) return denied;

        var (error, artist) = await _artistService.UpdateAsync(id, request.Name);
        if (error != null) return BadRequest(error);
        return Ok(artist);
    }

    [HttpPost("artists/{artistId}/image")]
    [RequestSizeLimit(2 * 1024 * 1024)]
    public async Task<IActionResult> SetArtistImage(Guid artistId, IFormFile file)
    {
        var denied = await EnsureAdminAsync();
        if (denied != null) return denied;

        var validationError = _imageService.ValidateUpload(file);
        if (validationError != null)
            return BadRequest(validationError);

        var upload = await _imageService.UploadAsync(file);
        if (upload == null)
            return BadRequest("Upload failed.");

        var error = await _imageService.SetArtistImageAsync(artistId, upload.Id);
        if (error != null)
            return BadRequest(error);

        return Ok(new { imageUrl = upload.Url });
    }
}
