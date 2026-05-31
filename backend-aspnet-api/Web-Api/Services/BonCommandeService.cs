using Microsoft.EntityFrameworkCore;
using Web_Api.Auth.Constants;
using Web_Api.Auth.Entities;
using Web_Api.data;
using Web_Api.DTO.Orders;
using Web_Api.DTO.Refonte;
using Web_Api.DTO.Vendeur;
using Web_Api.Model;
using Web_Api.Services.Refonte;

namespace Web_Api.Services
{
    public class BonCommandeService
    {
        private readonly AppDbContext _db;
        private readonly SageService? _sage;
        private readonly ITransitOrchestrationService? _transit;
        private readonly OrderCalculatorService _calculator;

        private const decimal FRAIS_LIVRAISON_HOME = 8m;
        private const decimal TIMBRE_FISCAL = 1m;

        public const string CustomerModeExisting = "EXISTING";
        public const string CustomerModePassager = "PASSAGER";

        public const string DeliveryTypeHome = "HOME";
        public const string DeliveryTypePickup = "PICKUP";
        public const string VendorFulfillmentSurPlace = "SUR_PLACE";

        public const string PaymentSurPlaceEspeces = "SP01_ESPECES";
        public const string PaymentSurPlaceCheque = "SP02_CHEQUE";
        public const string PaymentSurPlaceTpe = "SP03_TPE";
        public const string PaymentSurPlacePassCadeau = "SP04_PASSCADEAU";

        public const string PaymentLivraisonEspeces = "LV01_ESPECES";
        public const string PaymentLivraisonTpe = "LV02_TPE";

        public const string PaymentOnlineCarte = "ON01_CARTE";
        public const string PaymentOnlineVirement = "ON02_VIREMENT";
        public const string PaymentOnlineVersementEspece = "ON03_VERSEMENTESP";

        private static readonly IReadOnlyList<VendeurPaymentOptionDefinition> VendeurSurPlacePaymentOptions =
            new List<VendeurPaymentOptionDefinition>
            {
                new() { Code = PaymentSurPlaceEspeces, Label = "Paiement en magasin - Espèce" },
                new() { Code = PaymentSurPlaceCheque, Label = "Paiement en magasin - Chèque" },
                new() { Code = PaymentSurPlaceTpe, Label = "Paiement en magasin - TPE" },
                new() { Code = PaymentSurPlacePassCadeau, Label = "Paiement en magasin - Pass cadeau" }
            };

        public BonCommandeService(
            AppDbContext db,
            OrderCalculatorService calculator,
            SageService? sage = null,
            ITransitOrchestrationService? transit = null)
        {
            _db = db;
            _calculator = calculator;
            _sage = sage;
            _transit = transit;
        }

        public async Task<BonCommandeCreateResult> CreateForAuthenticatedClientAsync(
            Guid userId,
            string userEmail,
            CreateBonCommandeRequestDto req,
            CancellationToken ct = default)
        {
            ArgumentNullException.ThrowIfNull(req);

            var clientCode = await ResolveClientCodeAsync(userId, userEmail, ct);
            var profile = await _db.ProfilsUtilisateurs
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UtilisateurId == userId, ct);

            var payload = new CreateOrderPayload
            {
                ClientCode = clientCode,
                ClientUserId = userId,
                VendeurUserId = null,
                CustomerMode = CustomerModeExisting,
                PassengerSnapshot = profile == null ? null : OrderCustomerSnapshot.FromProfile(profile),
                DiscountProfile = profile,
                DepotNo = req.DepotNo,
                DeliveryType = req.DeliveryType,
                PaymentMethod = req.PaymentMethod,
                Address = req.Address,
                City = req.City,
                PostalCode = req.PostalCode,
                Latitude = req.Latitude,
                Longitude = req.Longitude,
                PersistAddressSnapshot = false,
                // Zone de livraison choisie au checkout (prioritaire sur profil)
                DeliveryGouvernorat = TrimOrNull(req.Gouvernorat),
                DeliveryDelegation = TrimOrNull(req.City),
                Lines = req.Lines
            };

            return await CreateInternalAsync(payload, ct);
        }

        public async Task<BonCommandeCreateResult> CreateForGuestAsync(
            CreateGuestBonCommandeRequestDto req,
            CancellationToken ct = default)
        {
            ArgumentNullException.ThrowIfNull(req);

            if (req.Customer == null)
                throw new BonCommandeValidationException("Les informations du client invité sont obligatoires.");

            var deliveryType = NormalizeDeliveryType(req.DeliveryType);
            var snapshot = OrderCustomerSnapshot.FromGuest(
                req.Customer,
                fallbackAddress: deliveryType == DeliveryTypeHome ? req.Address : null,
                fallbackPostalCode: deliveryType == DeliveryTypeHome ? req.PostalCode : null);

            ValidateGuestCustomer(snapshot);

            var payload = new CreateOrderPayload
            {
                ClientCode = await GenerateUniquePassagerClientCodeAsync(ct),
                ClientUserId = null,
                VendeurUserId = null,
                CustomerMode = CustomerModePassager,
                PassengerSnapshot = snapshot,
                DepotNo = req.DepotNo,
                DeliveryType = deliveryType,
                PaymentMethod = req.PaymentMethod,
                Address = req.Address,
                City = req.City,
                PostalCode = req.PostalCode,
                Latitude = req.Latitude,
                Longitude = req.Longitude,
                PersistAddressSnapshot = false,
                Lines = req.Lines
            };

            return await CreateInternalAsync(payload, ct);
        }

        public async Task<BonCommandeCreateResult> CreateForVendeurAsync(
            Guid vendeurUserId,
            VendeurCreateBonCommandeRequestDto req,
            CancellationToken ct = default)
        {
            ArgumentNullException.ThrowIfNull(req);

            var vendeurContext = await ResolveVendeurContextAsync(vendeurUserId, ct);
            var customerMode = NormalizeCustomerMode(req.CustomerMode);
            var canonicalPaymentMethod = NormalizeVendeurSurPlacePaymentMethod(req.PaymentMethod);

            if (customerMode == CustomerModeExisting)
            {
                if (req.ClientUserId == null || req.ClientUserId == Guid.Empty)
                    throw new BonCommandeValidationException("ClientUserId est obligatoire pour un client existant.");

                var resolved = await ResolveExistingClientAsync(req.ClientUserId.Value, ct);
                var clientCode = await ResolveClientCodeAsync(resolved.UserId, resolved.Email, ct);

                var payload = new CreateOrderPayload
                {
                    ClientCode = clientCode,
                    ClientUserId = resolved.UserId,
                    VendeurUserId = vendeurUserId,
                    CustomerMode = CustomerModeExisting,
                    PassengerSnapshot = resolved.Profile == null ? null : OrderCustomerSnapshot.FromProfile(resolved.Profile),
                    DiscountProfile = resolved.Profile,
                    DepotNo = vendeurContext.Depot.DepotNo,
                    DeliveryType = DeliveryTypePickup,
                    PaymentMethod = canonicalPaymentMethod,
                    Address = vendeurContext.Depot.Address,
                    City = vendeurContext.Depot.City,
                    PostalCode = vendeurContext.Depot.PostalCode,
                    Latitude = null,
                    Longitude = null,
                    PersistAddressSnapshot = true,
                    Lines = req.Lines
                };

                var created = await CreateInternalAsync(payload, ct);
                return await PromoteToBlAndPushSageAsync(created, ct);
            }

            if (req.Passager == null)
                throw new BonCommandeValidationException("Les informations du client passager sont obligatoires.");

            ValidatePassager(req.Passager);

            var payloadPassager = new CreateOrderPayload
            {
                ClientCode = await GenerateUniquePassagerClientCodeAsync(ct),
                ClientUserId = null,
                VendeurUserId = vendeurUserId,
                CustomerMode = CustomerModePassager,
                PassengerSnapshot = OrderCustomerSnapshot.FromPassager(req.Passager),
                DepotNo = vendeurContext.Depot.DepotNo,
                DeliveryType = DeliveryTypePickup,
                PaymentMethod = canonicalPaymentMethod,
                Address = vendeurContext.Depot.Address,
                City = vendeurContext.Depot.City,
                PostalCode = vendeurContext.Depot.PostalCode,
                Latitude = null,
                Longitude = null,
                PersistAddressSnapshot = true,
                Lines = req.Lines
            };

            var createdPassager = await CreateInternalAsync(payloadPassager, ct);
            return await PromoteToBlAndPushSageAsync(createdPassager, ct);
        }

        /// <summary>
        /// Caisse SUR_PLACE : la commande sort du checkout déjà encaissée et
        /// retirée au comptoir. On bascule donc le doc en BL (DO_Type=1) +
        /// renomme la pièce BC* → BL* + sync à Sage. Si Sage est HS, le BL
        /// reste valide en local et on log silencieusement.
        /// </summary>
        private async Task<BonCommandeCreateResult> PromoteToBlAndPushSageAsync(
            BonCommandeCreateResult created,
            CancellationToken ct)
        {
            var entete = created.Entete;
            var lignes = created.Lignes ?? new List<F_DOCLIGNE>();

            var bcPiece = entete.DO_Piece ?? string.Empty;
            if (string.IsNullOrWhiteSpace(bcPiece))
                return created;

            // Pièce BL déterministe (max 13 chars).
            var blPiece = bcPiece.StartsWith("BC", StringComparison.OrdinalIgnoreCase) && bcPiece.Length >= 3
                ? "BL" + bcPiece[2..]
                : "BL" + bcPiece;
            if (blPiece.Length > 13) blPiece = blPiece[..13];

            // Garde anti-collision : si la pièce BL existe déjà (cas tordu), on
            // garde le BC tel quel et on ne touche à rien.
            var collision = await _db.F_DOCENTETES.AsNoTracking()
                .AnyAsync(x => x.DO_Piece == blPiece, ct);
            if (collision)
                return created;

            entete.DO_Piece = blPiece;
            entete.DO_Type = 1;
            entete.DO_Valide = 1;
            entete.cbModification = DateTime.UtcNow;

            foreach (var l in lignes)
            {
                l.DO_Piece = blPiece;
                l.DO_Type = 1;
                l.cbModification = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync(ct);

            // POST Sage (best-effort).
            if (_sage != null)
            {
                var payload = new SageDocEntetePayload
                {
                    DO_Domaine = entete.DO_Domaine,
                    DO_Type = entete.DO_Type,
                    DO_Piece = blPiece,
                    DO_Date = entete.DO_Date,
                    DO_Tiers = entete.DO_Tiers,
                    DE_No = entete.DE_No,
                    DO_TotalHT = entete.DO_TotalHT,
                    DO_TotalTTC = entete.DO_TotalTTC,
                    DO_NetAPayer = entete.DO_NetAPayer,
                    DO_FraisLivraison = entete.DO_FraisLivraison,
                    DO_TimbreFiscal = entete.DO_TimbreFiscal,
                    DO_ModeLivraison = entete.DO_ModeLivraison,
                    DO_ModePaiement = entete.DO_ModePaiement,
                    DO_AdresseLivraison = entete.DO_AdresseLivraison,
                    DO_VilleLivraison = entete.DO_VilleLivraison,
                    DO_CodePostalLivraison = entete.DO_CodePostalLivraison,
                    DO_TelephoneLivraison = entete.DO_TelephoneLivraison,
                    DO_Valide = entete.DO_Valide,
                    DO_Ref = entete.DO_Ref,
                    Lines = lignes.Select(l => new SageDocLignePayload
                    {
                        AR_Ref = l.AR_Ref,
                        DL_Design = l.DL_Design,
                        DL_Qte = l.DL_Qte,
                        DL_PrixUnitaire = l.DL_PrixUnitaire,
                        DL_MontantHT = l.DL_MontantHT,
                        DL_MontantTTC = l.DL_MontantTTC,
                    }).ToList()
                };

                _ = await _sage.PostDocEnteteAsync(payload, ct);
            }

            return new BonCommandeCreateResult { Entete = entete, Lignes = lignes };
        }

        public static BonCommandeResponseDto MapToResponse(F_DOCENTETE entete, IEnumerable<F_DOCLIGNE> lignes)
        {
            var lines = lignes?.ToList() ?? new List<F_DOCLIGNE>();

            return new BonCommandeResponseDto
            {
                Piece = entete.DO_Piece ?? string.Empty,
                Date = entete.DO_Date,
                ClientCode = entete.DO_Tiers ?? string.Empty,
                DepotNo = entete.DE_No ?? 0,
                Status = entete.DocumentStatus,
                StatusCode = entete.DO_Valide,
                TimelineStage = entete.DO_Valide switch
                {
                    1 => "CONFIRMED",
                    2 => "ATTEMPTED",
                    3 => "REFUSED",
                    _ => "PENDING"
                },
                TotalHT = entete.DO_TotalHT ?? 0m,
                TotalTTC = entete.DO_TotalTTC ?? 0m,
                FraisLivraison = entete.DO_FraisLivraison ?? 0m,
                TimbreFiscal = entete.DO_TimbreFiscal ?? 0m,
                TotalBeforeDiscount = entete.TotalBeforeDiscount ?? entete.DO_TotalTTC ?? 0m,
                B2BDiscountRate = entete.B2BDiscountRate,
                B2BDiscountAmount = entete.B2BDiscountAmount ?? 0m,
                DiscountSource = entete.DiscountSource,
                NetAPayer = entete.DO_NetAPayer ?? 0m,
                DeliveryType = entete.DO_ModeLivraison,
                PaymentMethod = entete.DO_ModePaiement,
                Address = entete.DO_AdresseLivraison,
                City = entete.DO_VilleLivraison,
                PostalCode = entete.DO_CodePostalLivraison,
                Latitude = entete.DO_LatitudeLivraison,
                Longitude = entete.DO_LongitudeLivraison,
                Lines = lines.Select(l => new BonCommandeLineResponseDto
                {
                    ArticleRef = l.AR_Ref ?? string.Empty,
                    Designation = l.DL_Design,
                    Qty = l.DL_Qte ?? 0m,
                    UnitPrice = l.DL_PrixUnitaire ?? 0m,
                    AmountHT = l.DL_MontantHT ?? 0m,
                    AmountTTC = l.DL_MontantTTC ?? 0m
                }).ToList()
            };
        }

        public async Task<string> ResolveClientCodeAsync(Guid userId, string? userEmail, CancellationToken ct = default)
        {
            var profil = await _db.ProfilsUtilisateurs
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.UtilisateurId == userId, ct);

            var sage = profil?.CodeClientSage?.Trim();
            if (!string.IsNullOrWhiteSpace(sage))
                return sage.Length <= 17 ? sage : sage[..17];

            var raw = userId.ToString("N");
            return "CL" + raw[..15];
        }

        public async Task<string> GenerateUniquePieceAsync(CancellationToken ct = default)
        {
            for (var i = 0; i < 20; i++)
            {
                var now = DateTime.UtcNow;
                var basePart = now.ToString("yyMMddHHmm");
                var suffix = (now.Millisecond % 10).ToString();
                var piece = "BC" + basePart + suffix;

                var exists = await _db.F_DOCENTETES.AsNoTracking().AnyAsync(e => e.DO_Piece == piece, ct);
                if (!exists)
                    return piece;

                await Task.Delay(10, ct);
            }

            var guid = Guid.NewGuid().ToString("N");
            return ("BC" + guid)[..13];
        }

        public async Task<ResolvedVendeurContext> ResolveVendeurContextAsync(Guid vendeurUserId, CancellationToken ct = default)
        {
            var user = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == vendeurUserId, ct);

            if (user == null)
                throw new BonCommandeValidationException("Vendeur introuvable.");

            var profile = await _db.ProfilsUtilisateurs
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UtilisateurId == vendeurUserId, ct);

            if (profile == null)
                throw new BonCommandeValidationException("Profil vendeur introuvable.");

            var rawDepotCode = TrimOrNull(profile.CodeDepot);
            if (string.IsNullOrWhiteSpace(rawDepotCode))
                throw new BonCommandeValidationException("Le vendeur connecté n'est rattaché à aucun dépôt (CodeDepot manquant dans le profil).");

            var depot = await ResolveDepotFromProfileCodeAsync(rawDepotCode, ct);
            if (depot == null)
            {
                throw new BonCommandeValidationException(
                    $"Aucun dépôt ne correspond au CodeDepot du vendeur ('{rawDepotCode}'). Vérifiez le profil utilisateur et la synchronisation des dépôts.");
            }

            return new ResolvedVendeurContext
            {
                VendeurUserId = vendeurUserId,
                VendeurEmail = user.Email,
                VendeurDisplayName = ComputeVendeurDisplayName(profile, user.Email),
                Profile = profile,
                Depot = MapDepot(depot)
            };
        }

        public static IReadOnlyList<VendeurPaymentOptionDefinition> GetVendeurSurPlacePaymentOptions()
        {
            return VendeurSurPlacePaymentOptions;
        }

        public static string GetVendeurModeRemise(string? storedDeliveryType)
        {
            if (string.Equals(storedDeliveryType, DeliveryTypePickup, StringComparison.OrdinalIgnoreCase))
                return VendorFulfillmentSurPlace;

            var normalized = TrimOrNull(storedDeliveryType);
            return normalized?.ToUpperInvariant() ?? VendorFulfillmentSurPlace;
        }

        private async Task<BonCommandeCreateResult> CreateInternalAsync(CreateOrderPayload req, CancellationToken ct)
        {
            if (req.Lines == null || req.Lines.Count == 0)
                throw new BonCommandeValidationException("Le panier est vide.");

            var deliveryType = NormalizeDeliveryType(req.DeliveryType);
            var paymentMethod = NormalizePaymentMethod(req.PaymentMethod);
            var normalizedAddress = TrimOrNull(req.Address);
            var normalizedCity = TrimOrNull(req.City);
            var normalizedPostalCode = TrimOrNull(req.PostalCode);

            int? depotNoForDoc;
            int depotNoForStockCheck;

            if (deliveryType == DeliveryTypePickup)
            {
                if (req.DepotNo == null || req.DepotNo <= 0)
                    throw new BonCommandeValidationException("DepotNo est obligatoire si DeliveryType=PICKUP.");

                var depotExists = await _db.F_DEPOTS.AsNoTracking().AnyAsync(d => d.DE_No == req.DepotNo.Value, ct);
                if (!depotExists)
                    throw new BonCommandeValidationException("Dépôt introuvable.");

                depotNoForDoc = req.DepotNo.Value;
                depotNoForStockCheck = req.DepotNo.Value;
            }
            else
            {
                depotNoForDoc = null;

                var destinationFromZone = await ResolveDestinationDepotForHomeAsync(req.PassengerSnapshot, normalizedCity, ct);
                var principal = destinationFromZone ?? await _db.F_DEPOTS.AsNoTracking()
                    .OrderByDescending(d => d.DE_Principal)
                    .ThenBy(d => d.DE_No)
                    .Select(d => d.DE_No)
                    .FirstOrDefaultAsync(ct);

                if (principal <= 0)
                    throw new BonCommandeValidationException("Aucun dépôt disponible pour vérifier le stock (sync dépôts requis).");

                depotNoForStockCheck = principal;
            }

            if (deliveryType == DeliveryTypeHome)
            {
                if (string.IsNullOrWhiteSpace(normalizedAddress) ||
                    string.IsNullOrWhiteSpace(normalizedCity) ||
                    string.IsNullOrWhiteSpace(normalizedPostalCode))
                {
                    throw new BonCommandeValidationException("Address/City/PostalCode sont obligatoires si DeliveryType=HOME.");
                }
            }

            var distinctRefs = req.Lines
                .Select(l => (l.ArticleRef ?? string.Empty).Trim())
                .Where(r => !string.IsNullOrWhiteSpace(r))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (distinctRefs.Count == 0)
                throw new BonCommandeValidationException("Aucun article valide.");

            var articles = await _db.F_ARTICLES
                .AsNoTracking()
                .Where(a => distinctRefs.Contains(a.AR_Ref))
                .ToListAsync(ct);

            if (articles.Count != distinctRefs.Count)
            {
                var found = new HashSet<string>(articles.Select(a => a.AR_Ref), StringComparer.OrdinalIgnoreCase);
                var missing = distinctRefs.Where(r => !found.Contains(r)).ToList();
                throw new BonCommandeValidationException($"Articles introuvables: {string.Join(", ", missing)}");
            }

            var now = DateTime.UtcNow;
            decimal totalHT = 0m;
            decimal totalTTC = 0m;

            var lignes = new List<F_DOCLIGNE>();
            var allowTransit = req.VendeurUserId == null && _transit != null;
            var transitInputs = new List<TransitOrderLineInput>();

            foreach (var line in req.Lines)
            {
                var arRef = (line.ArticleRef ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(arRef))
                    throw new BonCommandeValidationException("ArticleRef est obligatoire.");

                if (line.Qty <= 0)
                    throw new BonCommandeValidationException($"Quantité invalide pour {arRef}.");

                var art = articles.First(a => string.Equals(a.AR_Ref, arRef, StringComparison.OrdinalIgnoreCase));

                if (art.AR_Sommeil == 1)
                    throw new BonCommandeValidationException($"Article indisponible (sommeil): {arRef}");

                if (art.AR_SuiviStock == 1)
                {
                    var stock = await _db.F_ARTSTOCKS.AsNoTracking()
                        .FirstOrDefaultAsync(s => s.AR_Ref == art.AR_Ref && s.DE_No == depotNoForStockCheck, ct);

                    var dispo = (stock?.AS_QteSto ?? 0m) - (stock?.AS_QteRes ?? 0m);
                    if (dispo < line.Qty && !allowTransit)
                        throw new BonCommandeValidationException($"Stock insuffisant pour {arRef}. Dispo={dispo}, demandé={line.Qty}");
                }

                transitInputs.Add(new TransitOrderLineInput
                {
                    ArticleRef = art.AR_Ref,
                    ArticleName = art.AR_Design,
                    Quantity = line.Qty,
                    TrackStock = art.AR_SuiviStock == 1
                });

                var prix = art.AR_PrixVen;
                var montantHT = prix * line.Qty;
                var montantTTC = montantHT;

                totalHT += montantHT;
                totalTTC += montantTTC;

                lignes.Add(new F_DOCLIGNE
                {
                    DO_Domaine = 0,
                    DO_Type = 0,
                    DO_Date = now,
                    CT_Num = req.ClientCode,
                    AR_Ref = art.AR_Ref,
                    DL_Design = art.AR_Design,
                    DL_Qte = line.Qty,
                    DL_PrixUnitaire = prix,
                    DL_MontantHT = montantHT,
                    DL_MontantTTC = montantTTC,
                    cbCreation = now,
                    cbModification = now
                });
            }

            var fraisLivraison = deliveryType == DeliveryTypeHome ? FRAIS_LIVRAISON_HOME : 0m;
            var timbre = TIMBRE_FISCAL;
            var totals = _calculator.Compute(totalTTC, req.DiscountProfile);
            var netAPayer = totals.Total + fraisLivraison + timbre;
            var piece = await GenerateUniquePieceAsync(ct);
            var shouldPersistAddressSnapshot = req.PersistAddressSnapshot || deliveryType == DeliveryTypeHome;

            var entete = new F_DOCENTETE
            {
                DO_Domaine = 0,
                DO_Type = 0,
                DO_Date = now,
                DO_Tiers = req.ClientCode,
                DE_No = depotNoForDoc,
                DO_TotalHT = totalHT,
                DO_TotalHTNet = totals.Total,
                DO_TotalTTC = totalTTC,
                DO_NetAPayer = netAPayer,
                DO_Valide = 0,
                DO_Piece = piece,
                DO_ModeLivraison = deliveryType,
                DO_ModePaiement = paymentMethod,
                DO_FraisLivraison = fraisLivraison,
                DO_TimbreFiscal = timbre,
                TotalBeforeDiscount = totals.Subtotal,
                B2BDiscountRate = totals.DiscountRate,
                B2BDiscountAmount = totals.DiscountAmount,
                DiscountSource = totals.DiscountSource,
                // Adresse textuelle : toujours sauvegardée pour la livraison HOME
                DO_AdresseLivraison = (deliveryType == DeliveryTypeHome || shouldPersistAddressSnapshot) ? LimitLength(normalizedAddress, 150) : null,
                DO_VilleLivraison = (deliveryType == DeliveryTypeHome || shouldPersistAddressSnapshot) ? LimitLength(normalizedCity, 35) : null,
                DO_CodePostalLivraison = (deliveryType == DeliveryTypeHome || shouldPersistAddressSnapshot) ? LimitLength(normalizedPostalCode, 9) : null,
                DO_LatitudeLivraison = deliveryType == DeliveryTypeHome ? req.Latitude?.ToString() : null,
                DO_LongitudeLivraison = deliveryType == DeliveryTypeHome ? req.Longitude?.ToString() : null,
                DO_VendeurUserId = req.VendeurUserId,
                DO_ClientUserId = req.ClientUserId,
                DO_ClientMode = req.CustomerMode,
                DO_PassagerTypeClient = req.PassengerSnapshot?.TypeClient,
                DO_PassagerNomComplet = req.PassengerSnapshot?.NomComplet,
                DO_PassagerTelephone = req.PassengerSnapshot?.Telephone,
                DO_PassagerCIN = req.PassengerSnapshot?.Cin,
                DO_PassagerNomSociete = req.PassengerSnapshot?.NomSociete,
                DO_PassagerMatriculeFiscal = req.PassengerSnapshot?.MatriculeFiscal,
                DO_PassagerRegistreCommerce = req.PassengerSnapshot?.RegistreCommerce,
                DO_PassagerNumeroTVA = req.PassengerSnapshot?.NumeroTVA,
                // Zone : priorité aux valeurs saisies au checkout sur le profil client
                DO_PassagerGouvernorat = req.DeliveryGouvernorat ?? req.PassengerSnapshot?.Gouvernorat,
                DO_PassagerDelegation = req.DeliveryDelegation ?? req.PassengerSnapshot?.Delegation,
                DO_PassagerAdresse = req.PassengerSnapshot?.Adresse,
                DO_PassagerAdresseComplementaire = req.PassengerSnapshot?.AdresseComplementaire,
                DO_PassagerCodePostal = req.PassengerSnapshot?.CodePostal,
                cbCreation = now,
                cbModification = now
            };

            foreach (var line in lignes)
            {
                line.DO_Piece = piece;
                line.DO_Date = now;
            }

            var transitPlan = allowTransit
                ? await _transit!.PlanForOrderAsync(transitInputs, depotNoForStockCheck, ct)
                : new TransitPreparationResult { DestinationDepotNo = depotNoForStockCheck };

            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            _db.F_DOCENTETES.Add(entete);
            await _db.SaveChangesAsync(ct);

            _db.F_DOCLIGNES.AddRange(lignes);
            await _db.SaveChangesAsync(ct);

            if (allowTransit && transitPlan.RequiresTransit)
                await _transit!.CreateForOrderAsync(piece, transitPlan, ct);

            await tx.CommitAsync(ct);

            return new BonCommandeCreateResult
            {
                Entete = entete,
                Lignes = lignes
            };
        }

        private async Task<ResolvedExistingClient> ResolveExistingClientAsync(Guid userId, CancellationToken ct)
        {
            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId, ct);
            if (user == null)
                throw new BonCommandeValidationException("Client introuvable.");

            var profile = await _db.ProfilsUtilisateurs.AsNoTracking().FirstOrDefaultAsync(x => x.UtilisateurId == userId, ct);
            if (profile == null)
                throw new BonCommandeValidationException("Profil client introuvable.");

            var roleNames = await _db.UserRoles
                .Where(x => x.UserId == userId)
                .Join(_db.Roles, x => x.RoleId, r => r.Id, (x, r) => r.Name)
                .Where(x => x != null)
                .Select(x => x!)
                .ToListAsync(ct);

            var isClient = roleNames.Contains(AppRoles.CLIENT, StringComparer.OrdinalIgnoreCase)
                           || profile.TypeProfil == TypeProfil.Client;

            if (!isClient)
                throw new BonCommandeValidationException("L'utilisateur sélectionné n'est pas un client.");

            return new ResolvedExistingClient
            {
                UserId = user.Id,
                Email = user.Email ?? string.Empty,
                Profile = profile
            };
        }

        private async Task<F_DEPOT?> ResolveDepotFromProfileCodeAsync(string rawCodeDepot, CancellationToken ct)
        {
            if (int.TryParse(rawCodeDepot, out var depotNo) && depotNo > 0)
            {
                var depotByNo = await _db.F_DEPOTS
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.DE_No == depotNo, ct);

                if (depotByNo != null)
                    return depotByNo;
            }

            var normalizedCode = rawCodeDepot.Trim().ToUpperInvariant();
            return await _db.F_DEPOTS
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.DE_Code != null && x.DE_Code.ToUpper() == normalizedCode,
                    ct);
        }

        private async Task<int?> ResolveDestinationDepotForHomeAsync(OrderCustomerSnapshot? snapshot, string? city, CancellationToken ct)
        {
            var gouvernorat = TrimOrNull(snapshot?.Gouvernorat);
            var delegation = TrimOrNull(snapshot?.Delegation);

            if (!string.IsNullOrWhiteSpace(gouvernorat) && !string.IsNullOrWhiteSpace(delegation))
            {
                var g = gouvernorat.ToUpperInvariant();
                var d = delegation.ToUpperInvariant();
                var depotNo = await _db.F_DEPOT_ZONES.AsNoTracking()
                    .Where(x => x.Gouvernorat.ToUpper() == g && x.Delegation.ToUpper() == d)
                    .OrderByDescending(x => x.IsPrimary)
                    .ThenBy(x => x.DepotNo)
                    .Select(x => (int?)x.DepotNo)
                    .FirstOrDefaultAsync(ct);

                if (depotNo.HasValue)
                    return depotNo.Value;
            }

            if (!string.IsNullOrWhiteSpace(gouvernorat))
            {
                var g = gouvernorat.ToUpperInvariant();
                var depotNo = await _db.F_DEPOT_ZONES.AsNoTracking()
                    .Where(x => x.Gouvernorat.ToUpper() == g && x.IsPrimary)
                    .OrderBy(x => x.DepotNo)
                    .Select(x => (int?)x.DepotNo)
                    .FirstOrDefaultAsync(ct);

                if (depotNo.HasValue)
                    return depotNo.Value;
            }

            var normalizedCity = TrimOrNull(city)?.ToUpperInvariant();
            if (!string.IsNullOrWhiteSpace(normalizedCity))
            {
                var depotNo = await _db.F_DEPOTS.AsNoTracking()
                    .Where(x => x.DE_Ville != null && x.DE_Ville.ToUpper().Contains(normalizedCity))
                    .OrderByDescending(x => x.DE_Principal)
                    .ThenBy(x => x.DE_No)
                    .Select(x => (int?)x.DE_No)
                    .FirstOrDefaultAsync(ct);

                if (depotNo.HasValue)
                    return depotNo.Value;
            }

            return null;
        }

        private static string NormalizeCustomerMode(string? mode)
        {
            var normalized = (mode ?? string.Empty).Trim().ToUpperInvariant();
            return normalized switch
            {
                CustomerModeExisting => CustomerModeExisting,
                CustomerModePassager => CustomerModePassager,
                _ => throw new BonCommandeValidationException("CustomerMode doit être EXISTING ou PASSAGER.")
            };
        }

        private static string NormalizeDeliveryType(string? deliveryType)
        {
            var normalized = (deliveryType ?? DeliveryTypeHome).Trim().ToUpperInvariant();
            return normalized switch
            {
                DeliveryTypeHome => DeliveryTypeHome,
                DeliveryTypePickup => DeliveryTypePickup,
                _ => throw new BonCommandeValidationException("DeliveryType doit être HOME ou PICKUP.")
            };
        }

        private static string NormalizePaymentMethod(string? paymentMethod)
        {
            var normalized = (paymentMethod ?? "COD").Trim().ToUpperInvariant();
            return string.IsNullOrWhiteSpace(normalized) ? "COD" : normalized;
        }

        private static string NormalizeVendeurSurPlacePaymentMethod(string? paymentMethod)
        {
            var token = NormalizePaymentToken(paymentMethod);

            return token switch
            {
                "SP01ESPECES" or "SP01ESPECE" or "COD" or "CASH" or "ESPECE" or "ESPECES"
                    => PaymentSurPlaceEspeces,

                "SP02CHEQUE" or "CHEQUE" or "CHEQUES" or "CHQ"
                    => PaymentSurPlaceCheque,

                "SP03TPE" or "TPE" or "CB" or "CARD" or "CARTE"
                    => PaymentSurPlaceTpe,

                "SP04PASSCADEAU" or "PASSCADEAU" or "PASSCADEAUX" or "GIFTCARD"
                    => PaymentSurPlacePassCadeau,

                _ => throw new BonCommandeValidationException(
                    $"Mode de paiement vendeur invalide. Valeurs autorisées : {PaymentSurPlaceEspeces}, {PaymentSurPlaceCheque}, {PaymentSurPlaceTpe}, {PaymentSurPlacePassCadeau}.")
            };
        }

        private static void ValidatePassager(VendeurPassagerClientDto passager)
        {
            ValidateCustomerSnapshot(
                OrderCustomerSnapshot.FromPassager(passager),
                requireTelephone: false,
                contextLabel: "Passager");
        }

        private static void ValidateGuestCustomer(OrderCustomerSnapshot snapshot)
        {
            ValidateCustomerSnapshot(
                snapshot,
                requireTelephone: true,
                contextLabel: "Client invité");
        }

        private static void ValidateCustomerSnapshot(
            OrderCustomerSnapshot snapshot,
            bool requireTelephone,
            string contextLabel)
        {
            var typeClient = (snapshot.TypeClient ?? string.Empty).Trim().ToUpperInvariant();
            if (typeClient != "B2C" && typeClient != "B2B")
                throw new BonCommandeValidationException($"{contextLabel}.TypeClient doit être B2C ou B2B.");

            if (requireTelephone && string.IsNullOrWhiteSpace(snapshot.Telephone))
                throw new BonCommandeValidationException($"{contextLabel}.Telephone est obligatoire.");

            if (typeClient == "B2C" && string.IsNullOrWhiteSpace(snapshot.NomComplet))
                throw new BonCommandeValidationException($"{contextLabel}.NomComplet est obligatoire pour un client B2C.");

            if (typeClient == "B2B" && string.IsNullOrWhiteSpace(snapshot.NomSociete))
                throw new BonCommandeValidationException($"{contextLabel}.NomSociete est obligatoire pour un client B2B.");
        }

        private async Task<string> GenerateUniquePassagerClientCodeAsync(CancellationToken ct)
        {
            for (var i = 0; i < 20; i++)
            {
                var code = "PS" + Guid.NewGuid().ToString("N")[..15];

                var existsInDocs = await _db.F_DOCENTETES.AsNoTracking().AnyAsync(x => x.DO_Tiers == code, ct);
                var existsInProfiles = await _db.ProfilsUtilisateurs.AsNoTracking().AnyAsync(x => x.CodeClientSage == code, ct);

                if (!existsInDocs && !existsInProfiles)
                    return code;
            }

            return "PS" + DateTime.UtcNow.ToString("yyMMddHHmmssfff")[..15];
        }

        public class BonCommandeCreateResult
        {
            public F_DOCENTETE Entete { get; set; } = null!;
            public List<F_DOCLIGNE> Lignes { get; set; } = new();
        }

        public class ResolvedVendeurContext
        {
            public Guid VendeurUserId { get; set; }
            public string? VendeurDisplayName { get; set; }
            public string? VendeurEmail { get; set; }
            public ProfilUtilisateur Profile { get; set; } = null!;
            public ResolvedDepot Depot { get; set; } = null!;
        }

        public class ResolvedDepot
        {
            public int DepotNo { get; set; }
            public string? DepotCode { get; set; }
            public string? DepotIntitule { get; set; }
            public string? Address { get; set; }
            public string? City { get; set; }
            public string? PostalCode { get; set; }
            public string? Country { get; set; }
        }

        public class VendeurPaymentOptionDefinition
        {
            public string Code { get; set; } = string.Empty;
            public string Label { get; set; } = string.Empty;
        }

        private class ResolvedExistingClient
        {
            public Guid UserId { get; set; }
            public string Email { get; set; } = string.Empty;
            public ProfilUtilisateur? Profile { get; set; }
        }

        private class CreateOrderPayload
        {
            public string ClientCode { get; set; } = string.Empty;
            public Guid? ClientUserId { get; set; }
            public Guid? VendeurUserId { get; set; }
            public string CustomerMode { get; set; } = CustomerModeExisting;
            public OrderCustomerSnapshot? PassengerSnapshot { get; set; }
            public ProfilUtilisateur? DiscountProfile { get; set; }
            public int? DepotNo { get; set; }
            public string? DeliveryType { get; set; }
            public string? PaymentMethod { get; set; }
            public string? Address { get; set; }
            public string? City { get; set; }
            public string? PostalCode { get; set; }
            public decimal? Latitude { get; set; }
            public decimal? Longitude { get; set; }
            public bool PersistAddressSnapshot { get; set; }
            // Zone de livraison choisie au checkout (prioritaire sur le snapshot profil)
            public string? DeliveryGouvernorat { get; set; }
            public string? DeliveryDelegation { get; set; }
            public List<CreateBonCommandeLineRequestDto> Lines { get; set; } = new();
        }

        public class OrderCustomerSnapshot
        {
            public string? TypeClient { get; set; }
            public string? NomComplet { get; set; }
            public string? Telephone { get; set; }
            public string? Cin { get; set; }
            public string? NomSociete { get; set; }
            public string? MatriculeFiscal { get; set; }
            public string? RegistreCommerce { get; set; }
            public string? NumeroTVA { get; set; }
            public string? Gouvernorat { get; set; }
            public string? Delegation { get; set; }
            public string? Adresse { get; set; }
            public string? AdresseComplementaire { get; set; }
            public string? CodePostal { get; set; }

            public static OrderCustomerSnapshot FromProfile(ProfilUtilisateur profile)
            {
                return new OrderCustomerSnapshot
                {
                    TypeClient = profile.TypeClient switch
                    {
                        Web_Api.Auth.Entities.TypeClient.B2B => "B2B",
                        Web_Api.Auth.Entities.TypeClient.B2C => "B2C",
                        _ => null
                    },
                    NomComplet = TrimOrNull(profile.NomComplet),
                    Telephone = TrimOrNull(profile.Telephone),
                    Cin = TrimOrNull(profile.CIN),
                    NomSociete = TrimOrNull(profile.NomSociete),
                    MatriculeFiscal = TrimOrNull(profile.MatriculeFiscal),
                    RegistreCommerce = TrimOrNull(profile.RegistreCommerce),
                    NumeroTVA = TrimOrNull(profile.NumeroTVA),
                    Gouvernorat = profile.Gouvernorat?.ToString(),
                    Delegation = TrimOrNull(profile.Delegation),
                    Adresse = TrimOrNull(profile.Adresse),
                    AdresseComplementaire = TrimOrNull(profile.AdresseComplementaire),
                    CodePostal = TrimOrNull(profile.CodePostal)
                };
            }

            public static OrderCustomerSnapshot FromPassager(VendeurPassagerClientDto passager)
            {
                return new OrderCustomerSnapshot
                {
                    TypeClient = TrimUpperOrNull(passager.TypeClient),
                    NomComplet = TrimOrNull(passager.NomComplet),
                    Telephone = TrimOrNull(passager.Telephone),
                    Cin = TrimOrNull(passager.Cin),
                    NomSociete = TrimOrNull(passager.NomSociete),
                    MatriculeFiscal = TrimOrNull(passager.MatriculeFiscal),
                    RegistreCommerce = TrimOrNull(passager.RegistreCommerce),
                    NumeroTVA = TrimOrNull(passager.NumeroTVA),
                    Gouvernorat = TrimOrNull(passager.Gouvernorat),
                    Delegation = TrimOrNull(passager.Delegation),
                    Adresse = TrimOrNull(passager.Adresse),
                    AdresseComplementaire = TrimOrNull(passager.AdresseComplementaire),
                    CodePostal = TrimOrNull(passager.CodePostal)
                };
            }

            public static OrderCustomerSnapshot FromGuest(
                GuestBonCommandeCustomerDto customer,
                string? fallbackAddress,
                string? fallbackPostalCode)
            {
                return new OrderCustomerSnapshot
                {
                    TypeClient = TrimUpperOrNull(customer.TypeClient),
                    NomComplet = TrimOrNull(customer.NomComplet),
                    Telephone = TrimOrNull(customer.Telephone),
                    Cin = TrimOrNull(customer.Cin),
                    NomSociete = TrimOrNull(customer.NomSociete),
                    MatriculeFiscal = TrimOrNull(customer.MatriculeFiscal),
                    RegistreCommerce = TrimOrNull(customer.RegistreCommerce),
                    NumeroTVA = TrimOrNull(customer.NumeroTVA),
                    Gouvernorat = TrimOrNull(customer.Gouvernorat),
                    Delegation = TrimOrNull(customer.Delegation),
                    Adresse = TrimOrNull(customer.Adresse) ?? TrimOrNull(fallbackAddress),
                    AdresseComplementaire = TrimOrNull(customer.AdresseComplementaire),
                    CodePostal = TrimOrNull(customer.CodePostal) ?? TrimOrNull(fallbackPostalCode)
                };
            }
        }

        public class BonCommandeValidationException : Exception
        {
            public BonCommandeValidationException(string message) : base(message)
            {
            }
        }

        private static ResolvedDepot MapDepot(F_DEPOT depot)
        {
            return new ResolvedDepot
            {
                DepotNo = depot.DE_No,
                DepotCode = TrimOrNull(depot.DE_Code),
                DepotIntitule = TrimOrNull(depot.DE_Intitule),
                Address = BuildDepotAddressLine(depot),
                City = LimitLength(TrimOrNull(depot.DE_Ville), 35),
                PostalCode = LimitLength(TrimOrNull(depot.DE_CodePostal), 9),
                Country = TrimOrNull(depot.DE_Pays)
            };
        }

        private static string? BuildDepotAddressLine(F_DEPOT depot)
        {
            var parts = new[]
            {
                TrimOrNull(depot.DE_Adresse),
                TrimOrNull(depot.DE_Complement)
            }
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToArray();

            if (parts.Length == 0)
                return null;

            return LimitLength(string.Join(", ", parts), 150);
        }

        private static string? ComputeVendeurDisplayName(ProfilUtilisateur? profile, string? email)
        {
            if (!string.IsNullOrWhiteSpace(profile?.NomComplet))
                return profile.NomComplet!.Trim();

            if (!string.IsNullOrWhiteSpace(profile?.CodeEmploye))
                return profile.CodeEmploye!.Trim();

            if (!string.IsNullOrWhiteSpace(email))
                return email.Trim();

            return null;
        }

        private static string NormalizePaymentToken(string? paymentMethod)
        {
            var normalized = (paymentMethod ?? string.Empty).Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(normalized))
                return string.Empty;

            return new string(normalized.Where(char.IsLetterOrDigit).ToArray());
        }

        private static string? TrimOrNull(string? value)
        {
            var trimmed = value?.Trim();
            return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
        }

        private static string? TrimUpperOrNull(string? value)
        {
            var trimmed = TrimOrNull(value);
            return trimmed?.ToUpperInvariant();
        }

        private static string? LimitLength(string? value, int maxLength)
        {
            var trimmed = TrimOrNull(value);
            if (trimmed == null)
                return null;

            return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
        }
    }
}
