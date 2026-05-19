using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <summary>
    /// Phase 4 — Table CommandeConfirmationLocks pour le verrou visuel 15 min (mécanisme A,
    /// pool FIFO des commandes à confirmer). PK = DoPiece. Migration idempotente.
    /// </summary>
    public partial class AddCommandeConfirmationLocks : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.CommandeConfirmationLocks', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[CommandeConfirmationLocks] (
        [DoPiece] nvarchar(13) NOT NULL,
        [LockedByUserId] uniqueidentifier NOT NULL,
        [LockedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_CommandeConfirmationLocks] PRIMARY KEY CLUSTERED ([DoPiece] ASC)
    );
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.CommandeConfirmationLocks', 'U') IS NOT NULL
    DROP TABLE [dbo].[CommandeConfirmationLocks];
");
        }
    }
}
