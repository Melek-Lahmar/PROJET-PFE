using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web_Api.Migrations
{
    /// <summary>
    /// Refonte 2026-05-09 — création des tables Sections 3 (Client), 4 (Admin) et 5 (Chatbot).
    ///
    /// Section 3 :
    ///   - F_CLIENT_ADDRESS (carnet adresses, max 3 validé API)
    ///   - F_LIVREUR_POSITION (dernière position connue, PK=LivreurUserId)
    ///   - F_SMS_LOG (journal SMS pré-livraison)
    ///   - F_DOCENTETE.ProximityAlertSent BIT (anti-spam push proximité)
    ///   - ProfilUtilisateur.ContactPreference NVARCHAR(20) DEFAULT 'Both'
    ///
    /// Section 4 :
    ///   - F_APP_CONFIG (singleton thème global, contrainte Id=1)
    ///   - IX_F_RECLAMATION_Stats sur (CreatedAt, Statut, TypeCas, Gouvernorat)
    ///
    /// Section 5 :
    ///   - F_CHATBOT_SESSION
    ///   - F_CHATBOT_MESSAGE
    ///   - F_CHATBOT_INSIGHT
    ///   - F_CHATBOT_PENDING_ACTION
    ///   - F_CHATBOT_ACTION_LOG
    ///
    /// Migration idempotente.
    /// </summary>
    public partial class AddRefonteTablesSections345 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ---------------- Section 3 ----------------

            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.F_CLIENT_ADDRESS', 'U') IS NULL
    CREATE TABLE [dbo].[F_CLIENT_ADDRESS] (
        [Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [ClientUserId] uniqueidentifier NOT NULL,
        [Label] nvarchar(50) NOT NULL,
        [Adresse] nvarchar(500) NOT NULL,
        [Gouvernorat] nvarchar(50) NOT NULL,
        [Delegation] nvarchar(100) NULL,
        [Ville] nvarchar(100) NOT NULL,
        [CodePostal] nvarchar(10) NULL,
        [Latitude] decimal(10,7) NULL,
        [Longitude] decimal(10,7) NULL,
        [IsDefault] bit NOT NULL DEFAULT (0),
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_F_CLIENT_ADDRESS] PRIMARY KEY ([Id])
    );
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_F_CLIENT_ADDRESS_ClientUserId' AND object_id = OBJECT_ID('dbo.F_CLIENT_ADDRESS'))
    CREATE INDEX [IX_F_CLIENT_ADDRESS_ClientUserId] ON [dbo].[F_CLIENT_ADDRESS] ([ClientUserId]);
");

            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.F_LIVREUR_POSITION', 'U') IS NULL
    CREATE TABLE [dbo].[F_LIVREUR_POSITION] (
        [LivreurUserId] uniqueidentifier NOT NULL,
        [Lat] decimal(10,7) NOT NULL,
        [Lng] decimal(10,7) NOT NULL,
        [Accuracy] decimal(8,2) NULL,
        [UpdatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [IsBroadcasting] bit NOT NULL DEFAULT (0),
        CONSTRAINT [PK_F_LIVREUR_POSITION] PRIMARY KEY ([LivreurUserId])
    );
");

            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.F_SMS_LOG', 'U') IS NULL
    CREATE TABLE [dbo].[F_SMS_LOG] (
        [Id] int IDENTITY(1,1) NOT NULL,
        [DoPiece] nvarchar(13) NOT NULL,
        [Phone] nvarchar(20) NOT NULL,
        [Message] nvarchar(500) NOT NULL,
        [SentAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [Provider] nvarchar(20) NOT NULL DEFAULT ('Mock'),
        [Success] bit NOT NULL DEFAULT (0),
        [ErrorMessage] nvarchar(500) NULL,
        CONSTRAINT [PK_F_SMS_LOG] PRIMARY KEY ([Id])
    );
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_F_SMS_LOG_DoPiece_SentAt' AND object_id = OBJECT_ID('dbo.F_SMS_LOG'))
    CREATE INDEX [IX_F_SMS_LOG_DoPiece_SentAt] ON [dbo].[F_SMS_LOG] ([DoPiece], [SentAt]);
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.F_DOCENTETE', 'ProximityAlertSent') IS NULL
    ALTER TABLE [dbo].[F_DOCENTETE]
    ADD [ProximityAlertSent] bit NOT NULL CONSTRAINT DF_F_DOCENTETE_ProximityAlertSent DEFAULT (0);
");

            // ProfilUtilisateur — colonne ContactPreference (Both | AppelOnly | SmsOnly)
            // Le nom de table peut être ProfilUtilisateur (pas F_) selon le schéma existant.
            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.ProfilUtilisateur', 'U') IS NOT NULL
   AND COL_LENGTH('dbo.ProfilUtilisateur', 'ContactPreference') IS NULL
    ALTER TABLE [dbo].[ProfilUtilisateur]
    ADD [ContactPreference] nvarchar(20) NOT NULL CONSTRAINT DF_ProfilUtilisateur_ContactPreference DEFAULT ('Both');
");

            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.ProfilsUtilisateurs', 'U') IS NOT NULL
   AND COL_LENGTH('dbo.ProfilsUtilisateurs', 'ContactPreference') IS NULL
    ALTER TABLE [dbo].[ProfilsUtilisateurs]
    ADD [ContactPreference] nvarchar(20) NOT NULL CONSTRAINT DF_ProfilsUtilisateurs_ContactPreference DEFAULT ('Both');
");

            // ---------------- Section 4 ----------------

            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.F_APP_CONFIG', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[F_APP_CONFIG] (
        [Id] int NOT NULL,
        [PrimaryColor] nvarchar(7) NOT NULL DEFAULT ('#3F51B5'),
        [ThemeMode] nvarchar(10) NOT NULL DEFAULT ('auto'),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedByUserId] uniqueidentifier NULL,
        CONSTRAINT [PK_F_APP_CONFIG] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_AppConfig_OneRow] CHECK ([Id] = 1)
    );

    INSERT INTO [dbo].[F_APP_CONFIG] (Id, PrimaryColor, ThemeMode) VALUES (1, '#3F51B5', 'auto');
END
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_F_RECLAMATION_Stats' AND object_id = OBJECT_ID('dbo.F_RECLAMATION'))
    CREATE INDEX [IX_F_RECLAMATION_Stats]
    ON [dbo].[F_RECLAMATION] ([CreatedAt], [Statut], [TypeCas]);
");

            // ---------------- Section 5 ----------------

            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.F_CHATBOT_SESSION', 'U') IS NULL
    CREATE TABLE [dbo].[F_CHATBOT_SESSION] (
        [Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [UserId] uniqueidentifier NOT NULL,
        [StartedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [LastActivityAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [Language] nvarchar(10) NOT NULL DEFAULT ('fr'),
        CONSTRAINT [PK_F_CHATBOT_SESSION] PRIMARY KEY ([Id])
    );
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_F_CHATBOT_SESSION_User_Activity' AND object_id = OBJECT_ID('dbo.F_CHATBOT_SESSION'))
    CREATE INDEX [IX_F_CHATBOT_SESSION_User_Activity] ON [dbo].[F_CHATBOT_SESSION] ([UserId], [LastActivityAt]);
");

            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.F_CHATBOT_MESSAGE', 'U') IS NULL
    CREATE TABLE [dbo].[F_CHATBOT_MESSAGE] (
        [Id] bigint IDENTITY(1,1) NOT NULL,
        [SessionId] uniqueidentifier NOT NULL,
        [Role] nvarchar(20) NOT NULL,
        [Content] nvarchar(max) NOT NULL,
        [Action] nvarchar(20) NULL,
        [DataJson] nvarchar(max) NULL,
        [Feedback] nvarchar(10) NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_F_CHATBOT_MESSAGE] PRIMARY KEY ([Id])
    );
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_F_CHATBOT_MESSAGE_Session_Created' AND object_id = OBJECT_ID('dbo.F_CHATBOT_MESSAGE'))
    CREATE INDEX [IX_F_CHATBOT_MESSAGE_Session_Created] ON [dbo].[F_CHATBOT_MESSAGE] ([SessionId], [CreatedAt]);
");

            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.F_CHATBOT_INSIGHT', 'U') IS NULL
    CREATE TABLE [dbo].[F_CHATBOT_INSIGHT] (
        [Id] bigint IDENTITY(1,1) NOT NULL,
        [Type] nvarchar(50) NOT NULL,
        [Severity] nvarchar(10) NOT NULL DEFAULT ('info'),
        [Title] nvarchar(200) NOT NULL,
        [Message] nvarchar(500) NOT NULL,
        [PayloadJson] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [ShownToAdminAt] datetime2 NULL,
        [DismissedAt] datetime2 NULL,
        [AdminFeedback] nvarchar(15) NULL,
        CONSTRAINT [PK_F_CHATBOT_INSIGHT] PRIMARY KEY ([Id])
    );
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_F_CHATBOT_INSIGHT_Created' AND object_id = OBJECT_ID('dbo.F_CHATBOT_INSIGHT'))
    CREATE INDEX [IX_F_CHATBOT_INSIGHT_Created] ON [dbo].[F_CHATBOT_INSIGHT] ([CreatedAt]);
");

            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.F_CHATBOT_PENDING_ACTION', 'U') IS NULL
    CREATE TABLE [dbo].[F_CHATBOT_PENDING_ACTION] (
        [Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [UserId] uniqueidentifier NOT NULL,
        [SessionId] uniqueidentifier NOT NULL,
        [ActionType] nvarchar(50) NOT NULL,
        [ParamsJson] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [ExpiresAt] datetime2 NOT NULL,
        CONSTRAINT [PK_F_CHATBOT_PENDING_ACTION] PRIMARY KEY ([Id])
    );
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_F_CHATBOT_PENDING_ACTION_User_Expires' AND object_id = OBJECT_ID('dbo.F_CHATBOT_PENDING_ACTION'))
    CREATE INDEX [IX_F_CHATBOT_PENDING_ACTION_User_Expires] ON [dbo].[F_CHATBOT_PENDING_ACTION] ([UserId], [ExpiresAt]);
");

            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.F_CHATBOT_ACTION_LOG', 'U') IS NULL
    CREATE TABLE [dbo].[F_CHATBOT_ACTION_LOG] (
        [Id] bigint IDENTITY(1,1) NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [ActionType] nvarchar(50) NOT NULL,
        [ParamsJson] nvarchar(max) NOT NULL,
        [Result] nvarchar(20) NOT NULL,
        [ErrorMessage] nvarchar(500) NULL,
        [OriginalQuestion] nvarchar(500) NOT NULL,
        [ExecutedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_F_CHATBOT_ACTION_LOG] PRIMARY KEY ([Id])
    );
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_F_CHATBOT_ACTION_LOG_User_Executed' AND object_id = OBJECT_ID('dbo.F_CHATBOT_ACTION_LOG'))
    CREATE INDEX [IX_F_CHATBOT_ACTION_LOG_User_Executed] ON [dbo].[F_CHATBOT_ACTION_LOG] ([UserId], [ExecutedAt]);
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Section 5
            migrationBuilder.Sql("IF OBJECT_ID('dbo.F_CHATBOT_ACTION_LOG', 'U') IS NOT NULL DROP TABLE [dbo].[F_CHATBOT_ACTION_LOG];");
            migrationBuilder.Sql("IF OBJECT_ID('dbo.F_CHATBOT_PENDING_ACTION', 'U') IS NOT NULL DROP TABLE [dbo].[F_CHATBOT_PENDING_ACTION];");
            migrationBuilder.Sql("IF OBJECT_ID('dbo.F_CHATBOT_INSIGHT', 'U') IS NOT NULL DROP TABLE [dbo].[F_CHATBOT_INSIGHT];");
            migrationBuilder.Sql("IF OBJECT_ID('dbo.F_CHATBOT_MESSAGE', 'U') IS NOT NULL DROP TABLE [dbo].[F_CHATBOT_MESSAGE];");
            migrationBuilder.Sql("IF OBJECT_ID('dbo.F_CHATBOT_SESSION', 'U') IS NOT NULL DROP TABLE [dbo].[F_CHATBOT_SESSION];");

            // Section 4
            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_F_RECLAMATION_Stats' AND object_id = OBJECT_ID('dbo.F_RECLAMATION'))
    DROP INDEX [IX_F_RECLAMATION_Stats] ON [dbo].[F_RECLAMATION];
");
            migrationBuilder.Sql("IF OBJECT_ID('dbo.F_APP_CONFIG', 'U') IS NOT NULL DROP TABLE [dbo].[F_APP_CONFIG];");

            // Section 3
            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_ProfilUtilisateur_ContactPreference')
    ALTER TABLE [dbo].[ProfilUtilisateur] DROP CONSTRAINT DF_ProfilUtilisateur_ContactPreference;
IF OBJECT_ID('dbo.ProfilUtilisateur', 'U') IS NOT NULL AND COL_LENGTH('dbo.ProfilUtilisateur', 'ContactPreference') IS NOT NULL
    ALTER TABLE [dbo].[ProfilUtilisateur] DROP COLUMN [ContactPreference];

IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_ProfilsUtilisateurs_ContactPreference')
    ALTER TABLE [dbo].[ProfilsUtilisateurs] DROP CONSTRAINT DF_ProfilsUtilisateurs_ContactPreference;
IF OBJECT_ID('dbo.ProfilsUtilisateurs', 'U') IS NOT NULL AND COL_LENGTH('dbo.ProfilsUtilisateurs', 'ContactPreference') IS NOT NULL
    ALTER TABLE [dbo].[ProfilsUtilisateurs] DROP COLUMN [ContactPreference];
");

            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_F_DOCENTETE_ProximityAlertSent')
    ALTER TABLE [dbo].[F_DOCENTETE] DROP CONSTRAINT DF_F_DOCENTETE_ProximityAlertSent;
IF COL_LENGTH('dbo.F_DOCENTETE', 'ProximityAlertSent') IS NOT NULL
    ALTER TABLE [dbo].[F_DOCENTETE] DROP COLUMN [ProximityAlertSent];
");

            migrationBuilder.Sql("IF OBJECT_ID('dbo.F_SMS_LOG', 'U') IS NOT NULL DROP TABLE [dbo].[F_SMS_LOG];");
            migrationBuilder.Sql("IF OBJECT_ID('dbo.F_LIVREUR_POSITION', 'U') IS NOT NULL DROP TABLE [dbo].[F_LIVREUR_POSITION];");
            migrationBuilder.Sql("IF OBJECT_ID('dbo.F_CLIENT_ADDRESS', 'U') IS NOT NULL DROP TABLE [dbo].[F_CLIENT_ADDRESS];");
        }
    }
}
