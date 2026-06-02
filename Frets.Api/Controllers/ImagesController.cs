using Frets.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Frets.Api.Controllers;

[ApiController]
[Route("api/images")]
public class ImagesController : ControllerBase
{
    private readonly ImageService _imageService;

    public ImagesController(ImageService imageService)
    {
        _imageService = imageService;
    }

    [HttpPost("upload")]
    [Authorize]
    [RequestSizeLimit(2 * 1024 * 1024)]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        var validationError = _imageService.ValidateUpload(file);
        if (validationError != null)
            return BadRequest(validationError);

        var result = await _imageService.UploadAsync(file);
        if (result == null)
            return BadRequest("Upload failed.");

        return Ok(result);
    }
}
