param(
    [string]$ConnectionString = "Server=DESKTOP655INKE\MSI22;Database=webApi_old;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true",
    [int]$NewOrders = 12,
    [int]$MaxImagesPerArticle = 3,
    [int]$ImagePauseMs = 120
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Data
Add-Type -AssemblyName System.Web

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

function Invoke-DbScalar {
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
    return $command.ExecuteScalar()
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

function Normalize-ArticleQuery {
    param([string]$Name)

    if ($null -eq $Name) {
        $value = ""
    }
    else {
        $value = [string]$Name
    }
    $value = $value.Trim()
    $suffixes = @(
        " Noir", " Blanc", " Graphite", " Silver", " Bleu", " Rouge", " Vert", " Or",
        " Pack bureau", " Pack pro", " Pack gaming", " Garantie 2 ans", " Edition showroom",
        " Bundle accessoires"
    )

    $changed = $true
    while ($changed) {
        $changed = $false
        foreach ($suffix in $suffixes) {
            if ($value.EndsWith($suffix, [System.StringComparison]::OrdinalIgnoreCase)) {
                $value = $value.Substring(0, $value.Length - $suffix.Length).TrimEnd()
                $changed = $true
                break
            }
        }
    }

    return $value
}

function Get-BingImageUrls {
    param(
        [string]$Query,
        [int]$Limit = 3
    )

    if ([string]::IsNullOrWhiteSpace($Query)) {
        return @()
    }

    $escaped = [uri]::EscapeDataString($Query)
    $html = Invoke-WebRequest -UseBasicParsing -Uri "https://www.bing.com/images/search?q=$escaped&form=HDRSC3" -TimeoutSec 20
    $matches = [regex]::Matches($html.Content, 'murl&quot;:&quot;(.*?)&quot;')
    $blockedTerms = @("logo", "banner", "poster", "template", "facebook", "instagram", "tiktok", "linkedin", "youtube")
    $urls = New-Object System.Collections.Generic.List[string]

    foreach ($match in $matches) {
        $candidate = [System.Web.HttpUtility]::HtmlDecode($match.Groups[1].Value)
        if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
        if (-not $candidate.StartsWith("http")) { continue }

        $lower = $candidate.ToLowerInvariant()
        if ($blockedTerms | Where-Object { $lower.Contains($_) }) { continue }
        if ($lower.Contains("bing.com")) { continue }
        if (-not ($lower.EndsWith(".jpg") -or $lower.EndsWith(".jpeg") -or $lower.EndsWith(".png") -or $lower.EndsWith(".webp") -or $lower.Contains(".jpg?") -or $lower.Contains(".png?") -or $lower.Contains(".jpeg?") -or $lower.Contains(".webp?"))) { continue }

        if (-not $urls.Contains($candidate)) {
            $urls.Add($candidate)
        }

        if ($urls.Count -ge $Limit) { break }
    }

    return @($urls)
}

$connection = New-DbConnection

try {
    $clients = Convert-TableRows -Table (Invoke-DbQuery -Connection $connection -Sql @"
SELECT p.UtilisateurId, p.cbMarq, p.CodeClientSage, p.NomComplet, p.NomSociete, p.TypeClient, p.DiscountPercent, p.Telephone,
       p.Adresse, p.CodePostal, p.Latitude, p.Longitude, p.DepotRattacheNo
FROM ProfilsUtilisateurs p
WHERE p.UtilisateurId IS NOT NULL
  AND p.CodeClientSage IS NOT NULL
  AND p.TypeClient IS NOT NULL
ORDER BY p.cbMarq
"@)

    $vendeurs = Convert-TableRows -Table (Invoke-DbQuery -Connection $connection -Sql @"
SELECT p.UtilisateurId
FROM ProfilsUtilisateurs p
JOIN AspNetUserRoles ur ON ur.UserId = p.UtilisateurId
JOIN AspNetRoles r ON r.Id = ur.RoleId
WHERE r.Name = 'VENDEUR'
ORDER BY p.cbMarq
"@)

    $livreurs = Convert-TableRows -Table (Invoke-DbQuery -Connection $connection -Sql @"
SELECT p.UtilisateurId, p.cbMarq, p.DepotRattacheNo
FROM ProfilsUtilisateurs p
JOIN AspNetUserRoles ur ON ur.UserId = p.UtilisateurId
JOIN AspNetRoles r ON r.Id = ur.RoleId
WHERE r.Name = 'LIVREUR'
  AND ISNULL(p.IsTransit, 0) = 0
ORDER BY p.cbMarq
"@)

    $depots = Convert-TableRows -Table (Invoke-DbQuery -Connection $connection -Sql "SELECT DE_No, DE_Code, DE_Intitule, DE_Ville FROM F_DEPOT ORDER BY DE_No;")
    $articles = Convert-TableRows -Table (Invoke-DbQuery -Connection $connection -Sql "SELECT AR_Ref, AR_Design, AR_PrixVen FROM F_ARTICLE WHERE AR_Ref LIKE 'PFE%' ORDER BY AR_Ref;")

    if ($clients.Count -eq 0 -or $vendeurs.Count -eq 0 -or $livreurs.Count -eq 0 -or $depots.Count -eq 0 -or $articles.Count -eq 0) {
        throw "Impossible de préparer l'enrichissement : jeux de données métier insuffisants."
    }

    $todayKey = Get-Date -Format "MMdd"
    $existingPrefixCount = [int](Invoke-DbScalar -Connection $connection -Sql "SELECT COUNT(*) FROM F_DOCENTETE WHERE DO_Piece LIKE 'BCE%';")
    $insertedOrders = 0
    $insertedLines = 0
    $insertedDeliveries = 0
    $insertedPayments = 0
    $insertedHistory = 0

    $dataTx = $connection.BeginTransaction()
    try {
        for ($i = 0; $i -lt $NewOrders; $i++) {
            $seq = $existingPrefixCount + $i + 1
            $client = $clients[$i % $clients.Count]
            $depot = $depots[$i % $depots.Count]
            $vendeur = $vendeurs[$i % $vendeurs.Count]
            $livreur = $livreurs[$i % $livreurs.Count]
            $piece = ("BCE{0}{1:000}" -f $todayKey, $seq)
            $ref = ("LOC-ENR-{0}-{1:000}" -f $todayKey, $seq)
            $isB2B = [int]$client.TypeClient -eq 1
            $discountRate = if ($isB2B -and $client.DiscountPercent) { [decimal]$client.DiscountPercent } else { [decimal]0 }
            $lineCount = 3 + ($i % 3)
            $selected = @()
            for ($l = 0; $l -lt $lineCount; $l++) {
                $selected += $articles[(($i * 7) + ($l * 11)) % $articles.Count]
            }

            $totalHt = [decimal]0
            $linePayload = @()
            foreach ($article in $selected) {
                $qty = [decimal](1 + (($i + $linePayload.Count) % 4))
                $price = [decimal]$article.AR_PrixVen
                $amountHt = [math]::Round($price * $qty, 3)
                $amountTtc = [math]::Round($amountHt * [decimal]1.19, 3)
                $totalHt += $amountHt
                $linePayload += [pscustomobject]@{
                    Ref = [string]$article.AR_Ref
                    Design = [string]$article.AR_Design
                    Qty = $qty
                    Price = $price
                    AmountHt = $amountHt
                    AmountTtc = $amountTtc
                }
            }

            $discountAmount = [math]::Round($totalHt * $discountRate / [decimal]100, 3)
            $totalHtNet = [math]::Round($totalHt - $discountAmount, 3)
            $totalTtc = [math]::Round($totalHtNet * [decimal]1.19, 3)
            $deliveryFee = if ($i % 4 -eq 0) { [decimal]0 } else { [decimal](8 + ($i % 3)) }
            $stamp = [decimal]1
            $net = [math]::Round($totalTtc + $deliveryFee + $stamp, 3)
            $orderDate = (Get-Date).Date.AddDays(-1 * (($i % 6) + 1))
            $modeLivraison = if ($i % 4 -eq 0) { "PICKUP" } else { "HOME" }
            $deliveryMode = if ($i % 4 -eq 0) { "PICKUP_DEPOT" } else { "HOME_DELIVERY" }
            $modePaiement = if ($isB2B -and $i % 2 -eq 0) { "B2B_CREDIT" } elseif ($i % 3 -eq 0) { "CARD" } else { "CASH" }

            Invoke-DbNonQuery -Connection $connection -Transaction $dataTx -Sql @"
INSERT INTO F_DOCENTETE
(DO_Domaine, DO_Type, DO_Date, DO_Ref, DO_Tiers, DE_No, CT_NumPayeur, DO_TotalHT, DO_TotalHTNet, DO_TotalTTC, DO_NetAPayer,
 DO_Valide, DO_Piece, DO_ModeLivraison, DO_ModePaiement, DO_FraisLivraison, DO_TimbreFiscal, TotalBeforeDiscount,
 B2BDiscountRate, B2BDiscountAmount, DiscountSource, DO_AdresseLivraison, DO_VilleLivraison, DO_CodePostalLivraison,
 DO_LatitudeLivraison, DO_LongitudeLivraison, DO_TelephoneLivraison, DO_RepereLivraison, DO_InstructionsLivraison,
 DO_VendeurUserId, DO_ClientUserId, DO_ClientMode, DeliveryMode, PickupDepotNo, GeoValidationStatus, GeoLat, GeoLng,
 AssignedLivreurId, TypeCommande, IsActiveDelivery, cbCreation, cbModification)
VALUES
(0, 0, @DoDate, @DoRef, @DoTiers, @DepotNo, @CtNumPayeur, @TotalHt, @TotalHtNet, @TotalTtc, @NetAPayer,
 1, @DoPiece, @ModeLivraison, @ModePaiement, @FraisLivraison, @TimbreFiscal, @TotalBeforeDiscount,
 @DiscountRate, @DiscountAmount, @DiscountSource, @Adresse, @Ville, @CodePostal,
 @LatitudeText, @LongitudeText, @Telephone, @Repere, @Instructions,
 @VendeurUserId, @ClientUserId, 'EXISTING', @DeliveryMode, @PickupDepotNo, 'VALID', @GeoLat, @GeoLng,
 @LivreurUserId, 'NORMALE', 0, @CreatedAt, @UpdatedAt);
"@ -Parameters @{
                DoDate = $orderDate
                DoRef = $ref
                DoTiers = $client.CodeClientSage
                DepotNo = $depot.DE_No
                CtNumPayeur = $client.CodeClientSage
                TotalHt = $totalHt
                TotalHtNet = $totalHtNet
                TotalTtc = $totalTtc
                NetAPayer = $net
                DoPiece = $piece
                ModeLivraison = $modeLivraison
                ModePaiement = $modePaiement
                FraisLivraison = $deliveryFee
                TimbreFiscal = $stamp
                TotalBeforeDiscount = $totalHt
                DiscountRate = $discountRate
                DiscountAmount = $discountAmount
                DiscountSource = if ($discountRate -gt 0) { "B2B_PROFILE" } else { $null }
                Adresse = $client.Adresse
                Ville = $depot.DE_Ville
                CodePostal = $client.CodePostal
                LatitudeText = if ($null -ne $client.Latitude) { [string]::Format([System.Globalization.CultureInfo]::InvariantCulture, "{0:0.######}", $client.Latitude) } else { $null }
                LongitudeText = if ($null -ne $client.Longitude) { [string]::Format([System.Globalization.CultureInfo]::InvariantCulture, "{0:0.######}", $client.Longitude) } else { $null }
                Telephone = $client.Telephone
                Repere = "Enrichissement local de test"
                Instructions = if ($modeLivraison -eq "HOME") { "Appeler avant livraison." } else { "Retrait au dépôt." }
                VendeurUserId = [guid]$vendeur.UtilisateurId
                ClientUserId = [guid]$client.UtilisateurId
                DeliveryMode = $deliveryMode
                PickupDepotNo = if ($deliveryMode -eq "PICKUP_DEPOT") { $depot.DE_No } else { $null }
                GeoLat = $client.Latitude
                GeoLng = $client.Longitude
                LivreurUserId = [guid]$livreur.UtilisateurId
                CreatedAt = $orderDate
                UpdatedAt = $orderDate
            } | Out-Null
            $insertedOrders++

            foreach ($line in $linePayload) {
                Invoke-DbNonQuery -Connection $connection -Transaction $dataTx -Sql @"
INSERT INTO F_DOCLIGNE
(DO_Domaine, DO_Type, DO_Piece, DO_Date, CT_Num, AR_Ref, DL_Design, DL_Qte, DL_PrixUnitaire, DL_MontantHT, DL_MontantTTC, cbCreation, cbModification, LigneType)
VALUES
(0, 0, @DoPiece, @DoDate, @CtNum, @ArRef, @Design, @Qty, @UnitPrice, @AmountHt, @AmountTtc, @CreatedAt, @UpdatedAt, 'STANDARD');
"@ -Parameters @{
                    DoPiece = $piece
                    DoDate = $orderDate
                    CtNum = $client.CodeClientSage
                    ArRef = $line.Ref
                    Design = $line.Design
                    Qty = $line.Qty
                    UnitPrice = $line.Price
                    AmountHt = $line.AmountHt
                    AmountTtc = $line.AmountTtc
                    CreatedAt = $orderDate
                    UpdatedAt = $orderDate
                } | Out-Null
                $insertedLines++
            }

            if ($deliveryMode -eq "HOME_DELIVERY") {
                $status = switch ($i % 4) {
                    0 { 0 }
                    1 { 1 }
                    2 { 2 }
                    default { 5 }
                }
                $delivered = $status -eq 2
                $encaisse = $delivered -and $modePaiement -eq "CASH"

                Invoke-DbNonQuery -Connection $connection -Transaction $dataTx -Sql @"
INSERT INTO F_LIVRAISON
(DO_Piece, LI_Adresse, LI_Ville, LI_CodePostal, LI_Statut, LivreurId, LI_DateCreation, LI_DateLivree, LI_DateReplanification,
 LI_Commentaire, LI_Latitude, LI_Longitude, LI_PieceSage, Encaisse, EncaisseAt, MontantEncaisse, RemisAuDepot, RemisAuDepotAt, DepotPassageNumber)
VALUES
(@DoPiece, @Adresse, @Ville, @CodePostal, @Statut, @LivreurProfileId, @DateCreation, @DateLivree, @DateReplanification,
 @Commentaire, @LatitudeText, @LongitudeText, @PieceSage, @Encaisse, @EncaisseAt, @MontantEncaisse, @RemisAuDepot, @RemisAuDepotAt, @DepotPassage);
"@ -Parameters @{
                    DoPiece = $piece
                    Adresse = $client.Adresse
                    Ville = $depot.DE_Ville
                    CodePostal = $client.CodePostal
                    Statut = $status
                    LivreurProfileId = $livreur.cbMarq
                    DateCreation = $orderDate
                    DateLivree = if ($delivered) { $orderDate.AddDays(1) } else { $null }
                    DateReplanification = if ($status -eq 5) { $orderDate.AddDays(2) } else { $null }
                    Commentaire = if ($delivered) { "Livraison de test locale livrée." } else { "Livraison de test locale en suivi." }
                    LatitudeText = if ($null -ne $client.Latitude) { [string]::Format([System.Globalization.CultureInfo]::InvariantCulture, "{0:0.######}", $client.Latitude) } else { $null }
                    LongitudeText = if ($null -ne $client.Longitude) { [string]::Format([System.Globalization.CultureInfo]::InvariantCulture, "{0:0.######}", $client.Longitude) } else { $null }
                    PieceSage = ("BLE{0}{1:000}" -f $todayKey, $seq)
                    Encaisse = $encaisse
                    EncaisseAt = if ($encaisse) { $orderDate.AddDays(1) } else { $null }
                    MontantEncaisse = if ($encaisse) { $net } else { $null }
                    RemisAuDepot = $encaisse
                    RemisAuDepotAt = if ($encaisse) { $orderDate.AddDays(2) } else { $null }
                    DepotPassage = ($i % 3)
                } | Out-Null
                $insertedDeliveries++

                Invoke-DbNonQuery -Connection $connection -Transaction $dataTx -Sql @"
INSERT INTO F_LIVRAISON_HISTORIQUE
(DoPiece, LivreurUserId, LivreurProfileId, Type, Note, Latitude, Longitude, DepotPassageNumber, Montant, CreatedAt)
VALUES
(@DoPiece, @LivreurUserId, @LivreurProfileId, @Type, @Note, @Latitude, @Longitude, @DepotPassageNumber, @Montant, @CreatedAt);
"@ -Parameters @{
                    DoPiece = $piece
                    LivreurUserId = [guid]$livreur.UtilisateurId
                    LivreurProfileId = $livreur.cbMarq
                    Type = if ($delivered) { "LIVRE" } elseif ($status -eq 1) { "START_DELIVERY" } else { "ASSIGN" }
                    Note = "Historique enrichissement local."
                    Latitude = $client.Latitude
                    Longitude = $client.Longitude
                    DepotPassageNumber = ($i % 3)
                    Montant = if ($encaisse) { $net } else { $null }
                    CreatedAt = $orderDate
                } | Out-Null
                $insertedHistory++
            }

            if ($i % 5 -ne 4) {
                $paymentStatus = if ($modePaiement -eq "CARD") { 2 } elseif ($modePaiement -eq "B2B_CREDIT") { 1 } else { 2 }
                $paymentType = if ($modePaiement -eq "CARD") { "ONLINE" } elseif ($modePaiement -eq "B2B_CREDIT") { "B2B_CREDIT" } else { "CASH" }
                $provider = if ($modePaiement -eq "CARD") { "VIRTUAL" } else { "COD" }
                Invoke-DbNonQuery -Connection $connection -Transaction $dataTx -Sql @"
INSERT INTO B_PAIEMENT
(DO_Piece, PA_Mode, PA_Type, PA_Statut, PA_Montant, PA_Date, PA_Reference, PA_Fournisseur, PA_ProviderPaymentId, PA_StatutExterne, PA_IsSandbox, cbCreation, cbModification)
VALUES
(@DoPiece, @Mode, @Type, @Statut, @Montant, @DatePaiement, @Reference, @Fournisseur, @ProviderPaymentId, @StatutExterne, 1, @CreatedAt, @UpdatedAt);
"@ -Parameters @{
                    DoPiece = $piece
                    Mode = if ($modePaiement -eq "CARD") { 1 } else { 0 }
                    Type = $paymentType
                    Statut = $paymentStatus
                    Montant = $net
                    DatePaiement = $orderDate.AddDays(1)
                    Reference = ("PAY-ENR-{0}-{1:000}" -f $todayKey, $seq)
                    Fournisseur = $provider
                    ProviderPaymentId = if ($modePaiement -eq "CARD") { "VIRT-ENR-$piece" } else { $null }
                    StatutExterne = if ($paymentStatus -eq 2) { "SUCCESS" } else { "PENDING" }
                    CreatedAt = $orderDate
                    UpdatedAt = $orderDate
                } | Out-Null
                $insertedPayments++
            }
        }

        $dataTx.Commit()
    }
    catch {
        $dataTx.Rollback()
        throw
    }

    $allArticles = Convert-TableRows -Table (Invoke-DbQuery -Connection $connection -Sql "SELECT AR_Ref, AR_Design FROM F_ARTICLE WHERE AR_Ref LIKE 'PFE%' ORDER BY AR_Ref;")
    $imagesUpdated = 0
    $imagesSkipped = 0
    $imagesInserted = 0
    $imageFailures = New-Object System.Collections.Generic.List[string]

    foreach ($article in $allArticles) {
        $query = [string]$article.AR_Design
        $baseQuery = Normalize-ArticleQuery $query
        try {
            $urls = @(Get-BingImageUrls -Query $query -Limit $MaxImagesPerArticle)
            if ($urls.Count -lt 2 -and $baseQuery -ne $query) {
                $urls = @($urls + (Get-BingImageUrls -Query $baseQuery -Limit $MaxImagesPerArticle))
            }
            $urls = @($urls | Select-Object -Unique | Select-Object -First $MaxImagesPerArticle)

            if ($urls.Count -lt 2) {
                $imagesSkipped++
                $imageFailures.Add("$($article.AR_Ref) | $query")
                continue
            }

            $imageTx = $connection.BeginTransaction()
            try {
                Invoke-DbNonQuery -Connection $connection -Transaction $imageTx -Sql "DELETE FROM F_ARTICLE_IMAGE WHERE AR_Ref = @ArRef;" -Parameters @{ ArRef = $article.AR_Ref } | Out-Null
                for ($i = 0; $i -lt $urls.Count; $i++) {
                    Invoke-DbNonQuery -Connection $connection -Transaction $imageTx -Sql @"
INSERT INTO F_ARTICLE_IMAGE (AR_Ref, Url, CloudinaryPublicId, IsMain, SortOrder, CreatedAt)
VALUES (@ArRef, @Url, NULL, @IsMain, @SortOrder, @CreatedAt);
"@ -Parameters @{
                        ArRef = $article.AR_Ref
                        Url = $urls[$i]
                        IsMain = ($i -eq 0)
                        SortOrder = $i + 1
                        CreatedAt = Get-Date
                    } | Out-Null
                    $imagesInserted++
                }
                $imageTx.Commit()
                $imagesUpdated++
            }
            catch {
                $imageTx.Rollback()
                throw
            }
        }
        catch {
            $imagesSkipped++
            $imageFailures.Add("$($article.AR_Ref) | $query | $($_.Exception.Message)")
        }

        Start-Sleep -Milliseconds $ImagePauseMs
    }

    $result = [pscustomobject]@{
        connectionString = $ConnectionString
        newOrders = $insertedOrders
        newLines = $insertedLines
        newDeliveries = $insertedDeliveries
        newPayments = $insertedPayments
        newDeliveryHistory = $insertedHistory
        articleImagesUpdated = $imagesUpdated
        articleImagesSkipped = $imagesSkipped
        articleImagesInserted = $imagesInserted
        failedImageArticles = @($imageFailures | Select-Object -First 20)
        counts = [pscustomobject]@{
            articles = [int](Invoke-DbScalar -Connection $connection -Sql "SELECT COUNT(*) FROM F_ARTICLE;")
            articleImages = [int](Invoke-DbScalar -Connection $connection -Sql "SELECT COUNT(*) FROM F_ARTICLE_IMAGE;")
            commandes = [int](Invoke-DbScalar -Connection $connection -Sql "SELECT COUNT(*) FROM F_DOCENTETE;")
            lignes = [int](Invoke-DbScalar -Connection $connection -Sql "SELECT COUNT(*) FROM F_DOCLIGNE;")
            livraisons = [int](Invoke-DbScalar -Connection $connection -Sql "SELECT COUNT(*) FROM F_LIVRAISON;")
            paiements = [int](Invoke-DbScalar -Connection $connection -Sql "SELECT COUNT(*) FROM B_PAIEMENT;")
        }
        duplicateDesignations = [int](Invoke-DbScalar -Connection $connection -Sql @"
SELECT COUNT(*) FROM (
    SELECT AR_Design
    FROM F_ARTICLE
    GROUP BY AR_Design
    HAVING COUNT(*) > 1
) d;
"@)
    }

    $result | ConvertTo-Json -Depth 6
}
finally {
    if ($connection.State -eq [System.Data.ConnectionState]::Open) {
        $connection.Close()
    }
    $connection.Dispose()
}
