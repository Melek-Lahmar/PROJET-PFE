using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <inheritdoc />
    public partial class EnsureReclamationPhotoTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[F_RECLAMATION_PHOTO]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[F_RECLAMATION_PHOTO] (
        [Id] int NOT NULL IDENTITY(1,1),
        [ReclamationId] int NOT NULL,
        [Url] nvarchar(500) NOT NULL,
        [FileName] nvarchar(255) NULL,
        [ContentType] nvarchar(100) NULL,
        [Size] bigint NULL,
        [UploadedByUserId] uniqueidentifier NULL,
        [CreatedAt] datetime2 NOT NULL CONSTRAINT [DF_F_RECLAMATION_PHOTO_CreatedAt] DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_F_RECLAMATION_PHOTO] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_F_RECLAMATION_PHOTO_F_RECLAMATION_ReclamationId] FOREIGN KEY ([ReclamationId])
            REFERENCES [dbo].[F_RECLAMATION] ([Id]) ON DELETE CASCADE
    );
END;

IF OBJECT_ID(N'[dbo].[F_RECLAMATION_PHOTO]', N'U') IS NOT NULL
   AND NOT EXISTS (
       SELECT 1
       FROM sys.indexes
       WHERE [name] = N'IX_F_RECLAMATION_PHOTO_ReclamationId'
         AND [object_id] = OBJECT_ID(N'[dbo].[F_RECLAMATION_PHOTO]')
   )
BEGIN
    CREATE INDEX [IX_F_RECLAMATION_PHOTO_ReclamationId]
        ON [dbo].[F_RECLAMATION_PHOTO] ([ReclamationId]);
END;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[F_RECLAMATION_PHOTO]', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[F_RECLAMATION_PHOTO];
END;
");
        }
    }
}
