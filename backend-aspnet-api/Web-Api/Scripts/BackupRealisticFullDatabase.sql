SET NOCOUNT ON;

DECLARE @DbName sysname = DB_NAME();
DECLARE @PrimaryPath nvarchar(4000) = N'C:\Program Files\Microsoft SQL Server\MSSQL16.MSI22\MSSQL\Backup\PFE_REALISTIC_FULL_DATABASE.bak';
DECLARE @FallbackPath nvarchar(4000) = N'C:\Temp\PFE_REALISTIC_FULL_DATABASE.bak';
DECLARE @Sql nvarchar(max);

BEGIN TRY
    SET @Sql = N'BACKUP DATABASE ' + QUOTENAME(@DbName) + N'
TO DISK = N''' + REPLACE(@PrimaryPath, '''', '''''') + N'''
WITH INIT, FORMAT, COMPRESSION, STATS = 10, NAME = N''PFE realistic full database backup'';';
    EXEC (@Sql);

    SELECT
        @DbName AS DatabaseName,
        @PrimaryPath AS BackupPath,
        CAST(1 AS bit) AS BackupGenerated,
        N'Backup généré dans le dossier SQL Server principal.' AS Message;
END TRY
BEGIN CATCH
    PRINT N'Backup principal impossible: ' + ERROR_MESSAGE();
    PRINT N'Tentative fallback vers C:\Temp. Créez C:\Temp côté serveur SQL si nécessaire.';

    SET @Sql = N'BACKUP DATABASE ' + QUOTENAME(@DbName) + N'
TO DISK = N''' + REPLACE(@FallbackPath, '''', '''''') + N'''
WITH INIT, FORMAT, COMPRESSION, STATS = 10, NAME = N''PFE realistic full database backup'';';
    EXEC (@Sql);

    SELECT
        @DbName AS DatabaseName,
        @FallbackPath AS BackupPath,
        CAST(1 AS bit) AS BackupGenerated,
        N'Backup généré dans C:\Temp; copier ensuite vers le dossier SQL Server Backup si besoin.' AS Message;
END CATCH;
