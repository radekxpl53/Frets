using Frets.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;

namespace Frets.Api.Controllers;

[ApiController]
[Route("api/chords")]
public class ChordsController : ControllerBase
{
    private readonly ChordService _chordService;

    public ChordsController(ChordService chordService)
    {
        _chordService = chordService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var chords = await _chordService.GetAllAsync();
        return Ok(chords);
    }

    [HttpGet("{key}/{suffix}")]
    public async Task<IActionResult> GetByKeyAndSuffix(string key, string suffix)
    {
        var chord = await _chordService.GetByKeyAndSuffixAsync(key, suffix);

        if (chord == null)
            return NotFound();

        return Ok(chord);
    }
}