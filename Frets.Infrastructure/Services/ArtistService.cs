using Frets.Core.DTOs.Artists;
using Frets.Core.DTOs.Songs;
using Frets.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Frets.Infrastructure.Services;

public class ArtistService
{
	private readonly AppDbContext _context;

	public ArtistService(AppDbContext context)
	{
		_context = context;
	}

	public async Task<List<ArtistResponse>> GetAllAsync()
	{
		return await _context.Artists
			.Select(a => new ArtistResponse(
				a.Id,
				a.Name,
				a.Slug,
				a.Songs.Count(s => s.Status == "approved")
			))
			.ToListAsync();
	}

	public async Task<(ArtistResponse Artist, List<SongResponse> Songs)?> GetBySlugAsync(string slug)
	{
		var artist = await _context.Artists
			.Include(a => a.Songs.Where(s => s.Status == "approved"))
			.ThenInclude(s => s.Author)
			.FirstOrDefaultAsync(a => a.Slug == slug);

		if (artist == null) return null;

		var artistResponse = new ArtistResponse(
			artist.Id,
			artist.Name,
			artist.Slug,
			artist.Songs.Count
		);

		var songs = artist.Songs.Select(s => new SongResponse(
			s.Id,
			s.Title,
			artist.Name,
			s.Genre,
			s.Status,
			s.Author.Username,
			s.SubmittedAt
		)).ToList();

		return (artistResponse, songs);
	}
}