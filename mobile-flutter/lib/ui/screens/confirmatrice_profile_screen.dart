import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/confirmatrice_status.dart';
import '../../state/auth_provider.dart';
import '../../state/confirmatrice_status_provider.dart';
import '../../state/notification_preferences.dart';
import 'confirmatrice/workflow_diagram_screen.dart';

/// Phase 9 — Section Profil : identité, pause/resume, stats et état online.
/// Phase 3A — Fondation : `IsInPause`, `IsOnline` et `LastActivityAt` sont
/// déjà exposés par le backend ; cette UI ne fait que les piloter.
class ConfirmatriceProfileScreen extends StatefulWidget {
  const ConfirmatriceProfileScreen({super.key});

  @override
  State<ConfirmatriceProfileScreen> createState() =>
      _ConfirmatriceProfileScreenState();
}

class _ConfirmatriceProfileScreenState
    extends State<ConfirmatriceProfileScreen> {
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    _initialized = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<ConfirmatriceStatusProvider>().refresh();
    });
  }

  Future<void> _togglePause(bool wantsPause) async {
    final provider = context.read<ConfirmatriceStatusProvider>();
    final ok = wantsPause ? await provider.pause() : await provider.resume();
    if (!mounted) return;
    if (!ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(provider.error ?? 'Action impossible.')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            wantsPause
                ? 'Mise en pause. Tes cas actifs sont redistribués.'
                : 'Reprise active. Tu peux recevoir de nouveaux cas.',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthProvider>().session;
    final state = context.watch<ConfirmatriceStatusProvider>();

    return RefreshIndicator(
      onRefresh: () => context.read<ConfirmatriceStatusProvider>().refresh(),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          _HeaderCard(
            displayName: session?.displayName ?? '--',
            email: session?.email ?? '--',
            roles: session?.roles ?? const [],
            status: state.status,
          ),
          const SizedBox(height: 16),
          _PauseCard(
            isInPause: state.isInPause,
            saving: state.saving,
            onChanged: state.loading ? null : _togglePause,
          ),
          const SizedBox(height: 16),
          _StatsGrid(
            active: state.stats?.active ?? 0,
            closedToday: state.stats?.closedToday ?? 0,
            closedThisWeek: state.stats?.closedThisWeek ?? 0,
            closedThisMonth: state.stats?.closedThisMonth ?? 0,
            loading: state.loading && state.stats == null,
          ),
          const SizedBox(height: 16),
          _ActivityCard(status: state.status),
          const SizedBox(height: 16),
          const _NotificationsCard(),
          const SizedBox(height: 16),
          // Section 2.6 — accès au schéma interactif des transitions cas/commande.
          Card(
            child: ListTile(
              leading: const Icon(Icons.schema_outlined),
              title: const Text('Comment ça marche ?'),
              subtitle: const Text('Schéma interactif des cycles cas et commande'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => const WorkflowDiagramScreen()),
              ),
            ),
          ),
          if (state.error != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.errorContainer
                    .withOpacity(0.4),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(
                state.error!,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.error,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () async {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Déconnexion'),
                    content: const Text('Veux-tu vraiment te déconnecter ?'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.of(ctx).pop(false),
                        child: const Text('Annuler'),
                      ),
                      FilledButton(
                        onPressed: () => Navigator.of(ctx).pop(true),
                        child: const Text('Se déconnecter'),
                      ),
                    ],
                  ),
                );
                if (confirm == true && context.mounted) {
                  await context.read<AuthProvider>().logout();
                }
              },
              icon: const Icon(Icons.logout_rounded),
              label: const Text('Se déconnecter'),
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// En-tête : identité + pastille online
// ============================================================================

class _HeaderCard extends StatelessWidget {
  final String displayName;
  final String email;
  final List<String> roles;
  final ConfirmatriceStatus? status;

  const _HeaderCard({
    required this.displayName,
    required this.email,
    required this.roles,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final initial = (displayName.isNotEmpty ? displayName[0] : '?').toUpperCase();
    final isOnline = status?.isOnline ?? false;
    final isInPause = status?.isInPause ?? false;

    final badgeLabel = isInPause
        ? 'En pause'
        : (isOnline ? 'En ligne' : 'Hors ligne');
    final badgeColor = isInPause
        ? Colors.orange.shade700
        : (isOnline ? Colors.green.shade700 : Colors.grey.shade600);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: LinearGradient(
          colors: [
            scheme.primary.withOpacity(0.12),
            scheme.surfaceContainerHighest.withOpacity(0.75),
          ],
        ),
        border: Border.all(color: scheme.outline.withOpacity(0.18)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 30,
            backgroundColor: scheme.primary.withOpacity(0.18),
            child: Text(
              initial,
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w900,
                color: scheme.primary,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  displayName,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 2),
                Text(
                  email,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      margin: const EdgeInsets.only(right: 6),
                      decoration: BoxDecoration(
                        color: badgeColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    Text(
                      badgeLabel,
                      style: TextStyle(
                        color: badgeColor,
                        fontWeight: FontWeight.w800,
                        fontSize: 12.5,
                      ),
                    ),
                    if (roles.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      Text(
                        '• ${roles.first}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: scheme.onSurfaceVariant,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// Carte pause / reprise
// ============================================================================

class _PauseCard extends StatelessWidget {
  final bool isInPause;
  final bool saving;
  final Future<void> Function(bool wantsPause)? onChanged;

  const _PauseCard({
    required this.isInPause,
    required this.saving,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  isInPause
                      ? Icons.pause_circle_filled_rounded
                      : Icons.check_circle_rounded,
                  color: isInPause ? Colors.orange.shade700 : scheme.primary,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    isInPause ? 'Actuellement en pause' : 'Disponible',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w900),
                  ),
                ),
                if (saving)
                  const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2.4),
                  )
                else
                  Switch(
                    value: !isInPause,
                    onChanged: onChanged == null
                        ? null
                        : (v) => onChanged!(!v),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              isInPause
                  ? 'Tes cas actifs ont été libérés et redistribués. Tu ne reçois plus de nouveaux cas tant que tu n\'as pas repris.'
                  : 'Tu peux recevoir de nouveaux cas par distribution automatique. Mets-toi en pause quand tu t\'absentes.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 12),
            // Clarification UX : beaucoup confondent « fermer l'app » avec
            // « être en pause ». Ce n'est pas la même chose côté serveur.
            _PauseVsCloseExplainer(),
          ],
        ),
      ),
    );
  }
}

class _PauseVsCloseExplainer extends StatelessWidget {
  const _PauseVsCloseExplainer();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final titleStyle = Theme.of(context).textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w900,
          color: scheme.primary,
        );
    final bodyStyle = Theme.of(context).textTheme.bodySmall?.copyWith(
          color: scheme.onSurfaceVariant,
        );

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: scheme.primaryContainer.withOpacity(0.35),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.primary.withOpacity(0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.help_outline_rounded, size: 18, color: scheme.primary),
              const SizedBox(width: 6),
              Text('Pause ou fermer l\'app ?', style: titleStyle),
            ],
          ),
          const SizedBox(height: 8),
          _bullet(
            context,
            icon: Icons.pause_circle_outline_rounded,
            label: 'Mettre en pause',
            body:
                'Libère immédiatement tes cas en cours et bloque toute nouvelle '
                'attribution. À faire dès que tu pars, même 5 min.',
            bodyStyle: bodyStyle,
          ),
          const SizedBox(height: 8),
          _bullet(
            context,
            icon: Icons.close_rounded,
            label: 'Fermer l\'app',
            body:
                'Tes cas restent attribués pendant 10 min avant d\'être '
                'considérés inactifs puis redistribués par le système. '
                'Préfère la pause si tu t\'absentes vraiment.',
            bodyStyle: bodyStyle,
          ),
        ],
      ),
    );
  }

  Widget _bullet(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String body,
    TextStyle? bodyStyle,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: Theme.of(context).colorScheme.primary),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 2),
              Text(body, style: bodyStyle),
            ],
          ),
        ),
      ],
    );
  }
}

// ============================================================================
// Grille de stats
// ============================================================================

class _StatsGrid extends StatelessWidget {
  final int active;
  final int closedToday;
  final int closedThisWeek;
  final int closedThisMonth;
  final bool loading;

  const _StatsGrid({
    required this.active,
    required this.closedToday,
    required this.closedThisWeek,
    required this.closedThisMonth,
    required this.loading,
  });

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(20),
          child: Center(child: CircularProgressIndicator()),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(
                'Mon activité',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w900),
              ),
            ),
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 1.8,
              children: [
                _StatTile(
                  icon: Icons.pending_actions_rounded,
                  label: 'Cas actifs',
                  value: '$active',
                ),
                _StatTile(
                  icon: Icons.today_rounded,
                  label: 'Clôturés aujourd\'hui',
                  value: '$closedToday',
                ),
                _StatTile(
                  icon: Icons.view_week_rounded,
                  label: 'Cette semaine',
                  value: '$closedThisWeek',
                ),
                _StatTile(
                  icon: Icons.calendar_month_rounded,
                  label: 'Ce mois',
                  value: '$closedThisMonth',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _StatTile({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest.withOpacity(0.45),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: scheme.primary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
            ],
          ),
          Text(
            value,
            style: Theme.of(context)
                .textTheme
                .headlineSmall
                ?.copyWith(fontWeight: FontWeight.w900),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// Carte activité (seuils et timestamps)
// ============================================================================

class _ActivityCard extends StatelessWidget {
  final ConfirmatriceStatus? status;

  const _ActivityCard({required this.status});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final s = status;
    final threshold = s?.onlineThresholdMinutes ?? 10;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Disponibilité',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 10),
            _kv(context, 'Dernière activité', _fmt(s?.lastActivityAt)),
            _kv(context, 'Dernière attribution', _fmt(s?.lastAssignmentAt)),
            _kv(context, 'Seuil "en ligne"', '$threshold min'),
            const SizedBox(height: 6),
            Text(
              'Tu es considérée en ligne si ton app a interagi avec le '
              'backend dans les $threshold dernières minutes.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _kv(BuildContext context, String k, String v) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              k,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ),
          Expanded(
            child: Text(
              v,
              textAlign: TextAlign.end,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }

  static String _fmt(DateTime? v) {
    if (v == null) return '--';
    final d = v.toLocal();
    String two(int x) => x.toString().padLeft(2, '0');
    return '${two(d.day)}/${two(d.month)}/${d.year} ${two(d.hour)}:${two(d.minute)}';
  }
}

// ============================================================================
// Phase 10 — Carte préférence son / notifications
// ============================================================================

class _NotificationsCard extends StatelessWidget {
  const _NotificationsCard();

  @override
  Widget build(BuildContext context) {
    final prefs = context.watch<NotificationPreferences>();
    final scheme = Theme.of(context).colorScheme;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  prefs.soundEnabled
                      ? Icons.notifications_active_rounded
                      : Icons.notifications_off_rounded,
                  color: prefs.soundEnabled
                      ? scheme.primary
                      : scheme.onSurfaceVariant,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Notifications',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w900),
                  ),
                ),
                Switch(
                  value: prefs.soundEnabled,
                  onChanged: (v) =>
                      context.read<NotificationPreferences>().setSoundEnabled(v),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              'Reçois les alertes sonores système pour les nouveaux cas, '
              'réponses client et seuils atteints. Automatiquement muettes '
              'quand tu es en pause.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
