using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Web_Api.data;

#nullable disable

namespace Web_Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260518010000_AddRefonteZonesTransitSupervisor")]
    public partial class AddRefonteZonesTransitSupervisor : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[ProfilsUtilisateurs]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.ProfilsUtilisateurs', N'IsTransit') IS NULL
        ALTER TABLE [dbo].[ProfilsUtilisateurs]
        ADD [IsTransit] bit NOT NULL CONSTRAINT [DF_ProfilsUtilisateurs_IsTransit] DEFAULT (0);

    IF COL_LENGTH(N'dbo.ProfilsUtilisateurs', N'DepotRattacheNo') IS NULL
        ALTER TABLE [dbo].[ProfilsUtilisateurs]
        ADD [DepotRattacheNo] int NULL;
END
");

            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[F_DOCENTETE]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.F_DOCENTETE', N'DeliveryMode') IS NULL
        ALTER TABLE [dbo].[F_DOCENTETE]
        ADD [DeliveryMode] nvarchar(20) NOT NULL CONSTRAINT [DF_F_DOCENTETE_DeliveryMode] DEFAULT (N'HOME_DELIVERY');

    IF COL_LENGTH(N'dbo.F_DOCENTETE', N'PickupDepotNo') IS NULL
        ALTER TABLE [dbo].[F_DOCENTETE]
        ADD [PickupDepotNo] int NULL;

    IF COL_LENGTH(N'dbo.F_DOCENTETE', N'GeoValidationStatus') IS NULL
        ALTER TABLE [dbo].[F_DOCENTETE]
        ADD [GeoValidationStatus] nvarchar(20) NULL;

    IF COL_LENGTH(N'dbo.F_DOCENTETE', N'HasDeliveryIncident') IS NULL
        ALTER TABLE [dbo].[F_DOCENTETE]
        ADD [HasDeliveryIncident] bit NOT NULL CONSTRAINT [DF_F_DOCENTETE_HasDeliveryIncident] DEFAULT (0);

    IF COL_LENGTH(N'dbo.F_DOCENTETE', N'GeoLat') IS NULL
        ALTER TABLE [dbo].[F_DOCENTETE]
        ADD [GeoLat] decimal(9,6) NULL;

    IF COL_LENGTH(N'dbo.F_DOCENTETE', N'GeoLng') IS NULL
        ALTER TABLE [dbo].[F_DOCENTETE]
        ADD [GeoLng] decimal(9,6) NULL;
END
");

            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[F_CLIENT_ADDRESS]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.F_CLIENT_ADDRESS', N'Landmark') IS NULL
        ALTER TABLE [dbo].[F_CLIENT_ADDRESS]
        ADD [Landmark] nvarchar(200) NULL;

    IF COL_LENGTH(N'dbo.F_CLIENT_ADDRESS', N'GeoValidationStatus') IS NULL
        ALTER TABLE [dbo].[F_CLIENT_ADDRESS]
        ADD [GeoValidationStatus] nvarchar(20) NULL;
END
");

            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[F_DEPOT_ZONE]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[F_DEPOT_ZONE] (
        [Id] uniqueidentifier NOT NULL,
        [DepotNo] int NOT NULL,
        [Gouvernorat] nvarchar(50) NOT NULL,
        [Delegation] nvarchar(100) NOT NULL,
        [IsPrimary] bit NOT NULL CONSTRAINT [DF_F_DEPOT_ZONE_IsPrimary] DEFAULT (0),
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_F_DEPOT_ZONE] PRIMARY KEY ([Id])
    );
END
");

            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[F_LIVREUR_ZONE]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[F_LIVREUR_ZONE] (
        [Id] uniqueidentifier NOT NULL,
        [LivreurUserId] uniqueidentifier NOT NULL,
        [Gouvernorat] nvarchar(50) NOT NULL,
        [Delegation] nvarchar(100) NOT NULL,
        [AssignedByUserId] uniqueidentifier NOT NULL,
        [AssignedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_F_LIVREUR_ZONE] PRIMARY KEY ([Id])
    );
END
");

            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[F_TRANSFERT]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[F_TRANSFERT] (
        [Id] uniqueidentifier NOT NULL,
        [DoPiece] nvarchar(20) NOT NULL,
        [ArRef] nvarchar(50) NOT NULL,
        [Quantite] decimal(18,4) NOT NULL,
        [SourceDepotNo] int NOT NULL,
        [DestinationDepotNo] int NOT NULL,
        [TransitLivreurUserId] uniqueidentifier NULL,
        [Status] nvarchar(30) NOT NULL CONSTRAINT [DF_F_TRANSFERT_Status] DEFAULT (N'EN_ATTENTE_TRANSIT'),
        [AffectedAt] datetime2 NOT NULL,
        [PickedUpAt] datetime2 NULL,
        [DeliveredAt] datetime2 NULL,
        [EscalatedAt] datetime2 NULL,
        [PickupGpsLatitude] decimal(9,6) NULL,
        [PickupGpsLongitude] decimal(9,6) NULL,
        [DeliveryGpsLatitude] decimal(9,6) NULL,
        [DeliveryGpsLongitude] decimal(9,6) NULL,
        [AlgoReasoning] nvarchar(500) NULL,
        [Version] int NOT NULL CONSTRAINT [DF_F_TRANSFERT_Version] DEFAULT (1),
        CONSTRAINT [PK_F_TRANSFERT] PRIMARY KEY ([Id])
    );
END
");

            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[F_TRANSFERT_AUDIT_LOG]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[F_TRANSFERT_AUDIT_LOG] (
        [Id] uniqueidentifier NOT NULL,
        [TransfertId] uniqueidentifier NOT NULL,
        [ActionType] nvarchar(50) NOT NULL,
        [ActorUserId] uniqueidentifier NULL,
        [SnapshotBefore] nvarchar(max) NULL,
        [SnapshotAfter] nvarchar(max) NULL,
        [Motif] nvarchar(500) NULL,
        [OccurredAt] datetime2 NOT NULL,
        CONSTRAINT [PK_F_TRANSFERT_AUDIT_LOG] PRIMARY KEY ([Id])
    );
END
");

            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[F_SUPERVISOR_ALERT]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[F_SUPERVISOR_ALERT] (
        [Id] uniqueidentifier NOT NULL,
        [Severity] nvarchar(10) NOT NULL,
        [AlertType] nvarchar(50) NOT NULL,
        [RelatedTransfertId] uniqueidentifier NULL,
        [Message] nvarchar(500) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [AcknowledgedByUserId] uniqueidentifier NULL,
        [AcknowledgedAt] datetime2 NULL,
        CONSTRAINT [PK_F_SUPERVISOR_ALERT] PRIMARY KEY ([Id])
    );
END
");

            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[F_DELIVERY_INCIDENT_PHOTO]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[F_DELIVERY_INCIDENT_PHOTO] (
        [Id] uniqueidentifier NOT NULL,
        [DoPiece] nvarchar(20) NOT NULL,
        [LivreurUserId] uniqueidentifier NOT NULL,
        [CloudinaryUrl] nvarchar(500) NOT NULL,
        [CloudinaryPublicId] nvarchar(200) NOT NULL,
        [PhotoOrder] int NOT NULL,
        [Comment] nvarchar(1000) NULL,
        [UploadedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_F_DELIVERY_INCIDENT_PHOTO] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_IncidentPhoto_Order] CHECK ([PhotoOrder] BETWEEN 1 AND 5)
    );
END
");

            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[ProfilsUtilisateurs]', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ProfilUtilisateur_DepotRattacheNo' AND object_id = OBJECT_ID(N'[dbo].[ProfilsUtilisateurs]')) CREATE INDEX [IX_ProfilUtilisateur_DepotRattacheNo] ON [dbo].[ProfilsUtilisateurs] ([DepotRattacheNo]);");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_DOCENTETE]', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_F_DOCENTETE_PickupDepotNo' AND object_id = OBJECT_ID(N'[dbo].[F_DOCENTETE]')) CREATE INDEX [IX_F_DOCENTETE_PickupDepotNo] ON [dbo].[F_DOCENTETE] ([PickupDepotNo]);");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_DEPOT_ZONE]', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DepotZone_Delegation' AND object_id = OBJECT_ID(N'[dbo].[F_DEPOT_ZONE]')) CREATE INDEX [IX_DepotZone_Delegation] ON [dbo].[F_DEPOT_ZONE] ([Gouvernorat], [Delegation]);");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_DEPOT_ZONE]', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DepotZone_Primary_Lookup' AND object_id = OBJECT_ID(N'[dbo].[F_DEPOT_ZONE]')) CREATE INDEX [IX_DepotZone_Primary_Lookup] ON [dbo].[F_DEPOT_ZONE] ([Gouvernorat], [Delegation], [IsPrimary]);");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_DEPOT_ZONE]', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_F_DEPOT_ZONE_DepotNo_Gouvernorat_Delegation' AND object_id = OBJECT_ID(N'[dbo].[F_DEPOT_ZONE]')) CREATE UNIQUE INDEX [IX_F_DEPOT_ZONE_DepotNo_Gouvernorat_Delegation] ON [dbo].[F_DEPOT_ZONE] ([DepotNo], [Gouvernorat], [Delegation]);");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_LIVREUR_ZONE]', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_LivreurZone_Delegation' AND object_id = OBJECT_ID(N'[dbo].[F_LIVREUR_ZONE]')) CREATE INDEX [IX_LivreurZone_Delegation] ON [dbo].[F_LIVREUR_ZONE] ([Gouvernorat], [Delegation]);");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_LIVREUR_ZONE]', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_F_LIVREUR_ZONE_LivreurUserId_Gouvernorat_Delegation' AND object_id = OBJECT_ID(N'[dbo].[F_LIVREUR_ZONE]')) CREATE UNIQUE INDEX [IX_F_LIVREUR_ZONE_LivreurUserId_Gouvernorat_Delegation] ON [dbo].[F_LIVREUR_ZONE] ([LivreurUserId], [Gouvernorat], [Delegation]);");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_TRANSFERT]', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_F_TRANSFERT_Status' AND object_id = OBJECT_ID(N'[dbo].[F_TRANSFERT]')) CREATE INDEX [IX_F_TRANSFERT_Status] ON [dbo].[F_TRANSFERT] ([Status]);");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_TRANSFERT]', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_F_TRANSFERT_TransitLivreurUserId' AND object_id = OBJECT_ID(N'[dbo].[F_TRANSFERT]')) CREATE INDEX [IX_F_TRANSFERT_TransitLivreurUserId] ON [dbo].[F_TRANSFERT] ([TransitLivreurUserId]);");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_TRANSFERT]', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_F_TRANSFERT_SourceDepotNo_Status' AND object_id = OBJECT_ID(N'[dbo].[F_TRANSFERT]')) CREATE INDEX [IX_F_TRANSFERT_SourceDepotNo_Status] ON [dbo].[F_TRANSFERT] ([SourceDepotNo], [Status]);");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_TRANSFERT]', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_F_TRANSFERT_DoPiece_ArRef_Status' AND object_id = OBJECT_ID(N'[dbo].[F_TRANSFERT]')) CREATE INDEX [IX_F_TRANSFERT_DoPiece_ArRef_Status] ON [dbo].[F_TRANSFERT] ([DoPiece], [ArRef], [Status]);");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_TRANSFERT_AUDIT_LOG]', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_F_TRANSFERT_AUDIT_LOG_TransfertId_OccurredAt' AND object_id = OBJECT_ID(N'[dbo].[F_TRANSFERT_AUDIT_LOG]')) CREATE INDEX [IX_F_TRANSFERT_AUDIT_LOG_TransfertId_OccurredAt] ON [dbo].[F_TRANSFERT_AUDIT_LOG] ([TransfertId], [OccurredAt]);");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_SUPERVISOR_ALERT]', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_F_SUPERVISOR_ALERT_AcknowledgedAt_Severity' AND object_id = OBJECT_ID(N'[dbo].[F_SUPERVISOR_ALERT]')) CREATE INDEX [IX_F_SUPERVISOR_ALERT_AcknowledgedAt_Severity] ON [dbo].[F_SUPERVISOR_ALERT] ([AcknowledgedAt], [Severity]);");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_DELIVERY_INCIDENT_PHOTO]', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_F_DELIVERY_INCIDENT_PHOTO_DoPiece' AND object_id = OBJECT_ID(N'[dbo].[F_DELIVERY_INCIDENT_PHOTO]')) CREATE INDEX [IX_F_DELIVERY_INCIDENT_PHOTO_DoPiece] ON [dbo].[F_DELIVERY_INCIDENT_PHOTO] ([DoPiece]);");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_DELIVERY_INCIDENT_PHOTO]', N'U') IS NOT NULL DROP TABLE [dbo].[F_DELIVERY_INCIDENT_PHOTO];");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_SUPERVISOR_ALERT]', N'U') IS NOT NULL DROP TABLE [dbo].[F_SUPERVISOR_ALERT];");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_TRANSFERT_AUDIT_LOG]', N'U') IS NOT NULL DROP TABLE [dbo].[F_TRANSFERT_AUDIT_LOG];");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_TRANSFERT]', N'U') IS NOT NULL DROP TABLE [dbo].[F_TRANSFERT];");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_LIVREUR_ZONE]', N'U') IS NOT NULL DROP TABLE [dbo].[F_LIVREUR_ZONE];");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_DEPOT_ZONE]', N'U') IS NOT NULL DROP TABLE [dbo].[F_DEPOT_ZONE];");

            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[ProfilsUtilisateurs]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.ProfilsUtilisateurs', N'IsTransit') IS NOT NULL ALTER TABLE [dbo].[ProfilsUtilisateurs] DROP COLUMN [IsTransit];");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[ProfilsUtilisateurs]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.ProfilsUtilisateurs', N'DepotRattacheNo') IS NOT NULL ALTER TABLE [dbo].[ProfilsUtilisateurs] DROP COLUMN [DepotRattacheNo];");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_DOCENTETE]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.F_DOCENTETE', N'DeliveryMode') IS NOT NULL ALTER TABLE [dbo].[F_DOCENTETE] DROP COLUMN [DeliveryMode];");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_DOCENTETE]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.F_DOCENTETE', N'PickupDepotNo') IS NOT NULL ALTER TABLE [dbo].[F_DOCENTETE] DROP COLUMN [PickupDepotNo];");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_DOCENTETE]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.F_DOCENTETE', N'GeoValidationStatus') IS NOT NULL ALTER TABLE [dbo].[F_DOCENTETE] DROP COLUMN [GeoValidationStatus];");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_DOCENTETE]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.F_DOCENTETE', N'HasDeliveryIncident') IS NOT NULL ALTER TABLE [dbo].[F_DOCENTETE] DROP COLUMN [HasDeliveryIncident];");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_DOCENTETE]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.F_DOCENTETE', N'GeoLat') IS NOT NULL ALTER TABLE [dbo].[F_DOCENTETE] DROP COLUMN [GeoLat];");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_DOCENTETE]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.F_DOCENTETE', N'GeoLng') IS NOT NULL ALTER TABLE [dbo].[F_DOCENTETE] DROP COLUMN [GeoLng];");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_CLIENT_ADDRESS]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.F_CLIENT_ADDRESS', N'Landmark') IS NOT NULL ALTER TABLE [dbo].[F_CLIENT_ADDRESS] DROP COLUMN [Landmark];");
            migrationBuilder.Sql(@"IF OBJECT_ID(N'[dbo].[F_CLIENT_ADDRESS]', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.F_CLIENT_ADDRESS', N'GeoValidationStatus') IS NOT NULL ALTER TABLE [dbo].[F_CLIENT_ADDRESS] DROP COLUMN [GeoValidationStatus];");
        }
    }
}
