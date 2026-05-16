using Frets.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Frets.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "admin")]
public class AdminController : ControllerBase
{
    private readonly SongService _songService;
    private readonly SuggestionService _suggestionService;

    public AdminController(SongService songService, SuggestionService suggestionService)
    {
        _songService = songService;
        _suggestionService = suggestionService;
    }

    [HttpPost("songs/{id}/approve")]
    public async Task<IActionResult> ApproveSong(Guid id)
    {
        var error = await _songService.ChangeStatusAsync(id, "approved");
        if (error != null) return BadRequest(error);
        return Ok("Song approved.");
    }

    [HttpPost("songs/{id}/reject")]
    public async Task<IActionResult> RejectSong(Guid id)
    {
        var error = await _songService.ChangeStatusAsync(id, "rejected");
        if (error != null) return BadRequest(error);
        return Ok("Song rejected.");
    }

    [HttpPost("songs/{id}/pending")]
    public async Task<IActionResult> SetPending(Guid id)
    {
        var error = await _songService.ChangeStatusAsync(id, "pending");
        if (error != null) return BadRequest(error);
        return Ok("Song set to pending.");
    }

    [HttpPost("suggestions/{id}/approve")]
    public async Task<IActionResult> ApproveSuggestion(Guid id)
    {
        var error = await _suggestionService.AdminReviewAsync(id, "approved");
        if (error != null) return BadRequest(error);
        return Ok("Suggestion approved.");
    }

    [HttpPost("suggestions/{id}/reject")]
    public async Task<IActionResult> RejectSuggestion(Guid id)
    {
        var error = await _suggestionService.AdminReviewAsync(id, "rejected");
        if (error != null) return BadRequest(error);
        return Ok("Suggestion rejected.");
    }

}