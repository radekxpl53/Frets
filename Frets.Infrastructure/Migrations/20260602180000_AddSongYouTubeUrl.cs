using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Frets.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSongYouTubeUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "YouTubeUrl",
                table: "Songs",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "YouTubeUrl",
                table: "Songs");
        }
    }
}
