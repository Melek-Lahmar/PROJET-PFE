using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <summary>
    /// Migration neutralisée (no-op). Le schéma était déjà appliqué manuellement via sqlcmd
    /// en phase de test. Les colonnes et tables correspondantes sont gérées dans V2Refonte
    /// avec des IF idempotents.
    /// </summary>
    public partial class newversionechnage : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // No-op
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No-op
        }
    }
}
