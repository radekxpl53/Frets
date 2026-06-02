using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Frets.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoriesAndTunings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TuningId",
                table: "SongVersions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CategoryId",
                table: "Songs",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Slug = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Tunings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tunings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SongVersions_TuningId",
                table: "SongVersions",
                column: "TuningId");

            migrationBuilder.CreateIndex(
                name: "IX_Songs_CategoryId",
                table: "Songs",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Slug",
                table: "Categories",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tunings_Code",
                table: "Tunings",
                column: "Code",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Songs_Categories_CategoryId",
                table: "Songs",
                column: "CategoryId",
                principalTable: "Categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SongVersions_Tunings_TuningId",
                table: "SongVersions",
                column: "TuningId",
                principalTable: "Tunings",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Songs_Categories_CategoryId",
                table: "Songs");

            migrationBuilder.DropForeignKey(
                name: "FK_SongVersions_Tunings_TuningId",
                table: "SongVersions");

            migrationBuilder.DropTable(
                name: "Categories");

            migrationBuilder.DropTable(
                name: "Tunings");

            migrationBuilder.DropIndex(
                name: "IX_SongVersions_TuningId",
                table: "SongVersions");

            migrationBuilder.DropIndex(
                name: "IX_Songs_CategoryId",
                table: "Songs");

            migrationBuilder.DropColumn(
                name: "TuningId",
                table: "SongVersions");

            migrationBuilder.DropColumn(
                name: "CategoryId",
                table: "Songs");
        }
    }
}
