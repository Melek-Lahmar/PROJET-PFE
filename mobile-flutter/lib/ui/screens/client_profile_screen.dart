import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_spacing.dart';
import '../../state/auth_provider.dart';
import '../../state/client_claims_provider.dart';
import '../../state/customer_orders_provider.dart';
import '../../state/notification_preferences.dart';
import '../widgets/common/app_card.dart';
import '../widgets/premium/animated_entry.dart';
import 'client/client_addresses_screen.dart';
import 'client/client_contact_prefs_screen.dart';
import 'client/client_loyalty_card.dart';
import 'client/faq_screen.dart';

class ClientProfileScreen extends StatelessWidget {
  const ClientProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthProvider>().session;
    final profile = session?.profile;
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final orders = context.watch<CustomerOrdersProvider>().orders;
    final claims = context.watch<ClientClaimsProvider>().items;

    int delivered = 0, inProgress = 0;
    double spent = 0;
    for (final o in orders) {
      switch (o.normalizedStatus) {
        case 'LIVRE':
          delivered++;
          spent += o.netAPayer;
          break;
        case 'EN_LIVRAISON':
        case 'CONFIRME':
          inProgress++;
          break;
      }
    }

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.screenPadding),
      children: [
        EntryAnimation(
          duration: const Duration(milliseconds: 360),
          slide: 14,
          child: _HeaderCard(
            displayName: session?.displayName ?? '--',
            email: session?.email ?? '--',
            phone: profile?.phone,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        EntryAnimation(
          duration: const Duration(milliseconds: 360),
          delay: const Duration(milliseconds: 90),
          slide: 12,
          child: _StatsCard(
            totalOrders: orders.length,
            delivered: delivered,
            inProgress: inProgress,
            claimsCount: claims.length,
            spent: spent,
          ),
        ),
        const SizedBox(height: AppSpacing.lg),

        // Adresse principale
        _SectionHeader(
          icon: Icons.home_outlined,
          title: 'Adresse',
        ),
        const SizedBox(height: AppSpacing.sm),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _ProfileRow(label: 'Adresse principale', value: profile?.address),
              _ProfileRow(
                label: 'Complément',
                value: profile?.addressComplement,
              ),
              _ProfileRow(label: 'Délégation', value: profile?.delegation),
              _ProfileRow(label: 'Gouvernorat', value: profile?.governorate),
              _ProfileRow(label: 'Code postal', value: profile?.postalCode),
              _ProfileRow(label: 'Pays', value: profile?.country),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),

        // Informations client
        _SectionHeader(
          icon: Icons.badge_outlined,
          title: 'Informations client',
        ),
        const SizedBox(height: AppSpacing.sm),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _ProfileRow(
                label: 'Code client Sage',
                value: profile?.sageClientCode,
              ),
              _ProfileRow(label: 'Société', value: profile?.companyName),
              _ProfileRow(label: 'Matricule fiscal', value: profile?.taxId),
              _ProfileRow(
                label: 'Rôles',
                value: session?.roles.join(', '),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),

        // Section 2.9 — Hero programme fidélité
        const ClientLoyaltyCard(),
        const SizedBox(height: AppSpacing.lg),

        // Section 2.8 — Mes adresses + 2.10 prefs contact + 2.13 FAQ
        _SectionHeader(icon: Icons.tune_rounded, title: 'Préférences'),
        const SizedBox(height: AppSpacing.sm),
        AppCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.location_on_outlined),
                title: const Text('Mes adresses'),
                subtitle: const Text('Maison, Travail… (max 3)'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ClientAddressesScreen()),
                ),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.chat_outlined),
                title: const Text('Communication'),
                subtitle: const Text('Appel, SMS ou les deux'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ClientContactPrefsScreen()),
                ),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.help_outline),
                title: const Text('Aide & FAQ'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const FaqScreen()),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),

        // Notifications
        _SectionHeader(
          icon: Icons.notifications_none_rounded,
          title: 'Notifications',
        ),
        const SizedBox(height: AppSpacing.sm),
        const _NotificationsPrefCard(),
        const SizedBox(height: AppSpacing.lg),

        // Déconnexion
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
            icon: Icon(Icons.logout_rounded, color: scheme.error),
            label: Text(
              'Se déconnecter',
              style: TextStyle(color: scheme.error),
            ),
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: scheme.error.withValues(alpha: 0.4)),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
      ],
    );
  }
}

class _HeaderCard extends StatelessWidget {
  final String displayName;
  final String email;
  final String? phone;

  const _HeaderCard({
    required this.displayName,
    required this.email,
    required this.phone,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final initial =
        (displayName.isNotEmpty ? displayName[0] : '?').toUpperCase();
    final phoneText = (phone ?? '').trim();

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: LinearGradient(
          colors: [
            scheme.primary.withValues(alpha: 0.14),
            scheme.surfaceContainerHighest.withValues(alpha: 0.75),
          ],
        ),
        border: Border.all(color: scheme.outline.withValues(alpha: 0.18)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 32,
            backgroundColor: scheme.primary.withValues(alpha: 0.18),
            child: Text(
              initial,
              style: TextStyle(
                fontSize: 28,
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
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(Icons.email_outlined,
                        size: 14, color: scheme.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        email,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style:
                            Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: scheme.onSurfaceVariant,
                                ),
                      ),
                    ),
                  ],
                ),
                if (phoneText.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Icon(Icons.phone_outlined,
                          size: 14, color: scheme.onSurfaceVariant),
                      const SizedBox(width: 4),
                      Text(
                        phoneText,
                        style:
                            Theme.of(context).textTheme.bodySmall?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                      ),
                    ],
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

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String title;

  const _SectionHeader({
    required this.icon,
    required this.title,
  });

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

class _ProfileRow extends StatelessWidget {
  final String label;
  final String? value;

  const _ProfileRow({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 3,
            child: Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            flex: 4,
            child: Text(
              (value == null || value!.trim().isEmpty) ? '--' : value!,
              textAlign: TextAlign.end,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatsCard extends StatelessWidget {
  final int totalOrders;
  final int delivered;
  final int inProgress;
  final int claimsCount;
  final double spent;

  const _StatsCard({
    required this.totalOrders,
    required this.delivered,
    required this.inProgress,
    required this.claimsCount,
    required this.spent,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF22C55E), Color(0xFF16A34A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF22C55E).withValues(alpha: 0.32),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.insights_rounded, color: Colors.white, size: 18),
              const SizedBox(width: 6),
              Text('Mes statistiques',
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.3,
                  )),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.20),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text('${spent.toStringAsFixed(0)} TND dépensés',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 10,
                    )),
              ),
            ],
          ),
          const SizedBox(height: 12),
          IntrinsicHeight(
            child: Row(
              children: [
                _MiniStat(
                  icon: Icons.inventory_2_rounded,
                  label: 'Commandes',
                  value: totalOrders.toString(),
                ),
                _MiniStatDivider(),
                _MiniStat(
                  icon: Icons.check_circle_rounded,
                  label: 'Livrées',
                  value: delivered.toString(),
                ),
                _MiniStatDivider(),
                _MiniStat(
                  icon: Icons.local_shipping_rounded,
                  label: 'En cours',
                  value: inProgress.toString(),
                ),
                _MiniStatDivider(),
                _MiniStat(
                  icon: Icons.support_agent_rounded,
                  label: 'Réclam.',
                  value: claimsCount.toString(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _MiniStat({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: Colors.white.withValues(alpha: 0.92), size: 18),
          const SizedBox(height: 4),
          Text(value,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 18,
                letterSpacing: -0.3,
              )),
          Text(label,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.85),
                fontWeight: FontWeight.w700,
                fontSize: 10,
              )),
        ],
      ),
    );
  }
}

class _MiniStatDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
      color: Colors.white.withValues(alpha: 0.20),
    );
  }
}

class _NotificationsPrefCard extends StatelessWidget {
  const _NotificationsPrefCard();

  @override
  Widget build(BuildContext context) {
    final prefs = context.watch<NotificationPreferences>();
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return AppCard(
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
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  prefs.soundEnabled
                      ? 'Notifications activées'
                      : 'Notifications muettes',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              Switch(
                value: prefs.soundEnabled,
                onChanged: (v) =>
                    context.read<NotificationPreferences>().setSoundEnabled(v),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Reçois un son et une notification pour les nouveaux messages, '
            'corrections d\'adresse et changements de statut de commande.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
