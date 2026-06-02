import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/constants.dart';
import '../../../core/theme/app_status_palette.dart';
import '../../../models/delivery.dart';
import '../../../state/deliveries_provider.dart';
import '../../widgets/livreur/heure_souhaitee_badge.dart';
import '../../widgets/livreur/heure_souhaitee_sheet.dart';
import '../../widgets/premium/animated_entry.dart';
import '../../widgets/premium/empty_view.dart';
import '../../widgets/premium/premium_card.dart';
import '../../widgets/premium/skeleton.dart';
import '../../widgets/premium/status_pill.dart';
import 'delivery_details_screen.dart';

/// Écran « Mes commandes » — liste des livraisons acceptées par le livreur.
/// Filtres chip + recherche + mode sélection multiple par long-press.
/// Le FAB premium gradient « Lancer livraison (N) » apparaît quand des
/// commandes au dépôt prêtes sont sélectionnées et passe le batch en
/// `Statut.enLivraison` via l'endpoint `PUT /api/livreur/orders/batch-status`.
class LivreurMyOrdersScreen extends StatefulWidget {
  const LivreurMyOrdersScreen({super.key});

  @override
  State<LivreurMyOrdersScreen> createState() => _LivreurMyOrdersScreenState();
}

enum _StatusFilter {
  all,
  depotInPrep,    // 1️⃣ DEPOT_EN_COURS_DE_PREPARATION (livreur a pris, prépare)
  depotReady,     // 2️⃣ DEPOT_PRET (livreur a marqué prêt à livrer)
  depot,          // 3️⃣ DEPOT — passage automatique post-REPORTÉ via Hangfire 00:00
  pending,
  inDelivery,
  reported,       // Reporté (couvre aussi les commandes "reportées au dépôt" via Statut.reporte)
  delivered,
  returned,
}

class _LivreurMyOrdersScreenState extends State<LivreurMyOrdersScreen> {
  final TextEditingController _searchCtrl = TextEditingController();
  String _query = '';
  Timer? _debounce;
  _StatusFilter _filter = _StatusFilter.all;

  // Section 2.4 — chips dépôt dynamiques. Si non-null, filtre par
  // depotPassageNumber exact (1, 2, 3, …). Mutuellement exclusif avec
  // _filter (sélectionner un chip Dépôt N remet _filter à all).
  int? _depotFilter;

  bool _selectionMode = false;
  final Set<String> _selectedIds = <String>{};
  bool _launching = false;

  // Re-render périodique : permet aux cards « bloquées » (report partiel)
  // de basculer automatiquement dans la section « Actives » quand l'heure
  // souhaitée est atteinte, sans attendre un refresh réseau.
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _tick?.cancel();
    _debounce?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSearchChanged(String raw) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 220), () {
      if (!mounted) return;
      setState(() => _query = raw.trim().toLowerCase());
    });
  }

  bool _matchesQuery(Delivery d) {
    if (_query.isEmpty) return true;
    final q = _query;
    if (d.doPiece.toLowerCase().contains(q)) return true;
    if (d.ville.toLowerCase().contains(q)) return true;
    if (d.adresse.toLowerCase().contains(q)) return true;
    if ((d.clientDisplay ?? '').toLowerCase().contains(q)) return true;
    if ((d.clientPhone ?? '').toLowerCase().contains(q)) return true;
    return false;
  }

  /// Sous-statut backend : « En préparation au dépôt » — le livreur a pris
  /// le colis depuis le pool et le prépare avant de le marquer prêt à livrer.
  bool _isDepotInPrep(Delivery d) {
    return (d.apiStatus ?? '').toUpperCase() == 'DEPOT_EN_COURS_DE_PREPARATION';
  }

  /// « Au dépôt prêt à livrer » — le livreur a marqué la commande prête.
  /// Peut être sélectionnée pour passer en livraison en lot.
  bool _isDepotReady(Delivery d) {
    return (d.apiStatus ?? '').toUpperCase() == 'DEPOT_PRET';
  }

  /// « Au dépôt » — statut générique, atteint après un cycle REPORTÉ + job
  /// Hangfire 00:00 (REPORTE → DEPOT). Distinct des sous-statuts livreur
  /// précédents (préparation / prêt) pour ne pas les mélanger.
  bool _isDepotPlain(Delivery d) {
    final api = (d.apiStatus ?? '').toUpperCase();
    return d.statut == Statut.depot &&
        api != 'DEPOT_EN_COURS_DE_PREPARATION' &&
        api != 'DEPOT_PRET';
  }

  bool _matchesFilter(Delivery d) {
    // Section 2.4 — filtre par numéro de passage dépôt prend la priorité
    if (_depotFilter != null) {
      return (d.depotPassageNumber ?? 0) == _depotFilter;
    }
    switch (_filter) {
      case _StatusFilter.all:
        return true;
      case _StatusFilter.depotInPrep:
        return _isDepotInPrep(d);
      case _StatusFilter.depotReady:
        return _isDepotReady(d);
      case _StatusFilter.depot:
        return _isDepotPlain(d);
      case _StatusFilter.pending:
        return d.isApiConfirme || d.statut == Statut.confirme;
      case _StatusFilter.inDelivery:
        return d.isInDelivery;
      case _StatusFilter.reported:
        return d.isReported;
      case _StatusFilter.delivered:
        return d.statut == Statut.livre;
      case _StatusFilter.returned:
        return d.statut == Statut.retourne;
    }
  }

  Future<void> _openDetails(Delivery d) async {
    final provider = context.read<DeliveriesProvider>();
    await Navigator.of(context).push(
      PageRouteBuilder(
        transitionDuration: PremiumTokens.normal,
        reverseTransitionDuration: PremiumTokens.fast,
        pageBuilder: (_, __, ___) => ChangeNotifierProvider.value(
          value: provider,
          child: DeliveryDetailsScreen(doPiece: d.doPiece),
        ),
        transitionsBuilder: (_, anim, __, child) {
          final curved =
              CurvedAnimation(parent: anim, curve: Curves.easeOutCubic);
          return FadeTransition(
            opacity: curved,
            child: SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0, 0.05),
                end: Offset.zero,
              ).animate(curved),
              child: child,
            ),
          );
        },
      ),
    );
  }

  void _enterSelection(Delivery d) {
    setState(() {
      _selectionMode = true;
      _selectedIds.add(d.doPiece);
    });
  }

  void _toggleSelected(Delivery d) {
    setState(() {
      if (_selectedIds.contains(d.doPiece)) {
        _selectedIds.remove(d.doPiece);
        if (_selectedIds.isEmpty) _selectionMode = false;
      } else {
        _selectedIds.add(d.doPiece);
      }
    });
  }

  void _exitSelection() {
    setState(() {
      _selectionMode = false;
      _selectedIds.clear();
    });
  }

  void _selectAllVisible(List<Delivery> visible) {
    setState(() {
      _selectionMode = true;
      _selectedIds
        ..clear()
        ..addAll(visible.map((d) => d.doPiece));
    });
  }

  /// Passe une commande de DEPOT_EN_COURS_DE_PREPARATION à DEPOT_PRET.
  /// Appelé depuis le bouton "Marquer prête" affiché sur la card en mode
  /// préparation (et plus tard depuis le batch sélection multi).
  Future<void> _markAsReady(Delivery d) async {
    final provider = context.read<DeliveriesProvider>();
    try {
      await provider.setStatusBatch(
        doPieces: [d.doPiece],
        statut: Statut.depot,
        apiStatusOverride: 'DEPOT_PRET',
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: Colors.green.shade700,
          content: Text('${d.doPiece} marquée prête à livrer.'),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur : $e')),
      );
    }
  }

  /// Batch : passe toutes les sélections DEPOT (plain) à
  /// DEPOT_EN_COURS_DE_PREPARATION. Appelé par le FAB quand la sélection
  /// contient des commandes au dépôt non encore en préparation.
  Future<void> _startPreparationBatch() async {
    if (_launching) return;
    final provider = context.read<DeliveriesProvider>();
    final pieces = provider.myOrders
        .where((d) => _selectedIds.contains(d.doPiece))
        .where(_isDepotPlain)
        .map((d) => d.doPiece)
        .toList();
    if (pieces.isEmpty) return;
    setState(() => _launching = true);
    try {
      final result = await provider.setStatusBatch(
        doPieces: pieces,
        statut: Statut.depot,
        apiStatusOverride: 'DEPOT_EN_COURS_DE_PREPARATION',
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: Colors.amber.shade800,
        content: Text('${result.updated} commande${result.updated > 1 ? "s" : ""} en préparation.'),
      ));
      _exitSelection();
      setState(() => _filter = _StatusFilter.depotInPrep);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Échec : $e')));
    } finally {
      if (mounted) setState(() => _launching = false);
    }
  }

  /// Batch : passe toutes les sélections DEPOT_EN_COURS_DE_PREPARATION
  /// à DEPOT_PRET. Appelé par le FAB quand la sélection contient des
  /// commandes "en préparation".
  Future<void> _markSelectedReadyBatch() async {
    if (_launching) return;
    final provider = context.read<DeliveriesProvider>();
    final inPrep = provider.myOrders
        .where((d) => _selectedIds.contains(d.doPiece))
        .where(_isDepotInPrep)
        .map((d) => d.doPiece)
        .toList();
    if (inPrep.isEmpty) return;

    setState(() => _launching = true);
    try {
      final result = await provider.setStatusBatch(
        doPieces: inPrep,
        statut: Statut.depot,
        apiStatusOverride: 'DEPOT_PRET',
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: Colors.green.shade700,
          content: Text('${result.updated} commande${result.updated > 1 ? 's' : ''} marquée${result.updated > 1 ? 's' : ''} prête${result.updated > 1 ? 's' : ''}.'),
        ),
      );
      _exitSelection();
      setState(() => _filter = _StatusFilter.depotReady);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Échec : $e')),
      );
    } finally {
      if (mounted) setState(() => _launching = false);
    }
  }

  /// Ouvre le bottom sheet de report partiel (même journée).
  /// Si le livreur valide → PATCH heure-souhaitee, la commande passe dans la
  /// section « Bloquées ». Si elle est déjà bloquée → option « Débloquer
  /// maintenant » qui efface le champ.
  Future<void> _openHeureSouhaiteeSheet(Delivery d) async {
    final result = await showHeureSouhaiteeSheet(
      context,
      doPiece: d.doPiece,
      current: d.heureSouhaitee,
    );
    if (result == null || !mounted) return;

    final provider = context.read<DeliveriesProvider>();
    try {
      await provider.setHeureSouhaitee(
        doPiece: d.doPiece,
        heureSouhaitee: result.clearNow ? null : result.heureSouhaitee,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: result.clearNow
              ? const Color(0xFF16A34A)
              : const Color(0xFFEA580C),
          content: Text(
            result.clearNow
                ? '${d.doPiece} débloquée — livraison immédiate.'
                : '${d.doPiece} reportée à ${_formatHour(result.heureSouhaitee!)}.',
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Échec : $e')),
      );
    }
  }

  String _formatHour(DateTime t) {
    final hh = t.hour.toString().padLeft(2, '0');
    final mm = t.minute.toString().padLeft(2, '0');
    return '$hh:$mm';
  }

  Future<void> _launchSelected() async {
    if (_launching) return;
    final provider = context.read<DeliveriesProvider>();

    final ready = provider.myOrders
        .where((d) => _selectedIds.contains(d.doPiece))
        .where(_isDepotReady)
        .map((d) => d.doPiece)
        .toList();

    if (ready.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Aucune commande sélectionnée n\'est prête à passer en livraison.',
          ),
        ),
      );
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text('Lancer la tournée ?'),
        content: Text(
          '${ready.length} commande${ready.length > 1 ? 's' : ''} '
          'va${ready.length > 1 ? 'ont' : ''} passer en livraison.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(ctx, true),
            icon: const Icon(Icons.local_shipping_rounded),
            label: const Text('Lancer'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _launching = true);
    try {
      final result = await provider.setStatusBatch(
        doPieces: ready,
        statut: Statut.enLivraison,
      );

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          margin: const EdgeInsets.all(16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          backgroundColor: Colors.green.shade700,
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: Colors.white),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '${result.updated} commande${result.updated > 1 ? 's' : ''} '
                  'en route !',
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
        ),
      );

      _exitSelection();
      setState(() => _filter = _StatusFilter.inDelivery);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Échec : $e')),
      );
    } finally {
      if (mounted) setState(() => _launching = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<DeliveriesProvider>();
    final scheme = Theme.of(context).colorScheme;
    final base = provider.myOrders;
    final filtered = base
        .where(_matchesFilter)
        .where(_matchesQuery)
        .toList()
      ..sort((a, b) {
        final da = a.dateAffectation ?? DateTime.fromMillisecondsSinceEpoch(0);
        final db = b.dateAffectation ?? DateTime.fromMillisecondsSinceEpoch(0);
        return db.compareTo(da);
      });

    final isInitialLoad = provider.loading && base.isEmpty;
    final counts = _counts(base);

    final selectedReadyCount = base
        .where((d) => _selectedIds.contains(d.doPiece))
        .where(_isDepotReady)
        .length;

    final selectedDepotPlainCount = base
        .where((d) => _selectedIds.contains(d.doPiece))
        .where(_isDepotPlain)
        .length;

    final selectedInPrepCount = base
        .where((d) => _selectedIds.contains(d.doPiece))
        .where(_isDepotInPrep)
        .length;

    final showFab = _selectionMode &&
        (selectedDepotPlainCount > 0 ||
            selectedInPrepCount > 0 ||
            selectedReadyCount > 0);

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: showFab
          ? selectedDepotPlainCount > 0
              ? _BatchFab(
                  label: 'En préparation ($selectedDepotPlainCount)',
                  icon: Icons.inventory_2_rounded,
                  colors: const [Color(0xFFB45309), Color(0xFFF59E0B)],
                  loading: _launching,
                  onPressed: _startPreparationBatch,
                )
              : selectedInPrepCount > 0
                  ? _BatchFab(
                      label: 'Marquer prêt ($selectedInPrepCount)',
                      icon: Icons.task_alt_rounded,
                      colors: const [Color(0xFF059669), Color(0xFF34D399)],
                      loading: _launching,
                      onPressed: _markSelectedReadyBatch,
                    )
                  : _GoLivraisonFab(
                      count: selectedReadyCount,
                      loading: _launching,
                      onPressed: _launchSelected,
                    )
          : null,
      body: RefreshIndicator(
        onRefresh: () => provider.refresh(),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: _selectionMode
                  ? _SelectionHeader(
                      count: _selectedIds.length,
                      depotPlainCount: selectedDepotPlainCount,
                      inPrepCount: selectedInPrepCount,
                      readyCount: selectedReadyCount,
                      onCancel: _exitSelection,
                      onSelectAll: () => _selectAllVisible(filtered),
                    )
                  : _Header(total: counts[_StatusFilter.all] ?? 0),
            ),
            if (!_selectionMode)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                  child: TextField(
                    controller: _searchCtrl,
                    onChanged: _onSearchChanged,
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      hintText: 'Rechercher par numéro, client, ville…',
                      prefixIcon: const Icon(Icons.search_rounded),
                      suffixIcon: _query.isEmpty
                          ? null
                          : IconButton(
                              icon: const Icon(Icons.close_rounded),
                              onPressed: () {
                                _searchCtrl.clear();
                                setState(() => _query = '');
                              },
                            ),
                      filled: true,
                      fillColor:
                          scheme.surfaceContainerHighest.withValues(alpha: 0.45),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide.none,
                      ),
                      isDense: true,
                    ),
                  ),
                ),
              ),
            SliverToBoxAdapter(
              child: SizedBox(
                height: 44,
                child: Builder(builder: (_) {
                  // Section 2.4 — chips dynamiques Dépôt N (sans plafond).
                  // Couleurs : 0=bleu, 1=jaune, 2=orange, 3=rouge foncé, 4+=rouge.
                  final depotNumbers = base
                      .map((d) => d.depotPassageNumber ?? 0)
                      .where((n) => n > 0)
                      .toSet()
                      .toList()
                    ..sort();
                  return ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _filterItems.length + depotNumbers.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (_, i) {
                      if (i < _filterItems.length) {
                        final item = _filterItems[i];
                        final count = counts[item.filter] ?? 0;
                        final selected = _depotFilter == null && _filter == item.filter;
                        return _DepotFilterChip(
                          label: item.label,
                          count: count,
                          tone: item.tone,
                          selected: selected,
                          onTap: () => setState(() {
                            _filter = item.filter;
                            _depotFilter = null;
                          }),
                        );
                      }
                      final depotN = depotNumbers[i - _filterItems.length];
                      final tone = _depotTone(depotN);
                      final count = base
                          .where((d) => (d.depotPassageNumber ?? 0) == depotN)
                          .length;
                      final selected = _depotFilter == depotN;
                      return _DepotFilterChip(
                        label: 'Dépôt $depotN',
                        count: count,
                        tone: tone,
                        selected: selected,
                        onTap: () => setState(() {
                          _depotFilter = selected ? null : depotN;
                          if (!selected) _filter = _StatusFilter.all;
                        }),
                      );
                    },
                  );
                }),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 12)),
            if (isInitialLoad)
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                sliver: SliverList.separated(
                  itemCount: 4,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, __) => const SkeletonOrderCard(),
                ),
              )
            else if (base.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: EmptyView(
                  icon: Icons.check_circle_outline_rounded,
                  title: 'Aucune livraison en cours',
                  subtitle:
                      'Les nouvelles commandes apparaissent automatiquement ici.',
                  ctaLabel: 'Actualiser',
                  onCta: () => provider.refresh(),
                ),
              )
            else if (filtered.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: EmptyView(
                  icon: Icons.filter_alt_off_rounded,
                  title: 'Aucun résultat',
                  subtitle:
                      'Aucune commande ne correspond à ce filtre ou cette recherche.',
                  ctaLabel: 'Réinitialiser',
                  onCta: () {
                    _searchCtrl.clear();
                    setState(() {
                      _query = '';
                      _filter = _StatusFilter.all;
                    });
                  },
                ),
              )
            else
              ..._buildOrderSlivers(
                filtered,
                bottomPadding: showFab ? 96.0 : 24.0,
              ),
          ],
        ),
      ),
    );
  }

  /// Construit les slivers de cartes commandes — avec séparation premium en 2
  /// sections (« Bloquées » au-dessus, « Actives » en-dessous) quand le
  /// filtre courant inclut des commandes EN_LIVRAISON. Les autres filtres
  /// rendent la liste plate inchangée.
  List<Widget> _buildOrderSlivers(
    List<Delivery> filtered, {
    required double bottomPadding,
  }) {
    final showSections = _filter == _StatusFilter.all ||
        _filter == _StatusFilter.inDelivery;

    if (!showSections) {
      return [
        SliverPadding(
          padding: EdgeInsets.fromLTRB(16, 0, 16, bottomPadding),
          sliver: SliverList.separated(
            itemCount: filtered.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, idx) => _buildAnimatedCard(filtered[idx], idx),
          ),
        ),
      ];
    }

    final blocked = filtered.where((d) => d.isPartiallyDeferred).toList();
    final actives = filtered.where((d) => !d.isPartiallyDeferred).toList();

    final slivers = <Widget>[];

    if (blocked.isNotEmpty) {
      slivers.add(SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: _SectionHeader(
            icon: Icons.lock_clock_rounded,
            label: 'Bloquées',
            count: blocked.length,
            tone: const Color(0xFFEA580C),
            subtitle:
                'En attente d\'heure souhaitée. Auto-déblocage à l\'heure dite.',
          ),
        ),
      ));
      slivers.add(SliverPadding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        sliver: SliverList.separated(
          itemCount: blocked.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (_, idx) => _buildAnimatedCard(blocked[idx], idx),
        ),
      ));
    }

    if (actives.isNotEmpty) {
      if (blocked.isNotEmpty) {
        slivers.add(SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: _SectionHeader(
              icon: Icons.local_shipping_rounded,
              label: 'Actives',
              count: actives.length,
              tone: const Color(0xFF6366F1),
            ),
          ),
        ));
      }
      slivers.add(SliverPadding(
        padding: EdgeInsets.fromLTRB(16, 0, 16, bottomPadding),
        sliver: SliverList.separated(
          itemCount: actives.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (_, idx) => _buildAnimatedCard(actives[idx], idx),
        ),
      ));
    }

    return slivers;
  }

  Widget _buildAnimatedCard(Delivery d, int idx) {
    final selected = _selectedIds.contains(d.doPiece);
    final isReady = _isDepotReady(d);
    final isInPrep = _isDepotInPrep(d);
    final isDepotPlain = _isDepotPlain(d);
    final isNewOrder = isDepotPlain &&
        (d.depotPassageNumber == null || d.depotPassageNumber! <= 1);
    final isReportedOrder = d.isReported;
    final canDeferPartially = d.statut == Statut.enLivraison;

    return EntryAnimation(
      duration: const Duration(milliseconds: 320),
      delay: Duration(milliseconds: 40 + idx * 35),
      slide: 12,
      child: _MyOrderCard(
        delivery: d,
        isReady: isReady,
        isInPrep: isInPrep,
        isDepotPlain: isDepotPlain,
        isNewOrder: isNewOrder,
        isReportedOrder: isReportedOrder,
        selectionMode: _selectionMode,
        selected: selected,
        onTap: () {
          if (_selectionMode) {
            _toggleSelected(d);
          } else {
            _openDetails(d);
          }
        },
        onLongPress: (isReady || isInPrep || isDepotPlain) && !_selectionMode
            ? () => _enterSelection(d)
            : null,
        onMarkReady: isInPrep ? () => _markAsReady(d) : null,
        onSetHeureSouhaitee:
            canDeferPartially ? () => _openHeureSouhaiteeSheet(d) : null,
        onEditHeureSouhaitee: d.heureSouhaitee != null
            ? () => _openHeureSouhaiteeSheet(d)
            : null,
        onClearHeureSouhaitee: d.isPartiallyDeferred
            ? () => _clearHeureSouhaitee(d)
            : null,
      ),
    );
  }

  Future<void> _clearHeureSouhaitee(Delivery d) async {
    final provider = context.read<DeliveriesProvider>();
    try {
      await provider.setHeureSouhaitee(
        doPiece: d.doPiece,
        heureSouhaitee: null,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF16A34A),
          content: Text('${d.doPiece} débloquée.'),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Échec : $e')),
      );
    }
  }

  // Section 2.4 — couleur progressive selon le nombre de retours dépôt.
  Color _depotTone(int n) {
    if (n <= 0) return const Color(0xFF1976D2); // bleu
    if (n == 1) return const Color(0xFFFBBF24); // jaune
    if (n == 2) return const Color(0xFFEA580C); // orange
    if (n == 3) return const Color(0xFF991B1B); // rouge foncé
    return const Color(0xFFDC2626); // rouge
  }

  Map<_StatusFilter, int> _counts(List<Delivery> list) {
    int c(_StatusFilter f) => list.where((d) {
          switch (f) {
            case _StatusFilter.all:
              return true;
            case _StatusFilter.depotInPrep:
              return _isDepotInPrep(d);
            case _StatusFilter.depotReady:
              return _isDepotReady(d);
            case _StatusFilter.depot:
              return _isDepotPlain(d);
            case _StatusFilter.pending:
              return d.isApiConfirme || d.statut == Statut.confirme;
            case _StatusFilter.inDelivery:
              return d.isInDelivery;
            case _StatusFilter.reported:
              return d.isReported;
            case _StatusFilter.delivered:
              return d.statut == Statut.livre;
            case _StatusFilter.returned:
              return d.statut == Statut.retourne;
          }
        }).length;
    return {for (final f in _StatusFilter.values) f: c(f)};
  }
}

class _FilterItem {
  final _StatusFilter filter;
  final String label;
  final Color tone;
  const _FilterItem(this.filter, this.label, this.tone);
}

const _filterItems = <_FilterItem>[
  _FilterItem(_StatusFilter.all, 'Toutes', Color(0xFF6366F1)),
  // Les 3 étapes dépôt côté livreur, dans l'ordre du flow :
  _FilterItem(_StatusFilter.depotInPrep, 'En préparation', Color(0xFFB45309)),
  _FilterItem(_StatusFilter.depotReady, 'Au dépôt prêtes', Color(0xFF059669)),
  _FilterItem(_StatusFilter.depot, 'Au dépôt', Color(0xFF4B5563)),
  _FilterItem(_StatusFilter.inDelivery, 'En livraison', Color(0xFF6366F1)),
  _FilterItem(_StatusFilter.reported, 'Reportées', Color(0xFFEA580C)),
  _FilterItem(_StatusFilter.delivered, 'Livrées', Color(0xFF16A34A)),
  _FilterItem(_StatusFilter.returned, 'Retournées', Color(0xFFDC2626)),
];

class _DepotFilterChip extends StatelessWidget {
  final String label;
  final int count;
  final Color tone;
  final bool selected;
  final VoidCallback onTap;

  const _DepotFilterChip({
    required this.label,
    required this.count,
    required this.tone,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            gradient: selected
                ? LinearGradient(
                    colors: [tone, tone.withValues(alpha: 0.78)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  )
                : null,
            color: selected ? null : tone.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: selected ? tone : tone.withValues(alpha: 0.24),
              width: 1,
            ),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: tone.withValues(alpha: 0.32),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: selected ? Colors.white : tone,
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 7, vertical: 1),
                decoration: BoxDecoration(
                  color: selected
                      ? Colors.white.withValues(alpha: 0.25)
                      : tone.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    color: selected ? Colors.white : tone,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// En-tête léger pour séparer visuellement les sections « Bloquées » et
/// « Actives » à l'intérieur de l'onglet « En livraison ». Affiche un point
/// de couleur, le label, le compteur, et un sous-titre optionnel.
class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String label;
  final int count;
  final Color tone;
  final String? subtitle;

  const _SectionHeader({
    required this.icon,
    required this.label,
    required this.count,
    required this.tone,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            margin: const EdgeInsets.only(top: 2),
            decoration: BoxDecoration(
              color: tone.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: tone),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      label,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: tone,
                          ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: tone.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '$count',
                        style: TextStyle(
                          color: tone,
                          fontWeight: FontWeight.w900,
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ],
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle!,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                          fontSize: 11,
                        ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final int total;
  const _Header({required this.total});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Mes livraisons',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  '$total commande${total > 1 ? "s" : ""} au total',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Astuce : appui long sur une commande au dépôt prête pour la sélection multiple.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant.withValues(alpha: 0.78),
                        fontStyle: FontStyle.italic,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SelectionHeader extends StatelessWidget {
  final int count;
  final int depotPlainCount;
  final int inPrepCount;
  final int readyCount;
  final VoidCallback onCancel;
  final VoidCallback onSelectAll;

  const _SelectionHeader({
    required this.count,
    required this.depotPlainCount,
    required this.inPrepCount,
    required this.readyCount,
    required this.onCancel,
    required this.onSelectAll,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: EntryAnimation(
        duration: const Duration(milliseconds: 240),
        slide: 10,
        child: Container(
          padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0EA5E9), Color(0xFF6366F1)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF6366F1).withValues(alpha: 0.32),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.20),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.30)),
                ),
                child: const Icon(Icons.checklist_rounded,
                    color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$count sélectionnée${count > 1 ? 's' : ''}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                      ),
                    ),
                    Text(
                      [
                        if (depotPlainCount > 0) '$depotPlainCount au dépôt',
                        if (inPrepCount > 0) '$inPrepCount en prép.',
                        if (readyCount > 0) '$readyCount prêtes',
                      ].join(' · '),
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.86),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              TextButton.icon(
                onPressed: onSelectAll,
                style: TextButton.styleFrom(
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                ),
                icon: const Icon(Icons.select_all_rounded, size: 18),
                label: const Text('Tout sélectionner'),
              ),
              IconButton(
                tooltip: 'Annuler',
                onPressed: onCancel,
                icon: const Icon(Icons.close_rounded, color: Colors.white),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MyOrderCard extends StatelessWidget {
  final Delivery delivery;
  final bool isReady;
  final bool isInPrep;
  final bool isDepotPlain;
  final bool isNewOrder;
  final bool isReportedOrder;
  final bool selectionMode;
  final bool selected;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;
  final VoidCallback? onMarkReady;

  /// Ouvre le sheet de report partiel (même journée). Visible uniquement
  /// sur les commandes EN_LIVRAISON sans heure souhaitée active.
  final VoidCallback? onSetHeureSouhaitee;

  /// Édition rapide de l'heure souhaitée — affichée sur une card déjà
  /// bloquée pour éviter d'avoir à entrer dans l'écran détail.
  final VoidCallback? onEditHeureSouhaitee;

  /// Glisser-débloquer immédiat : affiche un slide premium quand la commande
  /// est en attente d'heure souhaitée.
  final VoidCallback? onClearHeureSouhaitee;

  const _MyOrderCard({
    required this.delivery,
    required this.isReady,
    required this.isInPrep,
    required this.isDepotPlain,
    required this.isNewOrder,
    required this.isReportedOrder,
    required this.selectionMode,
    required this.selected,
    required this.onTap,
    required this.onLongPress,
    this.onMarkReady,
    this.onSetHeureSouhaitee,
    this.onEditHeureSouhaitee,
    this.onClearHeureSouhaitee,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final d = delivery;
    final isBlocked = d.isPartiallyDeferred;
    final tone = isBlocked
        ? const Color(0xFFEA580C)
        : (isReady ? const Color(0xFF0EA5E9) : scheme.outlineVariant);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOutCubic,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(PremiumTokens.rLg),
        border: Border.all(
          color: selected
              ? const Color(0xFF6366F1)
              : (isBlocked
                  ? const Color(0xFFEA580C).withValues(alpha: 0.4)
                  : tone.withValues(alpha: 0.0)),
          width: selected ? 2 : (isBlocked ? 1 : 0),
        ),
        boxShadow: selected
            ? [
                BoxShadow(
                  color: const Color(0xFF6366F1).withValues(alpha: 0.28),
                  blurRadius: 18,
                  offset: const Offset(0, 6),
                ),
              ]
            : null,
      ),
      child: PremiumCard(
        onTap: onTap,
        onLongPress: onLongPress,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                if (selectionMode)
                  Padding(
                    padding: const EdgeInsets.only(right: 10),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: selected
                            ? const Color(0xFF6366F1)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(7),
                        border: Border.all(
                          color: selected
                              ? const Color(0xFF6366F1)
                              : scheme.outline,
                          width: 2,
                        ),
                      ),
                      child: selected
                          ? const Icon(Icons.check_rounded,
                              size: 16, color: Colors.white)
                          : null,
                    ),
                  ),
                Expanded(
                  child: Text(
                    d.doPiece,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                ),
                StatusPill(
                    statut: d.statut, apiStatus: d.apiStatus, compact: true),
                if ((d.depotPassageNumber ?? 0) > 0) ...[
                  const SizedBox(width: 6),
                  _DepotBadge(n: d.depotPassageNumber!),
                ],
                if (isNewOrder) ...[
                  const SizedBox(width: 6),
                  const _NewBadge(),
                ] else if (isReportedOrder) ...[
                  const SizedBox(width: 6),
                  const _ReportedBadge(),
                ],
                if (d.heureSouhaitee != null) ...[
                  const SizedBox(width: 6),
                  HeureSouhaiteeBadge(
                    heureSouhaitee: d.heureSouhaitee!,
                    compact: true,
                  ),
                ],
              ],
            ),
            const SizedBox(height: 10),
            _iconRow(
              context,
              Icons.person_outline_rounded,
              d.clientDisplay ?? '—',
            ),
            _iconRow(
              context,
              Icons.location_on_outlined,
              _locationLine(d),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Icon(Icons.payments_outlined,
                    size: 16, color: scheme.onSurfaceVariant),
                const SizedBox(width: 6),
                Text(
                  '${d.netAPayer.toStringAsFixed(3)} TND',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const Spacer(),
                if (isReady && !selectionMode)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0EA5E9).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.warehouse_rounded,
                            size: 13, color: Color(0xFF0EA5E9)),
                        SizedBox(width: 4),
                        Text(
                          'Au dépôt',
                          style: TextStyle(
                            color: Color(0xFF0EA5E9),
                            fontWeight: FontWeight.w800,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  )
                else if (!selectionMode)
                  Icon(Icons.chevron_right_rounded,
                      color: scheme.onSurfaceVariant),
              ],
            ),
            // Bouton "Prête" visible uniquement quand le colis est en
            // préparation au dépôt (DEPOT_EN_COURS_DE_PREPARATION).
            if (isInPrep && !selectionMode && onMarkReady != null) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: onMarkReady,
                  icon: const Icon(Icons.task_alt_rounded, size: 18),
                  label: const Text(
                    'Marquer prête',
                    style: TextStyle(fontWeight: FontWeight.w900),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    elevation: 0,
                  ),
                ),
              ),
            ],
            // Card en report partiel actif — panneau premium qui réplique
            // l'écran détail : affichage du blocage + bouton « Modifier
            // l'heure » + slider de débloquage immédiat. Permet au livreur
            // de tout faire depuis la liste sans entrer dans la card détail.
            if (isBlocked && !selectionMode && onClearHeureSouhaitee != null) ...[
              const SizedBox(height: 12),
              _BlockedPanel(
                heureSouhaitee: d.heureSouhaitee!,
                onEdit: onEditHeureSouhaitee,
                onClear: onClearHeureSouhaitee!,
              ),
            ],
            // Petit bouton outline pour ouvrir le sheet d'édition de l'heure
            // — visible aussi sur les commandes non bloquées EN_LIVRAISON
            // pour faciliter la pose d'un nouveau report partiel.
            if (!selectionMode &&
                !isBlocked &&
                onSetHeureSouhaitee != null &&
                d.statut == Statut.enLivraison) ...[
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onSetHeureSouhaitee,
                  icon: const Icon(Icons.schedule_rounded, size: 16),
                  label: const Text(
                    'Reporter dans la journée',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFEA580C),
                    side: const BorderSide(
                      color: Color(0xFFEA580C),
                      width: 1,
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _iconRow(BuildContext context, IconData icon, String value) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: scheme.onSurfaceVariant),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }

  String _locationLine(Delivery d) {
    final parts = <String>[
      if (d.adresse.trim().isNotEmpty) d.adresse.trim(),
      if (d.ville.trim().isNotEmpty) d.ville.trim(),
    ];
    return parts.isEmpty ? '—' : parts.join(' • ');
  }
}

/// Section 2.4 — petit badge "Dépôt N" coloré sur chaque carte commande.
class _DepotBadge extends StatelessWidget {
  final int n;
  const _DepotBadge({required this.n});

  @override
  Widget build(BuildContext context) {
    final color = n == 1
        ? const Color(0xFFFBBF24)
        : n == 2
            ? const Color(0xFFEA580C)
            : n == 3
                ? const Color(0xFF991B1B)
                : const Color(0xFFDC2626);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.4), width: 1),
      ),
      child: Text(
        'Dépôt $n',
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _GoLivraisonFab extends StatelessWidget {
  final int count;
  final bool loading;
  final VoidCallback onPressed;

  const _GoLivraisonFab({
    required this.count,
    required this.loading,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return EntryScale(
      duration: const Duration(milliseconds: 320),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          gradient: const LinearGradient(
            colors: [Color(0xFF16A34A), Color(0xFF0EA5E9)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0EA5E9).withValues(alpha: 0.45),
              blurRadius: 22,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(28),
            onTap: loading ? null : onPressed,
            child: Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (loading)
                    const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.4,
                        color: Colors.white,
                      ),
                    )
                  else
                    const Icon(Icons.local_shipping_rounded,
                        color: Colors.white, size: 22),
                  const SizedBox(width: 10),
                  Text(
                    loading
                        ? 'Lancement…'
                        : 'Lancer livraison ($count)',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 15,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BatchFab extends StatelessWidget {
  final String label;
  final IconData icon;
  final List<Color> colors;
  final bool loading;
  final VoidCallback onPressed;

  const _BatchFab({
    required this.label,
    required this.icon,
    required this.colors,
    required this.loading,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return EntryScale(
      duration: const Duration(milliseconds: 320),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          gradient: LinearGradient(
            colors: colors,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
              color: colors.first.withValues(alpha: 0.45),
              blurRadius: 22,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(28),
            onTap: loading ? null : onPressed,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (loading)
                    const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2.4, color: Colors.white),
                    )
                  else
                    Icon(icon, color: Colors.white, size: 22),
                  const SizedBox(width: 10),
                  Text(
                    loading ? 'Mise à jour…' : label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 15,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NewBadge extends StatelessWidget {
  const _NewBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF6366F1).withValues(alpha: 0.40),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.fiber_new_rounded, color: Colors.white, size: 13),
          SizedBox(width: 3),
          Text(
            'Nouvelle',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 11,
              letterSpacing: 0.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _ReportedBadge extends StatelessWidget {
  const _ReportedBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFEA580C), Color(0xFFF97316)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFEA580C).withValues(alpha: 0.38),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.event_repeat_rounded, color: Colors.white, size: 13),
          SizedBox(width: 3),
          Text(
            'Reportée',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 11,
              letterSpacing: 0.4,
            ),
          ),
        ],
      ),
    );
  }
}

/// Panneau premium affiché sur une card bloquée (heure souhaitée future).
/// Réplique en miniature le `_HeureSouhaiteePanel` de l'écran détail pour
/// que le livreur puisse modifier l'heure ou débloquer sans changer
/// d'écran. La hiérarchie visuelle est :
///   1. Bandeau orange contenant l'icône + libellé + badge compte à rebours
///   2. Bouton outline « Modifier l'heure » (édition rapide, faible risque)
///   3. Slider de débloquage immédiat (geste explicite, évite les accidents
///      pendant la conduite / le scan)
class _BlockedPanel extends StatelessWidget {
  final DateTime heureSouhaitee;
  final VoidCallback? onEdit;
  final VoidCallback onClear;

  const _BlockedPanel({
    required this.heureSouhaitee,
    required this.onEdit,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    const tone = Color(0xFFEA580C);
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: tone.withValues(alpha: 0.28), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 26,
                height: 26,
                decoration: BoxDecoration(
                  color: tone.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.lock_clock_rounded,
                    size: 15, color: tone),
              ),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Reportée dans la journée',
                  style: TextStyle(
                    color: tone,
                    fontWeight: FontWeight.w900,
                    fontSize: 12.5,
                  ),
                ),
              ),
              HeureSouhaiteeBadge(heureSouhaitee: heureSouhaitee),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Débloquage auto à l\'heure dite, ou geste rapide ci-dessous.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  fontSize: 11,
                ),
          ),
          if (onEdit != null) ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onEdit,
                icon: const Icon(Icons.edit_calendar_rounded, size: 15),
                label: const Text(
                  'Modifier l\'heure',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: tone,
                  side: const BorderSide(color: tone, width: 1),
                  padding: const EdgeInsets.symmetric(vertical: 7),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ),
          ],
          const SizedBox(height: 8),
          _UnblockSlider(onConfirmed: onClear),
        ],
      ),
    );
  }
}

/// Slide-to-confirm premium qui débloque une commande en report partiel.
/// Le livreur doit glisser le pouce jusqu'au bout pour confirmer — évite
/// les déclenchements accidentels pendant qu'il conduit / scanne.
class _UnblockSlider extends StatefulWidget {
  final VoidCallback onConfirmed;

  const _UnblockSlider({required this.onConfirmed});

  @override
  State<_UnblockSlider> createState() => _UnblockSliderState();
}

class _UnblockSliderState extends State<_UnblockSlider> {
  double _dragX = 0;
  bool _fired = false;

  static const double _trackHeight = 44;
  static const double _thumbSize = 38;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (ctx, c) {
        final maxX = c.maxWidth - _thumbSize - 4;
        final progress = maxX <= 0 ? 0.0 : (_dragX / maxX).clamp(0.0, 1.0);

        return Container(
          height: _trackHeight,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            gradient: LinearGradient(
              colors: [
                Color.lerp(
                  const Color(0xFFEA580C).withValues(alpha: 0.18),
                  const Color(0xFF16A34A).withValues(alpha: 0.20),
                  progress,
                )!,
                Color.lerp(
                  const Color(0xFFEA580C).withValues(alpha: 0.10),
                  const Color(0xFF16A34A).withValues(alpha: 0.14),
                  progress,
                )!,
              ],
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ),
            border: Border.all(
              color: Color.lerp(
                const Color(0xFFEA580C).withValues(alpha: 0.45),
                const Color(0xFF16A34A).withValues(alpha: 0.5),
                progress,
              )!,
              width: 1,
            ),
          ),
          child: Stack(
            children: [
              Positioned.fill(
                child: Center(
                  child: AnimatedOpacity(
                    duration: const Duration(milliseconds: 150),
                    opacity: 1 - progress * 0.9,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.lock_open_rounded,
                          color: Color.lerp(
                            const Color(0xFFEA580C),
                            const Color(0xFF16A34A),
                            progress,
                          ),
                          size: 16,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          progress > 0.85
                              ? 'Relâcher pour débloquer'
                              : 'Glisser pour débloquer',
                          style: TextStyle(
                            color: Color.lerp(
                              const Color(0xFFEA580C),
                              const Color(0xFF16A34A),
                              progress,
                            ),
                            fontWeight: FontWeight.w900,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 2 + _dragX,
                top: 2,
                child: GestureDetector(
                  onHorizontalDragUpdate: (det) {
                    setState(() {
                      _dragX = (_dragX + det.delta.dx).clamp(0.0, maxX);
                    });
                  },
                  onHorizontalDragEnd: (_) {
                    if (_dragX >= maxX * 0.92 && !_fired) {
                      _fired = true;
                      widget.onConfirmed();
                    } else {
                      setState(() => _dragX = 0);
                    }
                  },
                  child: Container(
                    width: _thumbSize,
                    height: _thumbSize,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [
                          Color.lerp(
                            const Color(0xFFEA580C),
                            const Color(0xFF16A34A),
                            progress,
                          )!,
                          Color.lerp(
                            const Color(0xFFEA580C).withValues(alpha: 0.78),
                            const Color(0xFF16A34A).withValues(alpha: 0.85),
                            progress,
                          )!,
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Color.lerp(
                            const Color(0xFFEA580C),
                            const Color(0xFF16A34A),
                            progress,
                          )!
                              .withValues(alpha: 0.4),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.chevron_right_rounded,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
