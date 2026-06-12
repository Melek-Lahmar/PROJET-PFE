import '../../core/api_client.dart';
import '../../models/pool_commande.dart';

class LivreurPoolService {
  final ApiClient api;

  LivreurPoolService(this.api);

  Future<List<PoolCommande>> fetchDisponibles() async {
    final data = await api.getList('/api/livreur/pool/disponibles');
    return data.whereType<Map<String, dynamic>>().map(PoolCommande.fromMap).toList();
  }

  Future<List<PoolCommande>> fetchMesLivraisons() async {
    final data = await api.getList('/api/livreur/pool/mes-livraisons');
    return data.whereType<Map<String, dynamic>>().map(PoolCommande.fromMap).toList();
  }

  Future<CommandeDetail> fetchDetail(String doPiece) async {
    final data = await api.getMap('/api/livreur/pool/$doPiece/detail');
    return CommandeDetail.fromMap(data);
  }

  /// Retourne true si prise, false si déjà prise par quelqu'un d'autre.
  Future<bool> prendre(String doPiece) async {
    try {
      await api.postJson('/api/livreur/pool/$doPiece/prendre', const {});
      return true;
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('409') || msg.contains('Conflict') || msg.contains('déjà')) {
        return false;
      }
      rethrow;
    }
  }

  Future<AbandonResult> abandon(String doPiece, {String? note}) async {
    final data = await api.postJson(
      '/api/livreur/pool/$doPiece/abandon',
      {if (note != null && note.trim().isNotEmpty) 'note': note},
    );
    return AbandonResult.fromMap(data);
  }
}

class CommandeLigne {
  final String arRef;
  final String? designation;
  final double quantite;
  final double prixUnitaire;

  CommandeLigne({
    required this.arRef,
    this.designation,
    required this.quantite,
    required this.prixUnitaire,
  });

  factory CommandeLigne.fromMap(Map<String, dynamic> m) => CommandeLigne(
        arRef: (m['arRef'] ?? '').toString(),
        designation: m['designation']?.toString(),
        quantite: double.tryParse('${m['quantite'] ?? 0}'.replaceAll(',', '.')) ?? 0,
        prixUnitaire: double.tryParse('${m['prixUnitaire'] ?? 0}'.replaceAll(',', '.')) ?? 0,
      );
}

class CommandeDetail {
  final String doPiece;
  final String typeCommande;
  final String? commandeOriginalePiece;
  final double netAPayer;
  final String? clientDisplay;
  final String? clientPhone;
  final String? adresseLivraison;
  final String? villeLivraison;
  final List<CommandeLigne> lignesStandard;
  final List<CommandeLigne> lignesRetour;
  final List<CommandeLigne> lignesLivraison;

  CommandeDetail({
    required this.doPiece,
    required this.typeCommande,
    this.commandeOriginalePiece,
    required this.netAPayer,
    this.clientDisplay,
    this.clientPhone,
    this.adresseLivraison,
    this.villeLivraison,
    required this.lignesStandard,
    required this.lignesRetour,
    required this.lignesLivraison,
  });

  bool get isEchange => typeCommande.toUpperCase() == 'ECHANGE';

  factory CommandeDetail.fromMap(Map<String, dynamic> m) {
    List<CommandeLigne> parseLignes(dynamic raw) {
      if (raw is! List) return const [];
      return raw.whereType<Map<String, dynamic>>().map(CommandeLigne.fromMap).toList();
    }

    return CommandeDetail(
      doPiece: (m['doPiece'] ?? '').toString(),
      typeCommande: (m['typeCommande'] ?? 'NORMALE').toString(),
      commandeOriginalePiece: m['commandeOriginalePiece']?.toString(),
      netAPayer: double.tryParse('${m['netAPayer'] ?? 0}'.replaceAll(',', '.')) ?? 0,
      clientDisplay: m['clientDisplay']?.toString(),
      clientPhone: m['clientPhone']?.toString(),
      adresseLivraison: m['adresseLivraison']?.toString(),
      villeLivraison: m['villeLivraison']?.toString(),
      lignesStandard: parseLignes(m['lignesStandard']),
      lignesRetour: parseLignes(m['lignesRetour']),
      lignesLivraison: parseLignes(m['lignesLivraison']),
    );
  }
}

class AbandonResult {
  final bool ok;
  final int abandonsToday;
  final bool warning;

  AbandonResult({required this.ok, required this.abandonsToday, required this.warning});

  factory AbandonResult.fromMap(Map<String, dynamic> map) => AbandonResult(
        ok: map['ok'] == true,
        abandonsToday: map['abandonsToday'] is int
            ? map['abandonsToday'] as int
            : int.tryParse('${map['abandonsToday'] ?? 0}') ?? 0,
        warning: map['warning'] == true,
      );
}
