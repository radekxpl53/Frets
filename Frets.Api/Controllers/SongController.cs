using Frets.Core.DTOs.Songs;
using Frets.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Frets.Core.Helpers;

namespace Frets.Api.Controllers;

[ApiController]
[Route("api/songs")]
public class SongsController : ControllerBase
{
    private readonly SongService _songService;

    public SongsController(SongService songService)
    {
        _songService = songService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
    [FromQuery] string? genre,
    [FromQuery] string? artist,
    [FromQuery] string? search)
    {
        var songs = await _songService.GetApprovedSongsAsync(genre, artist, search);
        return Ok(songs);
    }

    [HttpGet("{artistSlug}/{titleSlug}")]
    public async Task<IActionResult> GetBySlug(string artistSlug, string titleSlug)
    {
        var song = await _songService.GetBySlugAsync(artistSlug, titleSlug);

        if (song == null)
            return NotFound();

        return Ok(song);
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreateSongRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (userIdClaim == null)
            return Unauthorized();

        var authorId = Guid.Parse(userIdClaim);
        var song = await _songService.CreateAsync(request, authorId);

        if (song == null)
            return BadRequest("Song already exists or author not found.");

        return CreatedAtAction(
            nameof(GetBySlug),
            new { artistSlug = SlugHelper.Generate(request.Artist), titleSlug = SlugHelper.Generate(request.Title) },
            song);
    }

    [HttpPost("{id}/vote")]
    [Authorize]
    public async Task<IActionResult> Vote(Guid id, [FromBody] VoteRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null) return Unauthorized();

        var userId = Guid.Parse(userIdClaim);
        var error = await _songService.VoteAsync(id, userId, request.IsPositive);

        if (error != null) return BadRequest(error);

        return Ok("Vote registered.");
    }

    [HttpGet("{id}/versions")]
    public async Task<IActionResult> GetVersions(Guid id)
    {
        var versions = await _songService.GetVersionsAsync(id);
        return Ok(versions);
    }

    [HttpPost("{id}/versions")]
    [Authorize]
    public async Task<IActionResult> CreateVersion(Guid id, [FromBody] CreateSongVersionRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null) return Unauthorized();

        var authorId = Guid.Parse(userIdClaim);
        var version = await _songService.CreateVersionAsync(id, request, authorId);

        if (version == null)
            return BadRequest("Song not found, you are not the author, or invalid version type.");

        return Ok(version);
    }

}