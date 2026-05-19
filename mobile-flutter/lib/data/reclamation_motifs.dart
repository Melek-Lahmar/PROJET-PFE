/// Motifs disponibles côté CLIENT (liste fixe, partagée UI).
class ClientMotif {
  final String code;
  final String label;
  final bool needsPhoto;
  final bool needsCorrection; // adresse / numéro

  const ClientMotif({
    required this.code,
    required this.label,
    this.needsPhoto = false,
    this.needsCorrection = false,
  });
}

/// Motifs disponibles QUAND la commande n'est PAS encore livrée.
const List<ClientMotif> kClientMotifsBeforeDelivery = [
  ClientMotif(
    code: 'CHANGEMENT_ADRESSE',
    label: 'Changement d\'adresse',
    needsCorrection: true,
  ),
  ClientMotif(
    code: 'CHANGEMENT_NUMERO',
    label: 'Changement de numéro',
    needsCorrection: true,
  ),
  ClientMotif(code: 'ANNULATION', label: 'Demande d\'annulation'),
  ClientMotif(code: 'REPROGRAMMATION', label: 'Demande de reprogrammation'),
  ClientMotif(code: 'COLIS_NON_RECU', label: 'Colis non reçu'),
];

/// Motifs disponibles UNIQUEMENT quand la commande est livrée.
const List<ClientMotif> kClientMotifsAfterDelivery = [
  ClientMotif(
    code: 'COLIS_ENDOMMAGE',
    label: 'Colis endommagé',
    needsPhoto: true,
  ),
  ClientMotif(
    code: 'COLIS_NON_CORRESPONDANT',
    label: 'Colis non correspondant',
    needsPhoto: true,
  ),
];

/// Liste complète (pour lookup des labels), ne PAS utiliser dans un dropdown client.
const List<ClientMotif> kClientMotifs = [
  ...kClientMotifsBeforeDelivery,
  ...kClientMotifsAfterDelivery,
];

/// Renvoie les motifs disponibles selon le statut commande.
/// Règle : si la commande est "LIVRE", seuls les motifs post-livraison sont dispo.
List<ClientMotif> clientMotifsForOrderStatus(String normalizedStatus) {
  return normalizedStatus.toUpperCase() == 'LIVRE'
      ? kClientMotifsAfterDelivery
      : kClientMotifsBeforeDelivery;
}

/// Motifs disponibles côté LIVREUR (liste fixe, partagée UI).
class LivreurMotif {
  final String code;
  final String label;
  final bool deferred; // escalation après 3 tentatives
  final bool needsDescription; // description min 10 caractères
  final bool needsPhoto; // photo obligatoire (COLIS_ENDOMMAGE_DEPOT)

  const LivreurMotif({
    required this.code,
    required this.label,
    this.deferred = false,
    this.needsDescription = false,
    this.needsPhoto = false,
  });
}

/// 8 motifs livreur répartis en 3 groupes :
/// - A : visibles côté client (adresse / numéro)
/// - B : directs confirmatrice (refus / autre incident / colis endommagé dépôt)
/// - C : escalade après 3 tentatives (téléphone fermé / non joignable / absent)
///
/// Aligné sur `Web-Api/Auth/Constants/ReclamationMotifs.cs::LivreurMotifs.All`.
const List<LivreurMotif> kLivreurMotifs = [
  // Groupe A — visibles client
  LivreurMotif(code: 'ADRESSE_INCORRECTE', label: 'Adresse incorrecte'),
  LivreurMotif(code: 'NUMERO_INCORRECT', label: 'Numéro incorrect'),
  // Groupe B — directs confirmatrice
  LivreurMotif(code: 'CLIENT_REFUSE', label: 'Refus client'),
  LivreurMotif(code: 'AUTRE', label: 'Autre incident', needsDescription: true),
  LivreurMotif(
    code: 'COLIS_ENDOMMAGE_DEPOT',
    label: 'Colis endommagé (retour dépôt)',
    needsPhoto: true,
  ),
  // Groupe C — escalade après 3 tentatives
  LivreurMotif(code: 'TELEPHONE_ETEINT', label: 'Téléphone fermé', deferred: true),
  LivreurMotif(code: 'CLIENT_INJOIGNABLE', label: 'Client non joignable', deferred: true),
  LivreurMotif(code: 'CLIENT_ABSENT', label: 'Client absent', deferred: true),
];

/// Longueur minimale quand la description est obligatoire côté livreur.
const int kLivreurDescriptionMinLength = 10;

String labelForClientMotif(String code) {
  final m = kClientMotifs.firstWhere(
    (x) => x.code == code.toUpperCase(),
    orElse: () => const ClientMotif(code: '', label: ''),
  );
  return m.label.isEmpty ? code : m.label;
}

String labelForLivreurMotif(String code) {
  final m = kLivreurMotifs.firstWhere(
    (x) => x.code == code.toUpperCase(),
    orElse: () => const LivreurMotif(code: '', label: ''),
  );
  return m.label.isEmpty ? code : m.label;
}

String labelForAnyMotif(String code) {
  final c = code.toUpperCase();
  for (final m in kClientMotifs) {
    if (m.code == c) return m.label;
  }
  for (final m in kLivreurMotifs) {
    if (m.code == c) return m.label;
  }
  return code;
}
