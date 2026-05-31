import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../../data/services/confirmatrice_order_history_service.dart';
import '../../data/services/confirmatrice_orders_service.dart';
import '../../models/confirmatrice_order.dart';
import '../../models/livreur_order_details.dart' show LivreurOrderHistoryItem;
import '../../state/confirmatrice_orders_provider.dart';
import '../widgets/confirmatrice/client_history_bottom_sheet.dart';
import 'order_history_screen.dart';

/// 2.B — Refonte "style Converty" :
/// - Hero violet gradient avec ref + total accent jaune sur les centimes
/// - Carte client avec bouton vert plein largeur téléphone
/// - Cart avec photos articles
/// - Grille de 8 boutons statuts colorés (CONFIRME / EN_LIVRAISON / DEPOT /
///   REPORTE / RETOUR / LIVRE / TENTATIVE / REFUSE) + badge "Tentative N"
///   incrémentable manuellement.
class ConfirmatriceOrderDetailsScreen extends StatefulWidget {
  final String piece;

  const ConfirmatriceOrderDetailsScreen({
    super.key,
    required this.piece,
  });

  @override
  State<ConfirmatriceOrderDetailsScreen> createState() =>
      _ConfirmatriceOrderDetailsScreenState();
}

class _ConfirmatriceOrderDetailsScreenState
    extends State<ConfirmatriceOrderDetailsScreen> {
  ConfirmatriceOrder? _order;
  bool _loading = true;
  String? _error;
  int _tentativeCount = 1;

  /// Timeline événements de la commande chargée en parallèle de l'order.
  /// Null tant que le fetch n'est pas terminé, vide si endpoint OK mais
  /// aucune donnée, fallback synthèse si erreur réseau / 404.
  List<LivreurOrderHistoryItem>? _history;

  /// Couverture de zone livreur (chargée en parallèle). `null` = pas encore
  /// chargé, sinon contient `hasCoverage`, `gouvernorat`, `delegation`,
  /// `livreurCount` et éventuellement `message`.
  Map<String, dynamic>? _coverage;
  bool _coverageLoading = false;

  /// Liste des superviseurs (chargée seulement si la couverture est rouge).
  List<Map<String, dynamic>>? _supervisors;

  static const _gradientStart = Color(0xFF6E3CE9);
  static const _gradientEnd = Color(0xFF8E5FF8);
  static const _accentYellow = Color(0xFFFFE066);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final data = await context
          .read<ConfirmatriceOrdersProvider>()
          .fetchDetails(widget.piece);

      if (!mounted) return;

      setState(() {
        _order = data;
        _loading = false;
      });

      // Charge la timeline réelle en parallèle (non bloquant).
      unawaited(_loadHistory());
      // Charge la couverture de zone livreur (non bloquant).
      unawaited(_loadCoverage());
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _loadHistory() async {
    try {
      final api = context.read<ApiClient>();
      final svc = ConfirmatriceOrderHistoryService(api);
      final items = await svc.fetch(widget.piece);
      if (!mounted) return;
      setState(() => _history = items);
    } catch (_) {
      // Silencieux : si le endpoint échoue, on garde la synthèse fallback.
    }
  }

  Future<void> _call(String? phone) async {
    final raw = (phone ?? '').trim();
    if (raw.isEmpty) {
      _snack('Aucun numéro disponible.');
      return;
    }
    final digits = raw.replaceAll(RegExp(r'[\s\-().]'), '');
    final uri = Uri(scheme: 'tel', path: digits);
    if (!await launchUrl(uri)) _snack('Impossible de lancer l\'appel.');
  }

  Future<void> _confirmOrder() async {
    final order = _order;
    if (order == null) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Confirmer la commande'),
        content: Text(
          'Voulez-vous confirmer la commande ${order.piece} et la transformer en BL ?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Confirmer'),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    final blPiece =
        await context.read<ConfirmatriceOrdersProvider>().confirmToBl(order.piece);

    if (!mounted) return;

    if (blPiece != null) {
      _snack('Commande confirmée. BL créé : $blPiece');
      Navigator.of(context).pop(true);
    } else {
      final error = context.read<ConfirmatriceOrdersProvider>().error;
      _snack(error ?? 'Impossible de confirmer la commande.');
    }
  }

  Future<void> _pushStatus(String statusKey) async {
    final order = _order;
    if (order == null) return;

    // Cas spécial : "CONFIRME" passe par transform-to-bl (BC → BL).
    if (statusKey == 'CONFIRME' && order.isPending) {
      return _confirmOrder();
    }

    // B.1 — "REPORTE" ouvre un date picker avant l'envoi.
    if (statusKey == 'REPORTE') {
      return _pushReporterWithDate();
    }

    final messenger = ScaffoldMessenger.of(context);
    final ok = await context
        .read<ConfirmatriceOrdersProvider>()
        .updateStatusExtended(
          order.piece,
          statusKey,
          tentativeCount: statusKey == 'TENTATIVE' ? _tentativeCount : null,
        );

    if (!mounted) return;
    if (ok) {
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(
          backgroundColor: Colors.green,
          content: Text('Statut → $statusKey appliqué.'),
        ));
      await _load();
    } else {
      final error = context.read<ConfirmatriceOrdersProvider>().error;
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(
          backgroundColor: Colors.red,
          content: Text(error ?? 'Erreur lors du changement de statut.'),
        ));
    }
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  /// B.4 — Ouvre l'historique commandes du client en bottomsheet (80% hauteur).
  Future<void> _openClientHistory(ConfirmatriceOrder o) async {
    final clientId = o.client?.utilisateurId;
    if (clientId == null || clientId.isEmpty) {
      _snack('Aucun identifiant client disponible.');
      return;
    }
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ClientHistoryBottomSheet(clientId: clientId),
    );
  }

  /// B.1 — Bouton "Reporter" : ouvre un date picker pour choisir la
  /// nouvelle date de livraison, puis pousse le statut REPORTE avec
  /// une note contenant la date.
  Future<void> _pushReporterWithDate() async {
    final order = _order;
    if (order == null) return;
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 60)),
      helpText: 'Nouvelle date de livraison',
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 10, minute: 0),
      helpText: 'Créneau approximatif',
    );
    if (time == null || !mounted) return;
    final replanned = DateTime(
      date.year, date.month, date.day, time.hour, time.minute,
    );
    final note = 'Replanifié au ${_fmtDate(replanned)}';

    final ok = await context
        .read<ConfirmatriceOrdersProvider>()
        .updateStatusExtended(
          order.piece,
          'REPORTE',
          note: note,
        );
    if (!mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    if (ok) {
      messenger.showSnackBar(SnackBar(
        backgroundColor: Colors.green,
        content: Text('Reporté au ${_fmtDate(replanned)}.'),
      ));
      await _load();
    } else {
      final err = context.read<ConfirmatriceOrdersProvider>().error;
      messenger.showSnackBar(SnackBar(
        backgroundColor: Colors.red,
        content: Text(err ?? 'Erreur lors du report.'),
      ));
    }
  }

  String _fmtAmount(double v) {
    // Sépare partie entière et 2 décimales pour l'accent jaune.
    return v.toStringAsFixed(2);
  }

  String _fmtDate(DateTime? v) {
    if (v == null) return '--';
    final d = v.toLocal();
    String two(int x) => x.toString().padLeft(2, '0');
    return '${two(d.day)}/${two(d.month)}/${d.year} ${two(d.hour)}:${two(d.minute)}';
  }

  /// Construit la timeline. Priorité aux vraies données backend
  /// (`/api/confirmatrice/orders/{piece}/history`) si chargées ; sinon
  /// fallback synthèse minimale depuis le `ConfirmatriceOrder` local.
  List<OrderTimelineEvent> _buildConfHistoryEvents(ConfirmatriceOrder o) {
    final backend = _history;
    if (backend != null && backend.isNotEmpty) {
      return backend.map(_mapBackendHistoryItem).toList();
    }

    // Fallback minimal — utilisé pendant le chargement ou si endpoint KO.
    final events = <OrderTimelineEvent>[];

    if (o.date != null) {
      events.add(OrderTimelineEvent(
        date: o.date!,
        label: 'Commande créée',
        color: const Color(0xFF6B7280),
        icon: Icons.shopping_bag_rounded,
        description: o.clientDisplay,
      ));
    }

    final statusDate = o.date ?? DateTime.now();
    switch (o.status) {
      case 1:
        events.add(OrderTimelineEvent(
          date: statusDate.add(const Duration(minutes: 1)),
          label: 'Confirmée',
          color: const Color(0xFF22C55E),
          icon: Icons.check_circle_rounded,
        ));
        break;
      case 2:
        events.add(OrderTimelineEvent(
          date: statusDate.add(const Duration(minutes: 1)),
          label: 'Tentative',
          color: const Color(0xFFF59E0B),
          icon: Icons.access_time_rounded,
          description: 'Tentative $_tentativeCount',
        ));
        break;
      case 3:
        events.add(OrderTimelineEvent(
          date: statusDate.add(const Duration(minutes: 1)),
          label: 'Refusée',
          color: const Color(0xFFEF4444),
          icon: Icons.cancel_rounded,
        ));
        break;
    }

    return events;
  }

  /// Mappe un `LivreurOrderHistoryItem` (backend) → `OrderTimelineEvent` UI.
  /// Le `statusCode` est le code BACKEND (DeliveryStatusCodes), pas le code
  /// Flutter Statut — donc 0=Confirme côté entête, 2=Livre, 4=Depot, etc.
  static OrderTimelineEvent _mapBackendHistoryItem(LivreurOrderHistoryItem h) {
    final visual = _visualForBackendCode(h.statusCode);
    final desc = [
      if ((h.motif ?? '').trim().isNotEmpty) 'Motif: ${h.motif!.trim()}',
      if ((h.note ?? '').trim().isNotEmpty) h.note!.trim(),
    ].join(' · ');
    return OrderTimelineEvent(
      date: h.at,
      label: h.statusLabel ?? visual.label,
      color: visual.color,
      icon: visual.icon,
      description: desc.isEmpty ? null : desc,
      actor: h.updatedBy,
    );
  }

  static _BackendStatusVisual _visualForBackendCode(int code) {
    // DeliveryStatusCodes (backend) :
    // 0=Confirme, 1=EnLivraison, 2=Livre, 3=Retour,
    // 4=Depot, 5=Reporte, 6=DepotEnCoursDePreparation, 7=DepotPret
    switch (code) {
      case 0:
        return const _BackendStatusVisual(
            Color(0xFF6366F1),
            Icons.check_circle_outline_rounded,
            'Confirmée');
      case 1:
        return const _BackendStatusVisual(
            Color(0xFF0EA5E9),
            Icons.local_shipping_rounded,
            'En livraison');
      case 2:
        return const _BackendStatusVisual(
            Color(0xFF22C55E),
            Icons.check_circle_rounded,
            'Livrée');
      case 3:
        return const _BackendStatusVisual(
            Color(0xFFEF4444),
            Icons.undo_rounded,
            'Retournée');
      case 4:
        return const _BackendStatusVisual(
            Color(0xFFA855F7),
            Icons.warehouse_rounded,
            'Au dépôt');
      case 5:
        return const _BackendStatusVisual(
            Color(0xFFF97316),
            Icons.event_repeat_rounded,
            'Reportée');
      case 6:
        return const _BackendStatusVisual(
            Color(0xFFEA580C),
            Icons.inventory_2_rounded,
            'Dépôt — en préparation');
      case 7:
        return const _BackendStatusVisual(
            Color(0xFF22C55E),
            Icons.task_alt_rounded,
            'Dépôt — prête');
      default:
        return const _BackendStatusVisual(
            Color(0xFF6B7280),
            Icons.timeline_rounded,
            'Étape');
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      appBar: AppBar(
        title: Text(order?.piece ?? 'Détail commande'),
        actions: [
          IconButton(
            tooltip: 'Actualiser',
            onPressed: _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      _error!,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                )
              : order == null
                  ? const Center(child: Text('Commande introuvable.'))
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                      children: [
                        _heroCard(order),
                        const SizedBox(height: 14),
                        _clientCard(order),
                        const SizedBox(height: 14),
                        if (order.lines.isNotEmpty) ...[
                          _cartCard(order),
                          const SizedBox(height: 14),
                        ],
                        _statusDropdownCard(order),
                        const SizedBox(height: 14),
                        OrderTimelineList(
                          events: _buildConfHistoryEvents(order),
                          accentColor: _gradientStart,
                          accentDark: _gradientEnd,
                        ),
                      ],
                    ),
    );
  }

  // ───────────────────────────── HERO ─────────────────────────────
  Widget _heroCard(ConfirmatriceOrder o) {
    final amount = o.netAPayer > 0 ? o.netAPayer : o.totalTtc;
    final parts = _fmtAmount(amount).split('.');
    final whole = parts[0];
    final cents = parts.length > 1 ? parts[1] : '00';

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_gradientStart, _gradientEnd],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: _gradientStart.withValues(alpha: 0.35),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Order Total',
            style: TextStyle(
              color: Colors.white70,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.4,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 4),
          // Accent jaune sur les centimes.
          RichText(
            text: TextSpan(
              children: [
                TextSpan(
                  text: whole,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 38,
                    height: 1,
                  ),
                ),
                const TextSpan(
                  text: '.',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 38,
                  ),
                ),
                TextSpan(
                  text: cents,
                  style: const TextStyle(
                    color: _accentYellow,
                    fontWeight: FontWeight.w900,
                    fontSize: 38,
                    height: 1,
                  ),
                ),
                const TextSpan(
                  text: '  DT',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 18,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _heroRow(Icons.tag_rounded, 'Référence', o.piece),
          _heroRow(Icons.calendar_today_rounded, 'Date', _fmtDate(o.date)),
          _heroRow(
            Icons.local_shipping_rounded,
            'Livraison',
            _displayDeliveryTotal(o),
          ),
          _heroRow(Icons.shield_rounded, 'Statut', o.displayStatus),
          const SizedBox(height: 12),
          // Code-barre stylisé (fake barcode).
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
            ),
            child: Column(
              children: [
                CustomPaint(
                  size: const Size(double.infinity, 28),
                  painter: _BarcodePainter(seed: o.piece, color: Colors.white),
                ),
                const SizedBox(height: 4),
                Text(
                  o.piece,
                  style: const TextStyle(
                    color: Colors.white,
                    letterSpacing: 4,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _heroRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(icon, color: Colors.white.withValues(alpha: 0.85), size: 16),
          const SizedBox(width: 8),
          Text(
            '$label  ',
            style: const TextStyle(color: Colors.white70, fontSize: 13),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: 13.5,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  String _displayDeliveryTotal(ConfirmatriceOrder o) {
    final delta = o.totalTtc - (o.netAPayer > 0 ? o.netAPayer : o.totalTtc);
    if (delta <= 0) return 'Incluse';
    return '${delta.toStringAsFixed(3)} TND';
  }

  // ───────────────────────────── CLIENT ─────────────────────────────
  Widget _clientCard(ConfirmatriceOrder o) {
    final c = o.client;
    final phone = c?.telephone;
    final displayName = c?.displayName ?? o.clientDisplay ?? '—';
    final cityLine = [
      if ((c?.delegation ?? '').isNotEmpty) c!.delegation!,
      if ((c?.gouvernorat ?? '').isNotEmpty) c!.gouvernorat!,
    ].join(' • ');

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x10000000),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: _gradientStart.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.person_rounded,
                  color: _gradientStart,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      displayName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 17,
                      ),
                    ),
                    if (cityLine.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        cityLine,
                        style: const TextStyle(
                          color: Color(0xFF8A8FA8),
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Historique du client',
                onPressed: () => _openClientHistory(o),
                icon: const Icon(Icons.menu_rounded, size: 20),
              ),
              IconButton(
                tooltip: 'Bloquer le client',
                onPressed: () => _snack('Bloquer client — action démo'),
                icon: const Icon(Icons.block_rounded, size: 20),
              ),
            ],
          ),
          if ((c?.adresse ?? '').isNotEmpty) ...[
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.place_outlined,
                    color: Color(0xFF8A8FA8), size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    c!.adresse!,
                    style:
                        const TextStyle(color: Color(0xFF555770), fontSize: 13),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: phone == null || phone.isEmpty ? null : () => _call(phone),
              icon: const Icon(Icons.phone_rounded),
              label: Text(
                phone == null || phone.isEmpty ? 'Aucun numéro' : phone,
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  letterSpacing: 1.0,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green.shade600,
                foregroundColor: Colors.white,
                disabledBackgroundColor: Colors.green.shade100,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ───────────────────────────── CART ─────────────────────────────
  Widget _cartCard(ConfirmatriceOrder o) {
    final imageUrls = o.lines
        .map((l) => l.imageUrl)
        .whereType<String>()
        .where((u) => u.isNotEmpty)
        .toList();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x10000000),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.shopping_bag_rounded,
                  color: _gradientStart, size: 20),
              SizedBox(width: 8),
              Text(
                'Panier',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          if (imageUrls.isNotEmpty) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 140,
              child: imageUrls.length == 1
                  ? _heroImage(imageUrls.first)
                  : ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: imageUrls.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 10),
                      itemBuilder: (_, i) => SizedBox(
                        width: 160,
                        child: _heroImage(imageUrls[i]),
                      ),
                    ),
            ),
          ],
          const SizedBox(height: 12),
          for (var i = 0; i < o.lines.length; i++) ...[
            _ConfirmCartLine(line: o.lines[i]),
            if (i < o.lines.length - 1)
              const Divider(
                height: 20,
                color: Color(0xFFEDEEF5),
              ),
          ],
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF6F7FB),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                _kv('Total HT', '${o.totalHt.toStringAsFixed(3)} TND'),
                _kv('Total TTC', '${o.totalTtc.toStringAsFixed(3)} TND'),
                const Divider(),
                _kv(
                  'Net à payer',
                  '${o.netAPayer.toStringAsFixed(3)} TND',
                  big: true,
                  color: _gradientStart,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _heroImage(String url) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: Image.network(
        url,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Container(
          color: const Color(0xFFF1F3FA),
          child: const Center(
            child: Icon(Icons.image_not_supported_outlined,
                color: Color(0xFF8A8FA8)),
          ),
        ),
      ),
    );
  }

  Widget _kv(String label, String value,
      {bool big = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(label,
              style: TextStyle(
                color: const Color(0xFF8A8FA8),
                fontSize: big ? 14 : 13,
                fontWeight: big ? FontWeight.w800 : FontWeight.w600,
              )),
          const Spacer(),
          Text(value,
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: big ? 17 : 13,
                color: color ?? Colors.black,
              )),
        ],
      ),
    );
  }

  // ───────────────────────────── STATUSES ─────────────────────────────
  /// Dropdown 1 ligne : CONFIRME / TENTATIVE / REFUSE uniquement.
  /// Tant que la commande n'est pas transformée en BL, on peut basculer
  /// librement entre ces 3 états.
  Widget _statusDropdownCard(ConfirmatriceOrder o) {
    final saving = context.watch<ConfirmatriceOrdersProvider>().saving;

    final options = <_StatusOpt>[
      _StatusOpt('CONFIRME', 'Confirmer', Icons.check_circle_rounded,
          Colors.green.shade600),
      _StatusOpt('TENTATIVE', 'Tentative', Icons.replay_rounded,
          Colors.orange.shade700),
      _StatusOpt('REFUSE', 'Refuser', Icons.cancel_rounded, Colors.red.shade600),
    ];

    final current = o.normalizedStatus;
    final isFinal = o.isConfirmed; // confirmée → transformée en BL côté backend
    final selected = options
        .firstWhere((e) => e.key == current, orElse: () => options.first);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x10000000),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.tune_rounded, color: _gradientStart, size: 20),
              SizedBox(width: 8),
              Text(
                'Changer le statut',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _StatusDropdownRow(
            options: options,
            current: current,
            disabled: saving || isFinal,
            disabledReason: isFinal
                ? 'Commande confirmée et transformée en BL'
                : null,
            onChanged: (key) => _pushStatus(key),
            accentColor: selected.color,
          ),
          if (current == 'TENTATIVE') ...[
            const SizedBox(height: 12),
            Row(
              children: [
                const Text(
                  'Numéro de tentative',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF8A8FA8),
                    fontSize: 13,
                  ),
                ),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade700,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      InkWell(
                        onTap: saving
                            ? null
                            : () => setState(() {
                                  _tentativeCount =
                                      (_tentativeCount - 1).clamp(1, 9);
                                }),
                        child: const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 6),
                          child: Icon(Icons.remove,
                              color: Colors.white, size: 16),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 6),
                        child: Text(
                          'N $_tentativeCount',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 13,
                          ),
                        ),
                      ),
                      InkWell(
                        onTap: saving
                            ? null
                            : () => setState(() {
                                  _tentativeCount =
                                      (_tentativeCount + 1).clamp(1, 9);
                                }),
                        child: const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 6),
                          child: Icon(Icons.add,
                              color: Colors.white, size: 16),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _StatusOpt {
  final String key;
  final String label;
  final IconData icon;
  final Color color;
  const _StatusOpt(this.key, this.label, this.icon, this.color);
}

class _StatusDropdownRow extends StatelessWidget {
  final List<_StatusOpt> options;
  final String current;
  final bool disabled;
  final String? disabledReason;
  final void Function(String key) onChanged;
  final Color accentColor;

  const _StatusDropdownRow({
    required this.options,
    required this.current,
    required this.disabled,
    required this.disabledReason,
    required this.onChanged,
    required this.accentColor,
  });

  _StatusOpt? get _currentOpt {
    for (final o in options) {
      if (o.key == current) return o;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final opt = _currentOpt;
    final label = opt?.label ?? 'Sélectionner un statut';
    final icon = opt?.icon ?? Icons.help_outline_rounded;
    final color = opt?.color ?? Colors.grey.shade600;

    Future<void> openSheet() async {
      final selected = await showModalBottomSheet<String>(
        context: context,
        backgroundColor: Colors.transparent,
        isScrollControlled: true,
        builder: (ctx) {
          return SafeArea(
            top: false,
            child: Container(
              margin: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(22),
              ),
              padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    height: 4,
                    width: 38,
                    decoration: BoxDecoration(
                      color: Colors.black12,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                    child: Text(
                      'Choisir un statut',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                      ),
                    ),
                  ),
                  ...options.map((o) {
                    final isCurrent = o.key == current;
                    return ListTile(
                      onTap: () => Navigator.of(ctx).pop(o.key),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: o.color.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(o.icon, color: o.color, size: 20),
                      ),
                      title: Text(
                        o.label,
                        style: TextStyle(
                          color: o.color,
                          fontWeight: FontWeight.w900,
                          fontSize: 14.5,
                        ),
                      ),
                      trailing: isCurrent
                          ? Icon(Icons.check_rounded, color: o.color)
                          : null,
                    );
                  }),
                  const SizedBox(height: 6),
                ],
              ),
            ),
          );
        },
      );
      if (selected != null && selected != current) onChanged(selected);
    }

    return InkWell(
      onTap: disabled ? null : openSheet,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: disabled
              ? Colors.grey.shade100
              : accentColor.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: disabled
                ? Colors.grey.shade300
                : accentColor.withValues(alpha: 0.35),
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: disabled ? 0.10 : 0.16),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.w900,
                      fontSize: 14.5,
                    ),
                  ),
                  if (disabledReason != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      disabledReason!,
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Icon(
              disabled
                  ? Icons.lock_rounded
                  : Icons.keyboard_arrow_down_rounded,
              color: disabled ? Colors.grey.shade500 : color,
            ),
          ],
        ),
      ),
    );
  }
}

class _ConfirmCartLine extends StatelessWidget {
  final ConfirmatriceOrderLine line;
  const _ConfirmCartLine({required this.line});

  @override
  Widget build(BuildContext context) {
    final qte = line.qty.toStringAsFixed(
        line.qty.truncateToDouble() == line.qty ? 0 : 2);
    final pu = line.unitPrice.toStringAsFixed(3);
    final sub = line.totalTtc > 0 ? line.totalTtc : line.unitPrice * line.qty;
    final url = line.imageUrl;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: Container(
            width: 56,
            height: 56,
            color: const Color(0xFFF1F3FA),
            child: url != null && url.isNotEmpty
                ? Image.network(
                    url,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const Icon(
                      Icons.image_not_supported_outlined,
                      color: Color(0xFF8A8FA8),
                    ),
                  )
                : const Icon(Icons.inventory_2_outlined,
                    color: Color(0xFF8A8FA8)),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                (line.designation ?? '').isNotEmpty
                    ? line.designation!
                    : line.articleRef,
                style:
                    const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEDEEF5),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text('علبة x$qte',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                        )),
                  ),
                  const SizedBox(width: 8),
                  Text('$pu TND',
                      style: const TextStyle(
                          color: Color(0xFF8A8FA8), fontSize: 12)),
                ],
              ),
            ],
          ),
        ),
        Text('${sub.toStringAsFixed(3)} TND',
            style: const TextStyle(
              fontWeight: FontWeight.w900,
              color: Color(0xFF6E3CE9),
              fontSize: 14,
            )),
      ],
    );
  }
}

/// Petit "barcode" décoratif à partir d'un seed (hash de la pièce).
class _BarcodePainter extends CustomPainter {
  final String seed;
  final Color color;

  _BarcodePainter({required this.seed, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final bytes = seed.codeUnits;
    final n = (size.width / 3).floor();
    double x = 0;
    for (var i = 0; i < n; i++) {
      final c = bytes[i % bytes.length];
      final w = (c % 3) + 1.0;
      if (c.isEven) {
        canvas.drawRect(Rect.fromLTWH(x, 0, w, size.height), paint);
      }
      x += w + 1;
      if (x >= size.width) break;
    }
  }

  @override
  bool shouldRepaint(covariant _BarcodePainter old) =>
      old.seed != seed || old.color != color;
}

/// Helper struct pour mapper un code statut backend → couleur + icône + label
/// dans la timeline confirmatrice. Aligné sur les codes DeliveryStatusCodes
/// (0..7) renvoyés par `/api/confirmatrice/orders/{piece}/history`.
class _BackendStatusVisual {
  final Color color;
  final IconData icon;
  final String label;
  const _BackendStatusVisual(this.color, this.icon, this.label);
}
