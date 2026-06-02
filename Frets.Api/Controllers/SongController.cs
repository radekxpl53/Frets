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

    [HttpGet("meta")]
    public async Task<IActionResult> GetMetadata()
    {
        var metadata = await _songService.GetMetadataAsync();
        return Ok(metadata);
    }

    [HttpGet("drafts")]
    public async Task<IActionResult> GetDrafts(
    [FromQuery] string? genre,
    [FromQuery] string? artist,
    [FromQuery] string? search)
    {
        var songs = await _songService.GetDraftSongsAsync(genre, artist, search);
        return Ok(songs);
    }

    [HttpGet("suggest/titles")]
    public async Task<IActionResult> SuggestTitles([FromQuery] string search, [FromQuery] int limit = 10)
    {
        if (string.IsNullOrWhiteSpace(search) || search.Trim().Length < 2)
            return Ok(Array.Empty<string>());

        var titles = await _songService.SuggestTitlesAsync(search.Trim(), limit);
        return Ok(titles);
    }

    [HttpGet("{artistSlug}/{titleSlug}")]
    public async Task<IActionResult> GetBySlug(string artistSlug, string titleSlug)
    {
        var song = await _songService.GetBySlugAsync(artistSlug, titleSlug);

        if (song == null)
            return NotFound();

        return Ok(song);
    }

    [HttpGet("drafts/{artistSlug}/{titleSlug}")]
    public async Task<IActionResult> GetDraftBySlug(string artistSlug, string titleSlug)
    {
        Guid? userId = null;
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim != null)
            userId = Guid.Parse(userIdClaim);

        var song = await _songService.GetDraftBySlugAsync(artistSlug, titleSlug, userId);

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
        var (error, summary) = await _songService.VoteAsync(id, userId, request.IsPositive);

        if (error != null) return BadRequest(error);

        return Ok(summary);
    }

    [HttpGet("{artistSlug}/{titleSlug}/versions")]
    public async Task<IActionResult> GetVersions(string artistSlug, string titleSlug)
    {
        var song = await _songService.GetBySlugInternalAsync(artistSlug, titleSlug);
        if (song == null) return NotFound();

        var versions = await _songService.GetVersionsAsync(song.Id);
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
            return BadRequest("Song not found, this version type already exists, or the request is invalid.");

        return Ok(version);
    }

    [HttpPut("{artistSlug}/{titleSlug}")]
    [Authorize]
    public async Task<IActionResult> Update(string artistSlug, string titleSlug, [FromBody] UpdateSongRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null) return Unauthorized();

        var userId = Guid.Parse(userIdClaim);
        var song = await _songService.UpdateAsync(artistSlug, titleSlug, userId, request);

        if (song == null) return BadRequest("Song not found or you are not the author.");

        return Ok(song);
    }

    [HttpDelete("{artistSlug}/{titleSlug}")]
    [Authorize]
    public async Task<IActionResult> Delete(string artistSlug, string titleSlug)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null) return Unauthorized();

        var userId = Guid.Parse(userIdClaim);
        var isAdmin = User.IsInRole("admin");
        var success = await _songService.DeleteAsync(artistSlug, titleSlug, userId, isAdmin);

        if (!success) return BadRequest("Song not found or you are not authorized.");

        return Ok("Song deleted.");
    }

    [HttpPut("{artistSlug}/{titleSlug}/versions/{versionId}")]
    [Authorize]
    public async Task<IActionResult> UpdateVersion(string artistSlug, string titleSlug, Guid versionId, [FromBody] UpdateSongVersionRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null) return Unauthorized();

        var userId = Guid.Parse(userIdClaim);
        var version = await _songService.UpdateVersionAsync(versionId, userId, request);

        if (version == null) return BadRequest("Version not found or you are not the author.");

        return Ok(version);
    }

    [HttpDelete("{artistSlug}/{titleSlug}/versions/{versionId}")]
    [Authorize]
    public async Task<IActionResult> DeleteVersion(string artistSlug, string titleSlug, Guid versionId)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null) return Unauthorized();

        var userId = Guid.Parse(userIdClaim);
        var isAdmin = User.IsInRole("admin");
        var success = await _songService.DeleteVersionAsync(versionId, userId, isAdmin);

        if (!success) return BadRequest("Version not found or you are not authorized.");

        return Ok("Version deleted.");
    }
}