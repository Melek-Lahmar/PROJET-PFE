class PoolCommande {
  final String doPiece;
  final String typeCommande;
  final String? commandeOriginalePiece;
  final String? echangeArticleRetour;
  final String? echangeArticleLivraison;
  final DateTime? doDate;
  final double netAPayer;
  final String? clientDisplay;
  final String? clientPhone;
  final String? adresseLivraison;
  final String? villeLivraison;

  const PoolCommande({
    required this.doPiece,
    required this.typeCommande,
    this.commandeOriginalePiece,
    this.echangeArticleRetour,
    this.echangeArticleLivraison,
    this.doDate,
    required this.netAPayer,
    this.clientDisplay,
    this.clientPhone,
    this.adresseLivraison,
    this.villeLivraison,
  });

  bool get isEchange => typeCommande.toUpperCase() == 'ECHANGE';

  factory PoolCommande.fromMap(Map<String, dynamic> map) {
    return PoolCommande(
      doPiece: (map['doPiece'] ?? '').toString(),
      typeCommande: (map['typeCommande'] ?? 'NORMALE').toString(),
      commandeOriginalePiece: map['commandeOriginalePiece']?.toString(),
      echangeArticleRetour: map['echangeArticleRetour']?.toString(),
      echangeArticleLivraison: map['echangeArticleLivraison']?.toString(),
      doDate: DateTime.tryParse('${map['doDate'] ?? ''}')?.toLocal(),
      netAPayer: double.tryParse(
              '${map['netAPayer'] ?? 0}'.replaceAll(',', '.')) ??
          0,
      clientDisplay: map['clientDisplay']?.toString(),
      clientPhone: map['clientPhone']?.toString(),
      adresseLivraison: map['adresseLivraison']?.toString(),
      villeLivraison: map['villeLivraison']?.toString(),
    );
  }
}
