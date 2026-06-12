-- Réparation : recrée les tables Devis B2B manquantes.
-- Contexte : __EFMigrationsHistory contient bien
--   20260523100000_AddB2BDiscountSnapshotAndQuotes
--   20260526120000_AddProfessionalDevisTables
-- mais les tables F_DEVIS_* sont absentes (base restaurée d'un backup antérieur
-- en conservant l'historique). On recrée le schéma sans toucher l'historique.
-- Idempotent : ne fait rien si les tables existent déjà.

-- Requis pour les index filtrés ([BcPiece] IS NOT NULL).
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.F_DEVIS_ENTETE', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[F_DEVIS_ENTETE] (
        [Id] int IDENTITY(1,1) NOT NULL,
        [DevisPiece] nvarchar(20) NOT NULL,
        [ClientUserId] uniqueidentifier NOT NULL,
        [ClientCode] nvarchar(17) NULL,
        [ClientType] nvarchar(10) NOT NULL,
        [StatusKey] nvarchar(30) NOT NULL,
        [TotalHT] decimal(24,13) NOT NULL,
        [DiscountPercentSnapshot] decimal(5,2) NULL,
        [DiscountAmount] decimal(24,13) NOT NULL,
        [TotalHTNet] decimal(24,13) NOT NULL,
        [TotalTTC] decimal(24,13) NOT NULL,
        [NetAPayer] decimal(24,13) NOT NULL,
        [ValidUntil] datetime2 NULL,
        [AssignedConfirmateurId] uniqueidentifier NULL,
        [BcPiece] nvarchar(13) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedByUserId] uniqueidentifier NOT NULL,
        [Version] int NOT NULL,
        CONSTRAINT [PK_F_DEVIS_ENTETE] PRIMARY KEY ([Id])
    );

    CREATE INDEX [IX_F_DEVIS_ENTETE_AssignedConfirmateurId] ON [dbo].[F_DEVIS_ENTETE] ([AssignedConfirmateurId]);
    CREATE INDEX [IX_F_DEVIS_ENTETE_BcPiece] ON [dbo].[F_DEVIS_ENTETE] ([BcPiece]) WHERE [BcPiece] IS NOT NULL;
    CREATE INDEX [IX_F_DEVIS_ENTETE_ClientUserId] ON [dbo].[F_DEVIS_ENTETE] ([ClientUserId]);
    CREATE UNIQUE INDEX [IX_F_DEVIS_ENTETE_DevisPiece] ON [dbo].[F_DEVIS_ENTETE] ([DevisPiece]);
    CREATE INDEX [IX_F_DEVIS_ENTETE_StatusKey] ON [dbo].[F_DEVIS_ENTETE] ([StatusKey]);
END;

IF OBJECT_ID('dbo.F_DEVIS_EVENT', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[F_DEVIS_EVENT] (
        [Id] int IDENTITY(1,1) NOT NULL,
        [DevisId] int NOT NULL,
        [AuthorUserId] uniqueidentifier NULL,
        [AuthorRole] nvarchar(30) NULL,
        [EventType] nvarchar(30) NOT NULL,
        [OldStatus] nvarchar(30) NULL,
        [NewStatus] nvarchar(30) NULL,
        [Message] nvarchar(2000) NULL,
        [IsPublic] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_F_DEVIS_EVENT] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_F_DEVIS_EVENT_F_DEVIS_ENTETE_DevisId] FOREIGN KEY ([DevisId])
            REFERENCES [dbo].[F_DEVIS_ENTETE] ([Id]) ON DELETE CASCADE
    );

    CREATE INDEX [IX_F_DEVIS_EVENT_DevisId_CreatedAt] ON [dbo].[F_DEVIS_EVENT] ([DevisId], [CreatedAt]);
END;

IF OBJECT_ID('dbo.F_DEVIS_LIGNE', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[F_DEVIS_LIGNE] (
        [Id] int IDENTITY(1,1) NOT NULL,
        [DevisId] int NOT NULL,
        [ArticleRef] nvarchar(50) NOT NULL,
        [Designation] nvarchar(200) NULL,
        [Qty] decimal(24,13) NOT NULL,
        [UnitPriceHT] decimal(24,13) NOT NULL,
        [DiscountLinePercent] decimal(5,2) NULL,
        [AmountHT] decimal(24,13) NOT NULL,
        [AmountTTC] decimal(24,13) NOT NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_F_DEVIS_LIGNE] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_F_DEVIS_LIGNE_F_DEVIS_ENTETE_DevisId] FOREIGN KEY ([DevisId])
            REFERENCES [dbo].[F_DEVIS_ENTETE] ([Id]) ON DELETE CASCADE
    );

    CREATE INDEX [IX_F_DEVIS_LIGNE_DevisId_SortOrder] ON [dbo].[F_DEVIS_LIGNE] ([DevisId], [SortOrder]);
END;

COMMIT TRANSACTION;
PRINT 'F_DEVIS_* repair done.';
