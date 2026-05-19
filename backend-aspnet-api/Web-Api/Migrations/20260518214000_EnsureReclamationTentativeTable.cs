using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Web_Api.data;

#nullable disable

namespace Web_Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260518214000_EnsureReclamationTentativeTable")]
    public partial class EnsureReclamationTentativeTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[F_RECLAMATION_TENTATIVE]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[F_RECLAMATION_TENTATIVE] (
        [Id] int NOT NULL IDENTITY,
        [ReclamationId] int NULL,
        [CommandePiece] nvarchar(13) NOT NULL,
        [DateJour] date NOT NULL,
        [Motif] nvarchar(50) NOT NULL,
        [LivreurUserId] uniqueidentifier NOT NULL,
        [Latitude] decimal(9,6) NULL,
        [Longitude] decimal(9,6) NULL,
        [PhotoUrl] nvarchar(500) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_F_RECLAMATION_TENTATIVE] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_F_RECLAMATION_TENTATIVE_F_RECLAMATION_ReclamationId]
            FOREIGN KEY ([ReclamationId]) REFERENCES [dbo].[F_RECLAMATION] ([Id])
    );
END
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_F_RECLAMATION_TENTATIVE_CommandePiece'
      AND object_id = OBJECT_ID(N'[dbo].[F_RECLAMATION_TENTATIVE]')
)
    CREATE INDEX [IX_F_RECLAMATION_TENTATIVE_CommandePiece]
        ON [dbo].[F_RECLAMATION_TENTATIVE] ([CommandePiece]);
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_F_RECLAMATION_TENTATIVE_ReclamationId'
      AND object_id = OBJECT_ID(N'[dbo].[F_RECLAMATION_TENTATIVE]')
)
    CREATE INDEX [IX_F_RECLAMATION_TENTATIVE_ReclamationId]
        ON [dbo].[F_RECLAMATION_TENTATIVE] ([ReclamationId]);
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_F_RECLAMATION_TENTATIVE_CommandePiece_DateJour'
      AND object_id = OBJECT_ID(N'[dbo].[F_RECLAMATION_TENTATIVE]')
)
    CREATE UNIQUE INDEX [IX_F_RECLAMATION_TENTATIVE_CommandePiece_DateJour]
        ON [dbo].[F_RECLAMATION_TENTATIVE] ([CommandePiece], [DateJour]);
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[F_RECLAMATION_TENTATIVE]', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[F_RECLAMATION_TENTATIVE];
END
");
        }
    }
}
