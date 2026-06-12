using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSageX3DocumentFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH(N'dbo.F_DOCENTETE', N'DO_NumeroSageX3') IS NULL
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [DO_NumeroSageX3] nvarchar(25) NULL;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH(N'dbo.F_DOCENTETE', N'DO_ValiderSageX3') IS NULL
    ALTER TABLE [dbo].[F_DOCENTETE] ADD [DO_ValiderSageX3] bit NOT NULL CONSTRAINT [DF_F_DOCENTETE_DO_ValiderSageX3] DEFAULT(0) WITH VALUES;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH(N'dbo.F_DOCENTETE', N'DO_NumeroSageX3') IS NOT NULL
    ALTER TABLE [dbo].[F_DOCENTETE] DROP COLUMN [DO_NumeroSageX3];
");

            migrationBuilder.Sql(@"
IF COL_LENGTH(N'dbo.F_DOCENTETE', N'DO_ValiderSageX3') IS NOT NULL
BEGIN
    DECLARE @constraintName sysname;

    SELECT @constraintName = dc.name
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c
        ON c.object_id = dc.parent_object_id
       AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = OBJECT_ID(N'dbo.F_DOCENTETE')
      AND c.name = N'DO_ValiderSageX3';

    IF @constraintName IS NOT NULL
        EXEC(N'ALTER TABLE [dbo].[F_DOCENTETE] DROP CONSTRAINT ' + QUOTENAME(@constraintName));

    ALTER TABLE [dbo].[F_DOCENTETE] DROP COLUMN [DO_ValiderSageX3];
END
");
        }
    }
}
