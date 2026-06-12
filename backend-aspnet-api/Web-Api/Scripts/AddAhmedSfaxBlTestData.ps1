param(
    [string]$ConnectionString = "Server=DESKTOP655INKE\MSI22;Database=webApi_old;Trusted_Connection=True;TrustServerCertificate=True"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Data

function To-DbValue {
    param($Value)
    if ($null -eq $Value) { return [DBNull]::Value }
    return $Value
}

function New-DbConnection {
    $connection = [System.Data.SqlClient.SqlConnection]::new($ConnectionString)
    $connection.Open()
    return $connection
}

function Invoke-DbQuery {
    param(
        [System.Data.SqlClient.SqlConnection]$Connection,
        [string]$Sql,
        [hashtable]$Parameters = @{},
        [System.Data.SqlClient.SqlTransaction]$Transaction = $null
    )

    $command = $Connection.CreateCommand()
    $command.CommandText = $Sql
    if ($Transaction) { $command.Transaction = $Transaction }

    foreach ($key in $Parameters.Keys) {
        $null = $command.Parameters.AddWithValue("@$key", (To-DbValue $Parameters[$key]))
    }

    $adapter = [System.Data.SqlClient.SqlDataAdapter]::new($command)
    $table = [System.Data.DataTable]::new()
    $null = $adapter.Fill($table)
    return ,$table
}

function Invoke-DbNonQuery {
    param(
        [System.Data.SqlClient.SqlConnection]$Connection,
        [string]$Sql,
        [hashtable]$Parameters = @{},
        [System.Data.SqlClient.SqlTransaction]$Transaction = $null
    )

    $command = $Connection.CreateCommand()
    $command.CommandText = $Sql
    if ($Transaction) { $command.Transaction = $Transaction }

    foreach ($key in $Parameters.Keys) {
        $null = $command.Parameters.AddWithValue("@$key", (To-DbValue $Parameters[$key]))
    }

    return $command.ExecuteNonQuery()
}

function Convert-TableRows {
    param([System.Data.DataTable]$Table)

    return @($Table.Rows | ForEach-Object {
        $row = @{}
        foreach ($column in $Table.Columns) {
            $value = $_[$column.ColumnName]
            $row[$column.ColumnName] = if ($value -is [DBNull]) { $null } else { $value }
        }
        [pscustomobject]$row
    })
}

$pieces = @(
    "BL260605A001",
    "BL260605A002",
    "BL260605A003",
    "BL260605A004",
    "BL260605A005"
)

$orders = @(
    @{
        Piece = "BL260605A001"
        Ref = "AHM-SFX-BL-001"
        ClientCode = "CLT-B2C-001"
        PaymentMode = "CASH"
        DeliveryFee = [decimal]8
        Lines = @(
            @{ Ref = "PFE000083"; Qty = [decimal]1 },
            @{ Ref = "PFE000013"; Qty = [decimal]1 },
            @{ Ref = "PFE000019"; Qty = [decimal]1 }
        )
    },
    @{
        Piece = "BL260605A002"
        Ref = "AHM-SFX-BL-002"
        ClientCode = "CLT-B2C-003"
        PaymentMode = "CARD"
        DeliveryFee = [decimal]8
        Lines = @(
            @{ Ref = "PFE000001"; Qty = [decimal]1 },
            @{ Ref = "PFE000014"; Qty = [decimal]2 },
            @{ Ref = "PFE000061"; Qty = [decimal]2 }
        )
    },
    @{
        Piece = "BL260605A003"
        Ref = "AHM-SFX-BL-003"
        ClientCode = "CLT-B2C-012"
        PaymentMode = "CASH"
        DeliveryFee = [decimal]8
        Lines = @(
            @{ Ref = "PFE000016"; Qty = [decimal]1 },
            @{ Ref = "PFE000050"; Qty = [decimal]1 },
            @{ Ref = "PFE000072"; Qty = [decimal]1 }
        )
    },
    @{
        Piece = "BL260605A004"
        Ref = "AHM-SFX-BL-004"
        ClientCode = "CLT-B2C-021"
        PaymentMode = "CARD"
        DeliveryFee = [decimal]8
        Lines = @(
            @{ Ref = "PFE000003"; Qty = [decimal]1 },
            @{ Ref = "PFE000188"; Qty = [decimal]1 },
            @{ Ref = "PFE000019"; Qty = [decimal]2 }
        )
    },
    @{
        Piece = "BL260605A005"
        Ref = "AHM-SFX-BL-005"
        ClientCode = "CLT-B2B-001"
        PaymentMode = "B2B_CREDIT"
        DeliveryFee = [decimal]8
        Lines = @(
            @{ Ref = "PFE000009"; Qty = [decimal]1 },
            @{ Ref = "PFE000039"; Qty = [decimal]2 },
            @{ Ref = "PFE000050"; Qty = [decimal]3 }
        )
    }
)

$connection = New-DbConnection

try {
    $people = Convert-TableRows -Table (Invoke-DbQuery -Connection $connection -Sql @"
SELECT
    p.CodeClientSage,
    p.UtilisateurId,
    p.NomComplet,
    p.NomSociete,
    p.Adresse,
    p.CodePostal,
    p.Telephone,
    p.Latitude,
    p.Longitude,
    ISNULL(p.DiscountPercent, 0) AS DiscountPercent,
    ISNULL(p.TypeClient, 0) AS TypeClient
FROM ProfilsUtilisateurs p
WHERE p.CodeClientSage IN ('CLT-B2C-001', 'CLT-B2C-003', 'CLT-B2C-012', 'CLT-B2C-021', 'CLT-B2B-001');
"@)

    $clientsByCode = @{}
    foreach ($client in $people) {
        $clientsByCode[$client.CodeClientSage] = $client
    }

    $users = Convert-TableRows -Table (Invoke-DbQuery -Connection $connection -Sql @"
SELECT
    u.Email,
    u.Id AS UserId,
    p.cbMarq,
    p.NomComplet
FROM AspNetUsers u
JOIN ProfilsUtilisateurs p ON p.UtilisateurId = u.Id
WHERE u.Email IN ('AhmedMansour@livreur.tn', 'YassineTrabelsi@vendeur.tn');
"@)

    $ahmed = $users | Where-Object { $_.Email -eq "AhmedMansour@livreur.tn" } | Select-Object -First 1
    $vendeur = $users | Where-Object { $_.Email -eq "YassineTrabelsi@vendeur.tn" } | Select-Object -First 1

    if ($null -eq $ahmed) { throw "Livreur Ahmed introuvable." }
    if ($null -eq $vendeur) { throw "Vendeur Yassine introuvable." }

    $articleRows = Convert-TableRows -Table (Invoke-DbQuery -Connection $connection -Sql @"
SELECT AR_Ref, AR_Design, AR_PrixVen
FROM F_ARTICLE
WHERE AR_Ref IN ('PFE000001','PFE000003','PFE000009','PFE000013','PFE000014','PFE000016','PFE000019','PFE000039','PFE000050','PFE000061','PFE000072','PFE000083','PFE000188');
"@)

    $articlesByRef = @{}
    foreach ($article in $articleRows) {
        $articlesByRef[$article.AR_Ref] = $article
    }

    $tx = $connection.BeginTransaction()

    try {
        Invoke-DbNonQuery -Connection $connection -Transaction $tx -Sql @"
DELETE FROM F_LIVRAISON_HISTORIQUE WHERE DoPiece IN (@P1, @P2, @P3, @P4, @P5);
DELETE FROM F_LIVRAISON WHERE DO_Piece IN (@P1, @P2, @P3, @P4, @P5);
DELETE FROM F_DOCLIGNE WHERE DO_Piece IN (@P1, @P2, @P3, @P4, @P5);
DELETE FROM F_DOCENTETE WHERE DO_Piece IN (@P1, @P2, @P3, @P4, @P5);
"@ -Parameters @{
            P1 = $pieces[0]
            P2 = $pieces[1]
            P3 = $pieces[2]
            P4 = $pieces[3]
            P5 = $pieces[4]
        } | Out-Null

        $createdAt = Get-Date
        $insertedLines = 0

        foreach ($order in $orders) {
            $client = $clientsByCode[$order.ClientCode]
            if ($null -eq $client) {
                throw "Client introuvable pour $($order.ClientCode)."
            }

            $linePayload = @()
            $totalBeforeDiscount = [decimal]0

            foreach ($line in $order.Lines) {
                $article = $articlesByRef[$line.Ref]
                if ($null -eq $article) {
                    throw "Article introuvable pour $($line.Ref)."
                }

                $price = [decimal]$article.AR_PrixVen
                $qty = [decimal]$line.Qty
                $amountHt = [math]::Round($price * $qty, 3)

                $linePayload += [pscustomobject]@{
                    Ref = [string]$article.AR_Ref
                    Design = [string]$article.AR_Design
                    Qty = $qty
                    UnitPrice = $price
                    AmountHt = $amountHt
                    AmountTtc = $amountHt
                }

                $totalBeforeDiscount += $amountHt
            }

            $discountRate = if ([int]$client.TypeClient -eq 1) { [decimal]$client.DiscountPercent } else { [decimal]0 }
            $discountAmount = [math]::Round($totalBeforeDiscount * $discountRate / [decimal]100, 3)
            $totalHtNet = [math]::Round($totalBeforeDiscount - $discountAmount, 3)
            $totalTtc = $totalHtNet
            $stamp = [decimal]1
            $netToPay = [math]::Round($totalTtc + [decimal]$order.DeliveryFee + $stamp, 3)
            $deliveryComment = "BL de test Sfax affecte a Ahmed Mansour."

            Invoke-DbNonQuery -Connection $connection -Transaction $tx -Sql @"
INSERT INTO F_DOCENTETE
(DO_Domaine, DO_Type, DO_Date, DO_Ref, DO_Tiers, DE_No, CT_NumPayeur, DO_TotalHT, DO_TotalHTNet, DO_TotalTTC, DO_NetAPayer,
 DO_Valide, DO_Piece, cbCreation, cbModification, DO_AdresseLivraison, DO_CodePostalLivraison, DO_FraisLivraison,
 DO_LatitudeLivraison, DO_LongitudeLivraison, DO_ModeLivraison, DO_ModePaiement, DO_TimbreFiscal, DO_VilleLivraison,
 DO_ClientMode, DO_ClientUserId, DO_TelephoneLivraison, DO_RepereLivraison, DO_InstructionsLivraison, DO_VendeurUserId,
 TotalBeforeDiscount, B2BDiscountRate, B2BDiscountAmount, DiscountSource, DeliveryMode, GeoValidationStatus, GeoLat, GeoLng,
 AssignedLivreurId, TypeCommande, IsActiveDelivery)
VALUES
(0, 1, @DoDate, @DoRef, @DoTiers, 2, @CtNumPayeur, @TotalHt, @TotalHtNet, @TotalTtc, @NetToPay,
 1, @DoPiece, @CreatedAt, @CreatedAt, @Adresse, @CodePostal, @DeliveryFee,
 @LatitudeText, @LongitudeText, 'HOME', @PaymentMode, @Stamp, 'Sfax',
 'EXISTING', @ClientUserId, @Telephone, 'Ajout local pour tests livreur Sfax', 'Livraison de test visible pour Ahmed Mansour.', @VendeurUserId,
 @TotalBeforeDiscount, @DiscountRate, @DiscountAmount, @DiscountSource, 'HOME_DELIVERY', 'VALID', @GeoLat, @GeoLng,
 @AssignedLivreurId, 'NORMALE', 0);
"@ -Parameters @{
                DoDate = $createdAt
                DoRef = $order.Ref
                DoTiers = $client.CodeClientSage
                CtNumPayeur = $client.CodeClientSage
                TotalHt = $totalBeforeDiscount
                TotalHtNet = $totalHtNet
                TotalTtc = $totalTtc
                NetToPay = $netToPay
                DoPiece = $order.Piece
                Adresse = $client.Adresse
                CodePostal = $client.CodePostal
                DeliveryFee = [decimal]$order.DeliveryFee
                LatitudeText = if ($null -ne $client.Latitude) { [string]::Format([System.Globalization.CultureInfo]::InvariantCulture, "{0:0.######}", $client.Latitude) } else { $null }
                LongitudeText = if ($null -ne $client.Longitude) { [string]::Format([System.Globalization.CultureInfo]::InvariantCulture, "{0:0.######}", $client.Longitude) } else { $null }
                PaymentMode = $order.PaymentMode
                Stamp = $stamp
                ClientUserId = [guid]$client.UtilisateurId
                Telephone = $client.Telephone
                VendeurUserId = [guid]$vendeur.UserId
                TotalBeforeDiscount = $totalBeforeDiscount
                DiscountRate = $discountRate
                DiscountAmount = $discountAmount
                DiscountSource = if ($discountRate -gt 0) { "B2B_PROFILE" } else { $null }
                GeoLat = $client.Latitude
                GeoLng = $client.Longitude
                AssignedLivreurId = [guid]$ahmed.UserId
                CreatedAt = $createdAt
            } | Out-Null

            foreach ($line in $linePayload) {
                Invoke-DbNonQuery -Connection $connection -Transaction $tx -Sql @"
INSERT INTO F_DOCLIGNE
(DO_Domaine, DO_Type, DO_Piece, DO_Date, CT_Num, AR_Ref, DL_Design, DL_Qte, DL_PrixUnitaire, DL_MontantHT, DL_MontantTTC, cbCreation, cbModification, LigneType)
VALUES
(0, 1, @DoPiece, @DoDate, @CtNum, @ArRef, @Design, @Qty, @UnitPrice, @AmountHt, @AmountTtc, @CreatedAt, @CreatedAt, 'STANDARD');
"@ -Parameters @{
                    DoPiece = $order.Piece
                    DoDate = $createdAt
                    CtNum = $client.CodeClientSage
                    ArRef = $line.Ref
                    Design = $line.Design
                    Qty = $line.Qty
                    UnitPrice = $line.UnitPrice
                    AmountHt = $line.AmountHt
                    AmountTtc = $line.AmountTtc
                    CreatedAt = $createdAt
                } | Out-Null

                $insertedLines++
            }

            Invoke-DbNonQuery -Connection $connection -Transaction $tx -Sql @"
INSERT INTO F_LIVRAISON
(DO_Piece, LI_Adresse, LI_Ville, LI_CodePostal, LI_Statut, LivreurId, LI_DateCreation, LI_Latitude, LI_Longitude, LI_PieceSage, LI_Commentaire, Encaisse, RemisAuDepot, DepotPassageNumber)
VALUES
(@DoPiece, @Adresse, 'Sfax', @CodePostal, 4, @LivreurProfileId, @CreatedAt, @LatitudeText, @LongitudeText, @DoPiece, @Commentaire, 0, 0, 0);
"@ -Parameters @{
                DoPiece = $order.Piece
                Adresse = $client.Adresse
                CodePostal = $client.CodePostal
                LivreurProfileId = [int]$ahmed.cbMarq
                CreatedAt = $createdAt
                LatitudeText = if ($null -ne $client.Latitude) { [string]::Format([System.Globalization.CultureInfo]::InvariantCulture, "{0:0.######}", $client.Latitude) } else { $null }
                LongitudeText = if ($null -ne $client.Longitude) { [string]::Format([System.Globalization.CultureInfo]::InvariantCulture, "{0:0.######}", $client.Longitude) } else { $null }
                Commentaire = $deliveryComment
            } | Out-Null

            Invoke-DbNonQuery -Connection $connection -Transaction $tx -Sql @"
INSERT INTO F_LIVRAISON_HISTORIQUE
(DoPiece, LivreurUserId, LivreurProfileId, Type, Note, Latitude, Longitude, DepotPassageNumber, CreatedAt)
VALUES
(@DoPiece, @LivreurUserId, @LivreurProfileId, 'ASSIGN', 'Ajout local de BL Sfax pour tests Ahmed.', @Latitude, @Longitude, 0, @CreatedAt);
"@ -Parameters @{
                DoPiece = $order.Piece
                LivreurUserId = [guid]$ahmed.UserId
                LivreurProfileId = [int]$ahmed.cbMarq
                Latitude = $client.Latitude
                Longitude = $client.Longitude
                CreatedAt = $createdAt
            } | Out-Null
        }

        $tx.Commit()

        [pscustomobject]@{
            Pieces = $pieces
            AssignedLivreur = "AhmedMansour@livreur.tn"
            DepotNo = 2
            City = "Sfax"
            OrdersInserted = $orders.Count
            LinesInserted = $insertedLines
        } | ConvertTo-Json -Depth 4
    }
    catch {
        $tx.Rollback()
        throw
    }
}
finally {
    $connection.Dispose()
}
