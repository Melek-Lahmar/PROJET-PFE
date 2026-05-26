import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/realtime_service.dart';
import '../../data/reclamation_motifs.dart';
import '../../models/client_claim.dart';
import '../../state/confirmatrice_claims_provider.dart';
import '../widgets/claims/client_claim_status_badge.dart';
import '../widgets/claims/demande_color_indicator.dart';
import '../widgets/premium/animated_entry.dart';
import 'confirmatrice_claim_details_screen.dart';

// ─── Palette centralisée ────────────────────────────────────────────────────
class _AppColors {
  static const background   = Color(0xFFF5F6FA);
  static const surface      = Color(0xFFFFFFFF);
  static const primary      = Color(0xFF4F6AF0);       // indigo doux
  static const primaryLight = Color(0xFFEEF1FD);
  static const accent       = Color(0xFFFF6B6B);       // corail
  static const accentLight  = Color(0xFFFFEEEE);
  static const success      = Color(0xFF34C98B);
  static const successLight = Color(0xFFE6FAF3);
  static const text         = Color(0xFF1A1D2E);
  static const textMuted    = Color(0xFF8A8FA8);
  static const border       = Color(0xFFE8EAF2);
  static const shadow       = Color(0x14000000);
}

/// Écran liste confirmatrice — Réclamations ou Demandes.
class ConfirmatriceClaimsScreen extends StatefulWidget {
  final String? lockedTypeCas;
  const ConfirmatriceClaimsScreen({super.key, this.lockedTypeCas});

  @override
  State<ConfirmatriceClaimsScreen> createState() =>
      _ConfirmatriceClaimsScreenState();
}

class _ConfirmatriceClaimsScreenState extends State<ConfirmatriceClaimsScreen>
    with SingleTickerProviderStateMixin {
  bool _initialized = false;
  late TabController _tab;
  final TextEditingController _searchCtrl = TextEditingController();
  String _query = '';
  Timer? _debounce;
  final List<StreamSubscription<dynamic>> _realtimeSubs = [];

  bool get _isLocked => widget.lockedTypeCas != null;
  String get _lockedType => widget.lockedTypeCas!.toUpperCase();

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
    _tab.addListener(_onTabChanged);
  }

  @override
  void dispose() {
    for (final s in _realtimeSubs) {
      s.cancel();
    }
    _realtimeSubs.clear();
    _tab.removeListener(_onTabChanged);
    _tab.dispose();
    _debounce?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSearchChanged(String raw) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 250), () {
      if (!mounted) return;
      setState(() => _query = raw.trim().toLowerCase());
    });
  }

  List<ClientClaim> _applySearch(List<ClientClaim> list) {
    if (_query.isEmpty) return list;
    final q = _query;
    return list.where((c) {
      if (c.codeReclamation.toLowerCase().contains(q)) return true;
      if (c.doPiece.toLowerCase().contains(q)) return true;
      if ((c.clientDisplay ?? '').toLowerCase().contains(q)) return true;
      if ((c.clientPhone ?? '').toLowerCase().contains(q)) return true;
      if ((c.clientAddress ?? '').toLowerCase().contains(q)) return true;
      if ((c.clientGouvernorat ?? '').toLowerCase().contains(q)) return true;
      if (labelForAnyMotif(c.motif).toLowerCase().contains(q)) return true;
      return false;
    }).toList();
  }

  void _onTabChanged() {
    if (_tab.indexIsChanging) return;
    final tabs = ['a-traiter', 'en-attente-client', 'historique'];
    context.read<ConfirmatriceClaimsProvider>().setTab(
      tabs[_tab.index],
      typeCas: _isLocked ? _lockedType : null,
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    _initialized = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final provider = context.read<ConfirmatriceClaimsProvider>();
      if (_isLocked) {
        provider.refreshFor(_lockedType);
      } else {
        provider.refresh();
      }

      // Rafraîchir la liste automatiquement quand un nouveau cas arrive ou
      // est réattribué via SignalR — sans attendre un pull-to-refresh manuel.
      final realtime = context.read<RealtimeService>();
      _realtimeSubs.add(realtime.nouveauCas.listen((_) {
        if (mounted) _refresh();
      }));
      _realtimeSubs.add(realtime.casReattribue.listen((_) {
        if (mounted) _refresh();
      }));
      _realtimeSubs.add(realtime.statutCasChange.listen((_) {
        if (mounted) _refresh();
      }));
    });
  }

  Future<void> _refresh() {
    final provider = context.read<ConfirmatriceClaimsProvider>();
    return _isLocked ? provider.refreshFor(_lockedType) : provider.refresh();
  }

  Future<void> _openDetails(ClientClaim claim) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ChangeNotifierProvider.value(
          value: context.read<ConfirmatriceClaimsProvider>(),
          child: ConfirmatriceClaimDetailsScreen(claimId: claim.id),
        ),
      ),
    );
    if (!mounted) return;
    await _refresh();
  }

  void _openFilters() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _FiltersSheet(
        initial: context.read<ConfirmatriceClaimsProvider>().filter,
        lockedTypeCas: widget.lockedTypeCas,
        onApply: (f) {
          context.read<ConfirmatriceClaimsProvider>().setFilter(
            f,
            typeCas: _isLocked ? _lockedType : null,
          );
          Navigator.of(ctx).pop();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ConfirmatriceClaimsProvider>();
    final rawItems = _isLocked ? provider.listFor(_lockedType) : provider.items;
    final items = _applySearch(rawItems);
    final filter = provider.filter;
    final isDemandeList = _isLocked && _lockedType == 'DEMANDE';

    return Scaffold(
      backgroundColor: _AppColors.background,
      body: Column(
        children: [
          // ── Tab bar stylisée ────────────────────────────────────────────
          Container(
            color: _AppColors.surface,
            child: TabBar(
              controller: _tab,
              labelColor: _AppColors.primary,
              unselectedLabelColor: _AppColors.textMuted,
              indicatorColor: _AppColors.primary,
              indicatorWeight: 3,
              labelStyle: const TextStyle(
                  fontWeight: FontWeight.w700, fontSize: 13),
              unselectedLabelStyle: const TextStyle(
                  fontWeight: FontWeight.w500, fontSize: 13),
              tabs: const [
                Tab(text: 'À traiter'),
                Tab(text: 'En attente'),
                Tab(text: 'Historique'),
              ],
            ),
          ),

          // ── Barre de recherche ──────────────────────────────────────────
          Container(
            color: _AppColors.surface,
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
            child: TextField(
              controller: _searchCtrl,
              onChanged: _onSearchChanged,
              textInputAction: TextInputAction.search,
              style: const TextStyle(
                  fontSize: 14, color: _AppColors.text),
              decoration: InputDecoration(
                hintText: 'Numéro, client, ville, motif…',
                hintStyle: const TextStyle(
                    color: _AppColors.textMuted, fontSize: 14),
                prefixIcon: const Icon(Icons.search_rounded,
                    color: _AppColors.textMuted, size: 20),
                suffixIcon: _query.isEmpty
                    ? null
                    : IconButton(
                  icon: const Icon(Icons.close_rounded,
                      size: 18, color: _AppColors.textMuted),
                  onPressed: () {
                    _searchCtrl.clear();
                    setState(() => _query = '');
                  },
                ),
                filled: true,
                fillColor: _AppColors.background,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide:
                  const BorderSide(color: _AppColors.border, width: 1),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(
                      color: _AppColors.primary, width: 1.5),
                ),
              ),
            ),
          ),

          // ── Barre actions (filtre / toggle / refresh) ───────────────────
          Container(
            color: _AppColors.surface,
            padding:
            const EdgeInsets.fromLTRB(14, 0, 14, 12),
            child: Row(
              children: [
                // Bouton filtres
                GestureDetector(
                  onTap: _openFilters,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 9),
                    decoration: BoxDecoration(
                      color: filter.isEmpty
                          ? _AppColors.background
                          : _AppColors.primaryLight,
                      border: Border.all(
                        color: filter.isEmpty
                            ? _AppColors.border
                            : _AppColors.primary,
                        width: 1.2,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.tune_rounded,
                            size: 16,
                            color: filter.isEmpty
                                ? _AppColors.textMuted
                                : _AppColors.primary),
                        const SizedBox(width: 6),
                        Text(
                          filter.isEmpty
                              ? 'Filtres'
                              : 'Filtres (${_activeCount(filter)})',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: filter.isEmpty
                                ? _AppColors.text
                                : _AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const Spacer(),

                // Toggle "Tous les gouvernorats"
                Row(
                  children: [
                    Text(
                      'Tous',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: provider.crossGouvernorat
                            ? _AppColors.primary
                            : _AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Transform.scale(
                      scale: 0.85,
                      child: Switch(
                        value: provider.crossGouvernorat,
                        activeColor: _AppColors.primary,
                        onChanged: (v) => provider.setCrossGouvernorat(
                          v,
                          typeCas: _isLocked ? _lockedType : null,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 8),

                // Bouton refresh
                GestureDetector(
                  onTap: _refresh,
                  child: Container(
                    padding: const EdgeInsets.all(9),
                    decoration: BoxDecoration(
                      color: _AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.refresh_rounded,
                        color: _AppColors.primary, size: 20),
                  ),
                ),
              ],
            ),
          ),

          // Séparateur
          Container(height: 1, color: _AppColors.border),

          // ── Liste ───────────────────────────────────────────────────────
          Expanded(
            child: RefreshIndicator(
              color: _AppColors.primary,
              onRefresh: _refresh,
              child: Builder(builder: (context) {
                if (provider.loading && items.isEmpty) {
                  return const Center(
                    child: CircularProgressIndicator(
                        color: _AppColors.primary),
                  );
                }
                if (items.isEmpty) {
                  return ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(32),
                    children: [
                      const SizedBox(height: 60),
                      Container(
                        padding: const EdgeInsets.all(28),
                        decoration: BoxDecoration(
                          color: _AppColors.primaryLight,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.inbox_outlined,
                            size: 56, color: _AppColors.primary),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        isDemandeList
                            ? 'Aucune demande'
                            : (_isLocked
                            ? 'Aucune réclamation'
                            : 'Aucun cas'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: _AppColors.text,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Aucun élément pour les filtres actuels.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: 14, color: _AppColors.textMuted),
                      ),
                    ],
                  );
                }

                return ListView.separated(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 16),
                  itemCount: items.length,
                  separatorBuilder: (_, __) =>
                  const SizedBox(height: 10),
                  itemBuilder: (_, idx) {
                    final c = items[idx];
                    return EntryAnimation(
                      duration: const Duration(milliseconds: 320),
                      delay: Duration(milliseconds: 40 + idx * 35),
                      slide: 12,
                      child: _ClaimCard(
                        claim: c,
                        showDemandeColor:
                        isDemandeList && c.visibleClient,
                        onTap: () => _openDetails(c),
                      ),
                    );
                  },
                );
              }),
            ),
          ),
        ],
      ),
    );
  }

  int _activeCount(ConfirmatriceClaimsFilter f) {
    var n = 0;
    if (f.statut != null) n++;
    if (f.source != null) n++;
    if (f.typeCas != null && !_isLocked) n++;
    if (f.motif != null) n++;
    if (f.doPiece != null) n++;
    if (f.fromDate != null) n++;
    if (f.toDate != null) n++;
    return n;
  }
}

// ─── Carte de réclamation ────────────────────────────────────────────────────
class _ClaimCard extends StatelessWidget {
  final ClientClaim claim;
  final bool showDemandeColor;
  final VoidCallback onTap;

  const _ClaimCard({
    required this.claim,
    required this.showDemandeColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isLivreur = claim.isFromLivreur;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: _AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: _AppColors.border, width: 1),
          boxShadow: const [
            BoxShadow(
              color: _AppColors.shadow,
              blurRadius: 12,
              offset: Offset(0, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Ligne 1 : code + badge statut ──────────────────────────
            Row(
              children: [
                // Icône source colorée
                Container(
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(
                    color: isLivreur
                        ? const Color(0xFFEEF4FF)
                        : _AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    isLivreur
                        ? Icons.local_shipping_outlined
                        : Icons.person_outline,
                    size: 16,
                    color: isLivreur
                        ? const Color(0xFF5B8DEF)
                        : _AppColors.primary,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    claim.codeReclamation,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                      color: _AppColors.text,
                    ),
                  ),
                ),
                ClientClaimStatusBadge(status: claim.statut),
              ],
            ),

            const SizedBox(height: 12),
            Container(height: 1, color: _AppColors.border),
            const SizedBox(height: 12),

            // ── Ligne 2 : commande + motif ──────────────────────────────
            Row(
              children: [
                _InfoPill(
                  icon: Icons.inventory_2_outlined,
                  label: claim.doPiece,
                  bgColor: _AppColors.background,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _InfoPill(
                    icon: Icons.category_outlined,
                    label: labelForAnyMotif(claim.motif),
                    bgColor: _AppColors.background,
                  ),
                ),
              ],
            ),

            if (claim.clientDisplay != null) ...[
              const SizedBox(height: 8),
              _InfoPill(
                icon: Icons.person_outline,
                label: claim.clientDisplay!,
                bgColor: _AppColors.background,
                fullWidth: true,
              ),
            ],

            if (claim.tentativesCount > 0) ...[
              const SizedBox(height: 8),
              _InfoPill(
                icon: Icons.replay_rounded,
                label:
                '${claim.tentativesCount}/3 tentative${claim.tentativesCount > 1 ? 's' : ''}',
                bgColor: claim.tentativesCount >= 3
                    ? _AppColors.accentLight
                    : _AppColors.successLight,
                textColor: claim.tentativesCount >= 3
                    ? _AppColors.accent
                    : _AppColors.success,
              ),
            ],

            // Badge premium : le client a soumis des modifications via la
            // réponse à la demande (motif ADRESSE_INCORRECTE ou NUMERO_INCORRECT).
            if (claim.hasAddressChange || claim.hasPhoneChange) ...[
              const SizedBox(height: 8),
              _ClientChangeBadge(
                hasAddress: claim.hasAddressChange,
                hasPhone: claim.hasPhoneChange,
              ),
            ] else if (claim.isDemande &&
                _expectsClientReply(claim.motif)) ...[
              const SizedBox(height: 8),
              const _ClientPendingBadge(),
            ],

            if (showDemandeColor) ...[
              const SizedBox(height: 12),
              DemandeColorIndicator(statut: claim.statut, compact: true),
            ],

            // ── Description ─────────────────────────────────────────────
            const SizedBox(height: 12),
            Text(
              claim.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12,
                color: _AppColors.textMuted,
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Motifs DEMANDE qui attendent une réponse modifiante du client
/// (adresse incorrecte / numéro incorrect). Utilisé pour afficher
/// "En attente de la réponse du client" tant que rien n'est soumis.
bool _expectsClientReply(String motif) {
  final m = motif.trim().toUpperCase();
  return m == 'ADRESSE_INCORRECTE' || m == 'NUMERO_INCORRECT';
}

// ─── Badge premium : le client a modifié son adresse / téléphone ───────────
class _ClientChangeBadge extends StatelessWidget {
  final bool hasAddress;
  final bool hasPhone;
  const _ClientChangeBadge({required this.hasAddress, required this.hasPhone});

  @override
  Widget build(BuildContext context) {
    final items = <_BadgeSpec>[];
    if (hasAddress) {
      items.add(const _BadgeSpec(
        icon: Icons.edit_location_alt_rounded,
        label: 'Adresse modifiée',
        gradient: LinearGradient(
          colors: [Color(0xFF22C55E), Color(0xFF16A34A)],
        ),
      ));
    }
    if (hasPhone) {
      items.add(const _BadgeSpec(
        icon: Icons.phone_in_talk_rounded,
        label: 'Téléphone modifié',
        gradient: LinearGradient(
          colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
        ),
      ));
    }
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: items
          .map((s) => Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  gradient: s.gradient,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: s.gradient.colors.first.withOpacity(0.30),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(s.icon, size: 13, color: Colors.white),
                    const SizedBox(width: 5),
                    Text(
                      s.label,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.2,
                      ),
                    ),
                  ],
                ),
              ))
          .toList(),
    );
  }
}

class _BadgeSpec {
  final IconData icon;
  final String label;
  final LinearGradient gradient;
  const _BadgeSpec({
    required this.icon,
    required this.label,
    required this.gradient,
  });
}

// ─── Badge premium : demande envoyée, en attente de réponse client ─────────
class _ClientPendingBadge extends StatelessWidget {
  const _ClientPendingBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFB923C), Color(0xFFF97316)],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFF97316).withOpacity(0.30),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.hourglass_top_rounded, size: 13, color: Colors.white),
          SizedBox(width: 5),
          Text(
            'En attente du client',
            style: TextStyle(
              color: Colors.white,
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Pill d'info (remplace _Chip) ────────────────────────────────────────────
class _InfoPill extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color bgColor;
  final Color? textColor;
  final bool fullWidth;

  const _InfoPill({
    required this.icon,
    required this.label,
    required this.bgColor,
    this.textColor,
    this.fullWidth = false,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveTextColor = textColor ?? _AppColors.text;
    return Container(
      width: fullWidth ? double.infinity : null,
      padding:
      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _AppColors.border, width: 1),
      ),
      child: Row(
        mainAxisSize: fullWidth ? MainAxisSize.max : MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: effectiveTextColor.withOpacity(0.7)),
          const SizedBox(width: 5),
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: effectiveTextColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Feuille de filtres ───────────────────────────────────────────────────────
class _FiltersSheet extends StatefulWidget {
  final ConfirmatriceClaimsFilter initial;
  final String? lockedTypeCas;
  final ValueChanged<ConfirmatriceClaimsFilter> onApply;

  const _FiltersSheet({
    required this.initial,
    required this.lockedTypeCas,
    required this.onApply,
  });

  @override
  State<_FiltersSheet> createState() => _FiltersSheetState();
}

class _FiltersSheetState extends State<_FiltersSheet> {
  late ConfirmatriceClaimsFilter f;
  final _pieceCtrl = TextEditingController();

  static const _statuts = [
    'ENVOYEE',
    'EN_COURS_DE_TRAITEMENT',
    'CLOTUREE',
    'REFUSEE'
  ];
  static const _sources = ['CLIENT', 'LIVREUR'];

  bool get _isLocked => widget.lockedTypeCas != null;

  @override
  void initState() {
    super.initState();
    f = widget.initial;
    _pieceCtrl.text = f.doPiece ?? '';
  }

  @override
  void dispose() {
    _pieceCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: _AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: ListView(
        shrinkWrap: true,
        children: [
          // Handle bar
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: _AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Titre
          Row(
            children: [
              const Text(
                'Filtres',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: _AppColors.text,
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: () {
                  setState(() {
                    f = ConfirmatriceClaimsFilter(
                      typeCas:
                      _isLocked ? widget.lockedTypeCas : null,
                    );
                    _pieceCtrl.clear();
                  });
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _AppColors.accentLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text(
                    'Réinitialiser',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: _AppColors.accent,
                    ),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // ── Statut ───────────────────────────────────────────────────
          _SectionLabel('Statut'),
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 8, children: [
            _FilterChip(
              label: 'Tous',
              selected: f.statut == null,
              onTap: () =>
                  setState(() => f = f.copyWith(clearStatut: true)),
            ),
            for (final s in _statuts)
              _FilterChip(
                label: _labelForStatut(s),
                selected: f.statut == s,
                onTap: () =>
                    setState(() => f = f.copyWith(statut: s)),
              ),
          ]),

          // ── Type (masqué si verrouillé) ──────────────────────────────
          if (!_isLocked) ...[
            const SizedBox(height: 20),
            _SectionLabel('Type'),
            const SizedBox(height: 10),
            Wrap(spacing: 8, runSpacing: 8, children: [
              _FilterChip(
                label: 'Tous',
                selected: f.typeCas == null,
                onTap: () =>
                    setState(() => f = f.copyWith(clearTypeCas: true)),
              ),
              _FilterChip(
                label: 'Réclamation',
                selected: f.typeCas == 'RECLAMATION',
                onTap: () => setState(
                        () => f = f.copyWith(typeCas: 'RECLAMATION')),
              ),
              _FilterChip(
                label: 'Demande',
                selected: f.typeCas == 'DEMANDE',
                onTap: () =>
                    setState(() => f = f.copyWith(typeCas: 'DEMANDE')),
              ),
            ]),
          ],

          // ── Source ───────────────────────────────────────────────────
          // 1.C — Filtre Source masqué quand l'onglet verrouille le type :
          // une RECLAMATION vient toujours du CLIENT et une DEMANDE toujours
          // du LIVREUR — le filtre est inutile dans ce contexte.
          if (!_isLocked) ...[
            const SizedBox(height: 20),
            _SectionLabel('Source'),
            const SizedBox(height: 10),
            Wrap(spacing: 8, runSpacing: 8, children: [
              _FilterChip(
                label: 'Tous',
                selected: f.source == null,
                onTap: () =>
                    setState(() => f = f.copyWith(clearSource: true)),
              ),
              for (final s in _sources)
                _FilterChip(
                  label: s == 'CLIENT' ? 'Client' : 'Livreur',
                  selected: f.source == s,
                  onTap: () =>
                      setState(() => f = f.copyWith(source: s)),
                ),
            ]),
          ],

          // ── Commande ─────────────────────────────────────────────────
          const SizedBox(height: 20),
          _SectionLabel('Commande'),
          const SizedBox(height: 10),
          TextField(
            controller: _pieceCtrl,
            style: const TextStyle(
                fontSize: 14, color: _AppColors.text),
            decoration: InputDecoration(
              hintText: 'Ex: BL26040819463',
              hintStyle: const TextStyle(
                  color: _AppColors.textMuted, fontSize: 13),
              filled: true,
              fillColor: _AppColors.background,
              contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14, vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide:
                const BorderSide(color: _AppColors.border, width: 1),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(
                    color: _AppColors.primary, width: 1.5),
              ),
            ),
          ),

          const SizedBox(height: 28),

          // ── Bouton appliquer ─────────────────────────────────────────
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                final piece = _pieceCtrl.text.trim();
                var applied = f.copyWith(
                  doPiece: piece.isEmpty ? null : piece,
                  clearDoPiece: piece.isEmpty,
                );
                if (_isLocked && applied.typeCas == null) {
                  applied =
                      applied.copyWith(typeCas: widget.lockedTypeCas);
                }
                widget.onApply(applied);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: _AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              child: const Text(
                'Appliquer les filtres',
                style: TextStyle(
                    fontSize: 15, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _labelForStatut(String s) {
    switch (s) {
      case 'ENVOYEE':
        return 'Envoyée';
      case 'EN_COURS_DE_TRAITEMENT':
        return 'En cours';
      case 'CLOTUREE':
        return 'Clôturée';
      case 'REFUSEE':
        return 'Refusée';
      default:
        return s;
    }
  }
}

// ─── Widgets utilitaires ─────────────────────────────────────────────────────
class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w800,
        color: _AppColors.textMuted,
        letterSpacing: 0.8,
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding:
        const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? _AppColors.primary : _AppColors.background,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color:
            selected ? _AppColors.primary : _AppColors.border,
            width: 1.2,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color:
            selected ? Colors.white : _AppColors.text,
          ),
        ),
      ),
    );
  }
}
