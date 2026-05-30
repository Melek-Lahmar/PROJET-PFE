using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <inheritdoc />
    public partial class AddArticleDescription : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('dbo.F_ARTICLE', 'AR_Description') IS NULL
                    ALTER TABLE [dbo].[F_ARTICLE] ADD [AR_Description] nvarchar(2000) NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('dbo.F_ARTICLE', 'AR_Description') IS NOT NULL
                    ALTER TABLE [dbo].[F_ARTICLE] DROP COLUMN [AR_Description];
                """);
        }
    }
}
