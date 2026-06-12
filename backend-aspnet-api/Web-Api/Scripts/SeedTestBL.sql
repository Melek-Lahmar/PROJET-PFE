-- ============================================================================
-- Données de test : 2 BL pour l'onglet Expédition du vendeur (caisse@gmail.com)
--   - BLDOMTEST01 : Livraison à domicile (client Tunis)
--   - BLTRATEST01 : Transit inter-dépôt (client Sfax) + F_TRANSFERT en attente
-- Dépôt vendeur = 1. Idempotent : supprime puis recrée les lignes de test.
-- ============================================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;

DECLARE @depot INT = 1;
DECLARE @tiers NVARCHAR(50) = N'CTEST001';
DECLARE @now DATETIME2 = SYSUTCDATETIME();

-- 1) Nettoyage des éventuelles exécutions précédentes
DELETE FROM F_TRANSFERT WHERE DoPiece IN (N'BLDOMTEST01', N'BLTRATEST01');
DELETE FROM F_DOCLIGNE  WHERE DO_Piece IN (N'BLDOMTEST01', N'BLTRATEST01');
DELETE FROM F_DOCENTETE WHERE DO_Piece IN (N'BLDOMTEST01', N'BLTRATEST01');

-- 2) BL DOMICILE (client dans le même périmètre que le dépôt) ------------------
INSERT INTO F_DOCENTETE
    (DO_Piece, DO_Domaine, DO_Type, DO_Tiers, DO_Date, DE_No, DO_Valide,
     DO_TotalHT, DO_TotalTTC, DO_NetAPayer, DO_FraisLivraison,
     DO_ModeLivraison, DO_PassagerNomComplet, DO_PassagerGouvernorat,
     DO_AdresseLivraison, DO_VilleLivraison, DO_TelephoneLivraison)
VALUES
    (N'BLDOMTEST01', 0, 1, @tiers, @now, @depot, 1,
     100, 100, 108, 8,
     N'HOME', N'Client Domicile Test', N'Tunis',
     N'12 Rue de la Liberté, Tunis', N'Tunis', N'20000001');

INSERT INTO F_DOCLIGNE
    (DO_Piece, DO_Domaine, DO_Type, DO_Date, AR_Ref, DL_Design,
     DL_Qte, DL_PrixUnitaire, DL_MontantHT, DL_MontantTTC, CT_Num, LigneType)
VALUES
    (N'BLDOMTEST01', 0, 1, @now, N'DIS030', N'Article test domicile',
     2, 50, 100, 100, @tiers, N'STANDARD');

-- 3) BL TRANSIT (client hors gouvernorat du dépôt) ----------------------------
INSERT INTO F_DOCENTETE
    (DO_Piece, DO_Domaine, DO_Type, DO_Tiers, DO_Date, DE_No, DO_Valide,
     DO_TotalHT, DO_TotalTTC, DO_NetAPayer, DO_FraisLivraison,
     DO_ModeLivraison, DO_PassagerNomComplet, DO_PassagerGouvernorat,
     DO_AdresseLivraison, DO_VilleLivraison, DO_TelephoneLivraison)
VALUES
    (N'BLTRATEST01', 0, 1, @tiers, @now, @depot, 1,
     200, 200, 208, 8,
     N'HOME', N'Client Transit Test', N'Sfax',
     N'45 Avenue Habib Bourguiba, Sfax', N'Sfax', N'20000002');

INSERT INTO F_DOCLIGNE
    (DO_Piece, DO_Domaine, DO_Type, DO_Date, AR_Ref, DL_Design,
     DL_Qte, DL_PrixUnitaire, DL_MontantHT, DL_MontantTTC, CT_Num, LigneType)
VALUES
    (N'BLTRATEST01', 0, 1, @now, N'DIS030', N'Article test transit',
     4, 50, 200, 200, @tiers, N'STANDARD');

-- F_TRANSFERT : source = dépôt 1, destination = 102 (Sfax), statut "en attente"
-- => classe le BL en TRANSIT et le maintient "au dépôt" (onglet En attente).
INSERT INTO F_TRANSFERT
    (Id, DoPiece, ArRef, Quantite, SourceDepotNo, DestinationDepotNo,
     Status, AffectedAt, Version)
VALUES
    (NEWID(), N'BLTRATEST01', N'DIS030', 4, @depot, 102,
     N'EN_ATTENTE_TRANSIT', @now, 0);

PRINT 'OK : BLDOMTEST01 (domicile) + BLTRATEST01 (transit) créés sur le dépôt 1.';
