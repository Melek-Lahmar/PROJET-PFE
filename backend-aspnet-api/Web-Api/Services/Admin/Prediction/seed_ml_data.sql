-- =============================================================================
-- Seed ML.NET — méthode B du ML_NET_GUIDE.md
-- Insère 10 profils clients + 250 commandes + 250 livraisons sur 100 jours
-- avec un taux de retour réaliste par gouvernorat (Tunisie COD).
--
-- Cible : faire passer PredictionService de "synthetic" à "real_data".
-- Seuils requis : >= 50 commandes/livraisons, >= 30 jours d'historique.
--
-- Usage :
--   sqlcmd -S "PCTAWFIK\SQLEXPRESS01" -d webApi_flutter_test -E -i seed_ml_data.sql
--
-- Idempotent : profils filtrés par CodeClientSage NOT EXISTS,
-- commandes filtrées par DO_Piece NOT EXISTS (préfixe BCAI*).
-- Relance possible sans doublons.
-- =============================================================================

SET NOCOUNT ON;
USE webApi_flutter_test;

-- ---------------------------------------------------------------------------
-- 1) Création / mise à jour de 10 profils clients fictifs
--    Gouvernorats codés via l'enum GouvernoratTunisie (alphabétique) :
--      Ariana=0, Beja=1, BenArous=2, Bizerte=3, Gabes=4, Gafsa=5, Jendouba=6,
--      Kairouan=7, Kasserine=8, Kebili=9, Kef=10, Mahdia=11, Manouba=12,
--      Medenine=13, Monastir=14, Nabeul=15, Sfax=16, SidiBouzid=17,
--      Siliana=18, Sousse=19, Tataouine=20, Tozeur=21, Tunis=22, Zaghouan=23
--    TypeClient : B2C=0, B2B=1
-- ---------------------------------------------------------------------------
DECLARE @profiles TABLE (
    CodeClientSage NVARCHAR(50),
    Gouv          INT,
    TypeClient    INT,
    NomComplet    NVARCHAR(150),
    Telephone     NVARCHAR(30),
    Adresse       NVARCHAR(300),
    Delegation    NVARCHAR(100)
);

INSERT INTO @profiles VALUES
    ('CLAI001', 22, 0, 'Client AI Tunis 1',     '20000001', 'Av Habib Bourguiba',   'Tunis Médina'),
    ('CLAI002', 22, 0, 'Client AI Tunis 2',     '20000002', 'Rue de Carthage',      'Bab Bhar'),
    ('CLAI003',  0, 0, 'Client AI Ariana',      '20000003', 'Av Taïeb Mhiri',       'Ariana Ville'),
    ('CLAI004', 16, 0, 'Client AI Sfax 1',      '20000004', 'Rue Lénine',           'Sfax Ville'),
    ('CLAI005', 16, 1, 'Société AI Sfax B2B',   '20000005', 'Route de Sokra',       'Sfax Ville'),
    ('CLAI006', 19, 0, 'Client AI Sousse',      '20000006', 'Av 14 Janvier',        'Sousse Médina'),
    ('CLAI007',  4, 0, 'Client AI Gabes',       '20000007', 'Av Farhat Hached',     'Gabes Médina'),
    ('CLAI008', 13, 0, 'Client AI Medenine',    '20000008', 'Av Bourguiba',         'Médenine Nord'),
    ('CLAI009',  8, 0, 'Client AI Kasserine',   '20000009', 'Av de la République',  'Kasserine Nord'),
    ('CLAI010', 11, 0, 'Client AI Mahdia',      '20000010', 'Rue de la Liberté',    'Mahdia');

INSERT INTO ProfilsUtilisateurs (
    TypeProfil, TypeClient, NomComplet, Telephone,
    Gouvernorat, Delegation, Adresse, Pays,
    CodeClientSage, EstSynchroniseAvecSage, DateCreation, IsInPause
)
SELECT
    0,                  -- TypeProfil = Client
    p.TypeClient,
    p.NomComplet,
    p.Telephone,
    p.Gouv,
    p.Delegation,
    p.Adresse,
    'Tunisie',
    p.CodeClientSage,
    1,
    GETUTCDATE(),
    0
FROM @profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM ProfilsUtilisateurs pu
    WHERE pu.CodeClientSage = p.CodeClientSage
);

PRINT '✓ Profils insérés (ou déjà présents)';

-- ---------------------------------------------------------------------------
-- 2) Génération des commandes + livraisons
-- ---------------------------------------------------------------------------

DECLARE @i        INT = 1;
DECLARE @target   INT = 250;            -- nombre de commandes
DECLARE @piece    NVARCHAR(13);
DECLARE @daysBack INT;
DECLARE @amount   DECIMAL(24,13);
DECLARE @client   NVARCHAR(50);
DECLARE @clientGouv INT;
DECLARE @govReturn FLOAT;
DECLARE @paymode  NVARCHAR(20);
DECLARE @rnd      FLOAT;
DECLARE @isReturn BIT;
DECLARE @cmdDate  DATETIME;
DECLARE @inserted INT = 0;

WHILE @i <= @target
BEGIN
    -- Identifiant commande déterministe (préfixe BCAI = "Bon Commande AI seed")
    SET @piece = 'BCAI' + RIGHT('00000000' + CAST(@i AS VARCHAR(10)), 9);

    -- Skip si déjà inséré (idempotent)
    IF EXISTS (SELECT 1 FROM F_DOCENTETE WHERE DO_Piece = @piece)
    BEGIN
        SET @i += 1;
        CONTINUE;
    END;

    -- Date entre J-100 et J (distribution uniforme → couvre largement les 30j requis)
    SET @daysBack = ABS(CHECKSUM(NEWID())) % 100;
    SET @cmdDate = DATEADD(DAY, -@daysBack, GETUTCDATE());

    -- Montant 20 → 400 DT
    SET @amount = 20.0 + (ABS(CHECKSUM(NEWID())) % 38001) / 100.0;

    -- Mode paiement : 85% CASH (réalité COD Tunisie), 15% CARD
    SET @rnd = (ABS(CHECKSUM(NEWID())) % 1000) / 1000.0;
    SET @paymode = CASE WHEN @rnd < 0.85 THEN 'CASH' ELSE 'CARD' END;

    -- Rotation sur les 10 clients fictifs
    SET @client = 'CLAI' + RIGHT('000' + CAST(((@i - 1) % 10) + 1 AS VARCHAR(10)), 3);
    SELECT @clientGouv = Gouvernorat
    FROM ProfilsUtilisateurs WHERE CodeClientSage = @client;

    -- Probabilité de retour selon gouvernorat (cohérent avec SyntheticDataGenerator)
    SET @govReturn = CASE @clientGouv
        WHEN 22 THEN 0.06   -- Tunis
        WHEN  0 THEN 0.07   -- Ariana
        WHEN 16 THEN 0.07   -- Sfax
        WHEN 19 THEN 0.08   -- Sousse
        WHEN 11 THEN 0.12   -- Mahdia
        WHEN  4 THEN 0.16   -- Gabes
        WHEN 13 THEN 0.18   -- Medenine
        WHEN  8 THEN 0.18   -- Kasserine
        ELSE 0.10
    END;

    -- Boost si montant élevé (> 200 DT) ou très élevé (> 300 DT)
    IF @amount > 200 SET @govReturn = @govReturn + 0.08;
    IF @amount > 300 SET @govReturn = @govReturn + 0.05;

    -- Tirage du retour
    SET @rnd = (ABS(CHECKSUM(NEWID())) % 1000) / 1000.0;
    SET @isReturn = CASE WHEN @rnd < @govReturn THEN 1 ELSE 0 END;

    -- INSERT commande
    INSERT INTO F_DOCENTETE (
        DO_Domaine, DO_Type, DO_Date, DO_Tiers,
        DO_TotalHT, DO_TotalHTNet, DO_TotalTTC, DO_NetAPayer,
        DO_Valide, DO_Piece,
        DO_ModeLivraison, DO_ModePaiement,
        DO_FraisLivraison, DO_TimbreFiscal,
        DO_AdresseLivraison, DO_VilleLivraison, DO_CodePostalLivraison,
        DO_TelephoneLivraison,
        TypeCommande,
        cbCreation, cbModification
    ) VALUES (
        0, 0, @cmdDate, @client,
        @amount * 0.81, @amount * 0.81, @amount, @amount,
        1,                          -- DO_Valide = 1 (CONFIRME)
        @piece,
        'HOME', @paymode,
        7.000, 0.600,
        'Adresse seed ML', 'Ville seed', '0000',
        '21000000',
        'NORMALE',
        @cmdDate, @cmdDate
    );

    -- INSERT livraison correspondante
    -- LI_Statut : 2 = Livre, 3 = Retour
    INSERT INTO F_LIVRAISON (
        DO_Piece, LI_Adresse, LI_Ville, LI_CodePostal,
        LI_Statut, LI_DateCreation, LI_DateLivree
    ) VALUES (
        @piece, 'Adresse livraison seed', 'Ville seed', '0000',
        CASE WHEN @isReturn = 1 THEN 3 ELSE 2 END,
        @cmdDate,
        DATEADD(DAY, 1 + (ABS(CHECKSUM(NEWID())) % 3), @cmdDate)
    );

    SET @inserted += 1;
    SET @i += 1;
END;

PRINT CONCAT('✓ ', @inserted, ' commande(s) + livraison(s) insérées (préfixe BCAI*)');

-- ---------------------------------------------------------------------------
-- 3) Vérification finale : ce que ML.NET va voir au prochain démarrage
-- ---------------------------------------------------------------------------
PRINT '';
PRINT '--- Diagnostic ML.NET ---';

SELECT
    'Total commandes (DO_Domaine=0, DO_Type=0)' AS Indicator,
    COUNT(*) AS Value,
    'seuil ML : 50' AS Threshold
FROM F_DOCENTETE WHERE DO_Domaine = 0 AND DO_Type = 0;

SELECT
    'Commandes avec livraison rattachée' AS Indicator,
    COUNT(*) AS Value
FROM F_DOCENTETE o
INNER JOIN F_LIVRAISON l ON l.DO_Piece = o.DO_Piece
WHERE o.DO_Domaine = 0 AND o.DO_Type = 0;

SELECT
    'Jours distincts couverts (volume_forecast)' AS Indicator,
    COUNT(DISTINCT CAST(DO_Date AS DATE)) AS Value,
    'seuil ML : 30' AS Threshold
FROM F_DOCENTETE WHERE DO_Domaine = 0 AND DO_Type = 0;

SELECT
    LI_Statut,
    CASE LI_Statut
        WHEN 0 THEN 'Confirme'
        WHEN 1 THEN 'EnLivraison'
        WHEN 2 THEN 'Livre'
        WHEN 3 THEN 'Retour'
        WHEN 4 THEN 'Depot'
        WHEN 5 THEN 'Reporte'
    END AS Label,
    COUNT(*) AS NbLivraisons
FROM F_LIVRAISON
GROUP BY LI_Statut
ORDER BY LI_Statut;

SELECT
    p.CodeClientSage,
    p.Gouvernorat,
    p.TypeClient,
    COUNT(o.cbMarq) AS NbCommandes,
    SUM(CASE WHEN l.LI_Statut = 3 THEN 1 ELSE 0 END) AS NbRetours
FROM ProfilsUtilisateurs p
LEFT JOIN F_DOCENTETE o ON o.DO_Tiers = p.CodeClientSage
LEFT JOIN F_LIVRAISON l ON l.DO_Piece = o.DO_Piece
WHERE p.CodeClientSage LIKE 'CLAI%'
GROUP BY p.CodeClientSage, p.Gouvernorat, p.TypeClient
ORDER BY p.CodeClientSage;

PRINT '';
PRINT '✓ Seed terminé. Redémarre le backend (dotnet run) pour que ML.NET ré-entraîne.';
