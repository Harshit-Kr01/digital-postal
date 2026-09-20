using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DigitalPostal.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLetterMailboxIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Letters_RecipientId_SentAtUtc",
                table: "Letters",
                columns: new[] { "RecipientId", "SentAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Letters_SenderId_SentAtUtc",
                table: "Letters",
                columns: new[] { "SenderId", "SentAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Letters_RecipientId_SentAtUtc",
                table: "Letters");

            migrationBuilder.DropIndex(
                name: "IX_Letters_SenderId_SentAtUtc",
                table: "Letters");
        }
    }
}
