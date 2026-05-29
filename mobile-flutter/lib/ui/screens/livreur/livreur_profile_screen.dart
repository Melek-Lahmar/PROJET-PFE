import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_status_palette.dart';
import '../../../models/user_profile_snapshot.dart';
import '../../../state/auth_provider.dart';
import '../../../state/deliveries_provider.dart';
import '../../../state/notification_preferences.dart';
import '../../../state/theme_provider.dart';
import '../../widgets/premium/action_tile.dart';
import '../../widgets/premium/premium_card.dart';

/// Profil livreur premium : carte identité, stats rapides, paramètres,
/// déconnexion. Aligné avec l'écran profil confirmatrice pour une
/// expérience cohérente.
class LivreurProfileScreen extends StatelessWidget {
  const LivreurProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthProvider>().session;
    final deliveries = context.watch<DeliveriesProvider>();
    final prefs = context.watch<NotificationPreferences>();
    final theme = context.watch<ThemeProvider>();

    final displayName = session?.displayName ?? '—';
    final email = session?.email ?? '—';
    final profile = session?.profile;

    final active = deliveries.myOrders.where((d) => !d.isFinished).length;
    final inDelivery =
        deliveries.myOrders.where((d) => d.isInDelivery).length;
    final delivered = deliveries.myOrders.where((d) => d.statut == 3).length;
    final reported = deliveries.reportedOrders.length;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        _IdentityHero(
          displayName: displayName,
          email: email,
          isAvailable: true,
        ),
        const SizedBox(height: 16),
        if (profile != null) ...[
          _SectionHeader(
              icon: Icons.contact_phone_outlined, title: 'Mes coordonnées'),
          const SizedBox(height: 8),
          _CoordonneesCard(profile: profile, email: email),
          const SizedBox(height: 16),
        ],
        _QuickStatsGrid(
          active: active,
          inDelivery: inDelivery,
          delivered: delivered,
          reported: reported,
        ),
        const SizedBox(height: 16),
        _SectionHeader(icon: Icons.settings_outlined, title: 'Paramètres'),
        const SizedBox(height: 8),
        PremiumCard(
          padding: const EdgeInsets.all(6),
          child: Column(
            children: [
              ActionTile(
                icon: prefs.soundEnabled
                    ? Icons.notifications_active_rounded
                    : Icons.notifications_off_rounded,
                label: prefs.soundEnabled
                    ? 'Notifications activées'
                    : 'Notifications muettes',
                subLabel:
                    'Son système pour les nouveaux événements.',
                trailing: Switch(
                  value: prefs.soundEnabled,
                  onChanged: (v) => context
                      .read<NotificationPreferences>()
                      .setSoundEnabled(v),
                ),
              ),
              const Divider(height: 1),
              ActionTile(
                icon: Icons.palette_outlined,
                label: 'Thème',
                subLabel: _themeLabel(theme.themeMode),
                trailing: PopupMenuButton<ThemeMode>(
                  initialValue: theme.themeMode,
                  onSelected: (m) =>
                      context.read<ThemeProvider>().setThemeMode(m),
                  itemBuilder: (_) => const [
                    PopupMenuItem(
                        value: ThemeMode.system, child: Text('Système')),
                    PopupMenuItem(
                        value: ThemeMode.light, child: Text('Clair')),
                    PopupMenuItem(
                        value: ThemeMode.dark, child: Text('Sombre')),
                  ],
                  icon: const Icon(Icons.chevron_right_rounded),
                ),
              ),
              const Divider(height: 1),
              ActionTile(
                icon: Icons.refresh_rounded,
                label: 'Actualiser mes données',
                subLabel: 'Recharger mes commandes maintenant',
                onTap: () =>
                    context.read<DeliveriesProvider>().refresh(),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Déconnexion'),
                  content:
                      const Text('Veux-tu vraiment te déconnecter ?'),
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
            icon: Icon(Icons.logout_rounded,
                color: Theme.of(context).colorScheme.error),
            label: Text(
              'Se déconnecter',
              style:
                  TextStyle(color: Theme.of(context).colorScheme.error),
            ),
            style: OutlinedButton.styleFrom(
              side: BorderSide(
                color: Theme.of(context).colorScheme.error.withValues(alpha: 0.4),
              ),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ),
      ],
    );
  }

  String _themeLabel(ThemeMode m) {
    switch (m) {
      case ThemeMode.light:
        return 'Clair';
      case ThemeMode.dark:
        return 'Sombre';
      case ThemeMode.system:
        return 'Système';
    }
  }
}

class _IdentityHero extends StatelessWidget {
  final String displayName;
  final String email;
  final bool isAvailable;

  const _IdentityHero({
    required this.displayName,
    required this.email,
    required this.isAvailable,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final initial =
        (displayName.isNotEmpty ? displayName[0] : '?').toUpperCase();

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(PremiumTokens.rXl),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            scheme.primary,
            Color.lerp(scheme.primary, Colors.black, 0.25) ?? scheme.primary,
          ],
        ),
        boxShadow: PremiumTokens.cardShadow(false),
      ),
      child: Row(
        children: [
          Stack(
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                  border:
                      Border.all(color: Colors.white.withValues(alpha: 0.4), width: 2),
                ),
                alignment: Alignment.center,
                child: Text(
                  initial,
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
              ),
              if (isAvailable)
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                    width: 14,
                    height: 14,
                    decoration: BoxDecoration(
                      color: Colors.greenAccent.shade400,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.mail_outline_rounded,
                        color: Colors.white70, size: 14),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        email,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white70),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.local_shipping_rounded,
                          size: 14, color: Colors.white),
                      SizedBox(width: 4),
                      Text(
                        'Livreur',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
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

class _QuickStatsGrid extends StatelessWidget {
  final int active;
  final int inDelivery;
  final int delivered;
  final int reported;

  const _QuickStatsGrid({
    required this.active,
    required this.inDelivery,
    required this.delivered,
    required this.reported,
  });

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.7,
      children: [
        _StatTile(
          icon: Icons.inbox_rounded,
          label: 'En cours',
          value: '$active',
          color: Colors.blueGrey.shade600,
        ),
        _StatTile(
          icon: Icons.local_shipping_rounded,
          label: 'En livraison',
          value: '$inDelivery',
          color: Colors.blue.shade700,
        ),
        _StatTile(
          icon: Icons.check_circle_rounded,
          label: 'Livrées',
          value: '$delivered',
          color: Colors.green.shade700,
        ),
        _StatTile(
          icon: Icons.event_repeat_rounded,
          label: 'Reportées',
          value: '$reported',
          color: Colors.orange.shade700,
        ),
      ],
    );
  }
}

class _StatTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return PremiumCard(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 18),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
            ],
          ),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
        ],
      ),
    );
  }
}

class _CoordonneesCard extends StatelessWidget {
  final UserProfileSnapshot profile;
  final String email;
  const _CoordonneesCard({required this.profile, required this.email});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return PremiumCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _row(context, Icons.mail_outline_rounded, 'Email', email),
          _divider(scheme),
          _row(
            context,
            Icons.phone_outlined,
            'Téléphone',
            profile.phone ?? '—',
            valueColor: profile.phone != null ? Colors.green.shade700 : null,
          ),
          _divider(scheme),
          _row(context, Icons.map_outlined, 'Gouvernorat',
              profile.governorate ?? '—'),
          _divider(scheme),
          _row(context, Icons.location_city_outlined, 'Délégation',
              profile.delegation ?? '—'),
          _divider(scheme),
          _row(
            context,
            Icons.place_outlined,
            'Adresse',
            profile.address ?? '—',
            wrap: true,
          ),
          if ((profile.addressComplement ?? '').isNotEmpty) ...[
            _divider(scheme),
            _row(
              context,
              Icons.subdirectory_arrow_right_rounded,
              'Complément',
              profile.addressComplement!,
              wrap: true,
            ),
          ],
          if ((profile.postalCode ?? '').isNotEmpty) ...[
            _divider(scheme),
            _row(context, Icons.mail_outline_rounded, 'Code postal',
                profile.postalCode!),
          ],
          if ((profile.country ?? '').isNotEmpty) ...[
            _divider(scheme),
            _row(context, Icons.flag_outlined, 'Pays', profile.country!),
          ],
        ],
      ),
    );
  }

  Widget _divider(ColorScheme s) => Divider(
        height: 18,
        color: s.outlineVariant.withValues(alpha: 0.4),
      );

  Widget _row(
    BuildContext context,
    IconData icon,
    String label,
    String value, {
    bool wrap = false,
    Color? valueColor,
  }) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      crossAxisAlignment:
          wrap ? CrossAxisAlignment.start : CrossAxisAlignment.center,
      children: [
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            color: scheme.primary.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 16, color: scheme.primary),
        ),
        const SizedBox(width: 10),
        SizedBox(
          width: 100,
          child: Text(
            label,
            style: TextStyle(
              color: scheme.onSurfaceVariant,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            maxLines: wrap ? 3 : 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 13,
              color: valueColor,
            ),
          ),
        ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String title;
  const _SectionHeader({required this.icon, required this.title});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Row(
        children: [
          Icon(icon, size: 18, color: scheme.primary),
          const SizedBox(width: 8),
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
        ],
      ),
    );
  }
}
