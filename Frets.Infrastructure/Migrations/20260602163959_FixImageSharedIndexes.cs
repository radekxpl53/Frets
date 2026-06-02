using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Frets.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixImageSharedIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserProfileImages_ImageId",
                table: "UserProfileImages");

            migrationBuilder.DropIndex(
                name: "IX_ArtistImages_ImageId",
                table: "ArtistImages");

            migrationBuilder.CreateIndex(
                name: "IX_UserProfileImages_ImageId",
                table: "UserProfileImages",
                column: "ImageId");

            migrationBuilder.CreateIndex(
                name: "IX_ArtistImages_ImageId",
                table: "ArtistImages",
                column: "ImageId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserProfileImages_ImageId",
                table: "UserProfileImages");

            migrationBuilder.DropIndex(
                name: "IX_ArtistImages_ImageId",
                table: "ArtistImages");

            migrationBuilder.CreateIndex(
                name: "IX_UserProfileImages_ImageId",
                table: "UserProfileImages",
                column: "ImageId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ArtistImages_ImageId",
                table: "ArtistImages",
                column: "ImageId",
                unique: true);
        }
    }
}
