using Frets.Core.DTOs.Songs;
using Frets.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Frets.Api.Controllers;

[ApiController]
[Route("api/suggestions")]
public class SuggestionsController : ControllerBase
{
    private readonly SuggestionService _suggestionService;

    public SuggestionsController(SuggestionService suggestionService)
    {
        _suggestionService = suggestionService;
    }

    [HttpGet("version/{versionId}")]
    public async Task<IActionResult> GetByVersion(Guid versionId)
    {
        var suggestions = await _suggestionService.GetByVersionAsync(versionId);
        return Ok(suggestions);
    }

    [HttpPost("version/{versionId}")]
    [Authorize]
    public async Task<IActionResult> Create(Guid versionId, [FromBody] CreateSuggestionRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null) return Unauthorized();

        var authorId = Guid.Parse(userIdClaim);
        var suggestion = await _suggestionService.CreateAsync(versionId, authorId, request);

        if (suggestion == null)
            return BadRequest("Version not found.");

        return Ok(suggestion);
    }

    [HttpPost("{id}/vote")]
    [Authorize]
    public async Task<IActionResult> Vote(Guid id, [FromBody] VoteRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null) return Unauthorized();

        var userId = Guid.Parse(userIdClaim);
        var error = await _suggestionService.VoteAsync(id, userId, request.IsPositive);

        if (error != null) return BadRequest(error);

        return Ok("Vote registered.");
    }
}