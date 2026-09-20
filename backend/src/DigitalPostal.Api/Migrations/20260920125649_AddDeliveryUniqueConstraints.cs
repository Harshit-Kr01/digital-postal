using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DigitalPostal.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDeliveryUniqueConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notifications_LetterId",
                table: "Notifications");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_LetterId_Type",
                table: "Notifications",
                columns: new[] { "LetterId", "Type" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LetterStamps_LetterId_LetterEventId",
                table: "LetterStamps",
                columns: new[] { "LetterId", "LetterEventId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LetterEvents_LetterId_EventType",
                table: "LetterEvents",
                columns: new[] { "LetterId", "EventType" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notifications_LetterId_Type",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_LetterStamps_LetterId_LetterEventId",
                table: "LetterStamps");

            migrationBuilder.DropIndex(
                name: "IX_LetterEvents_LetterId_EventType",
                table: "LetterEvents");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_LetterId",
                table: "Notifications",
                column: "LetterId");
        }
    }
}
