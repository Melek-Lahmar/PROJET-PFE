import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../state/auth_provider.dart';
import '../../../state/theme_provider.dart';
import '../../widgets/premium/premium_card.dart';
import '../../widgets/premium/section_header.dart' show PremiumSectionHeader;
import 'admin_settings_appearance_screen.dart';

class AdminSettingsScreen extends StatelessWidget {
  const AdminSettingsScreen({super.key});

  Future<void> _confirmResetDemoData(BuildContext context) async {
    final formKey = GlobalKey<FormState>();
    final inputCtrl = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return AlertDialog(
          title: Row(
            children: const [
              Icon(Icons.delete_sweep_rounded, color: Colors.red),
              SizedBox(width: 8),
              Text('Réinitialiser les données de démo'),
            ],
          ),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Cela va supprimer TOUTES les commandes, réclamations '
                  'et historiques. Les utilisateurs et le catalogue '
                  'produits sont préservés.',
                  style: TextStyle(fontSize: 13),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Tapez RESET pour confirmer.',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: inputCtrl,
                  textCapitalization: TextCapitalization.characters,
                  autofocus: true,
                  decoration: const InputDecoration(
                    hintText: 'RESET',
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) {
                    if ((v ?? '').trim().toUpperCase() != 'RESET') {
                      return 'Tapez exactement RESET.';
                    }
                    return null;
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Annuler'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: Colors.red),
              onPressed: () {
                if (formKey.currentState?.validate() ?? false) {
                  Navigator.of(ctx).pop(true);
                }
              },
              child: const Text('Réinitialiser'),
            ),
          ],
        );
      },
    );

    if (confirmed != true || !context.mounted) return;

    final messenger = ScaffoldMessenger.of(context);
    final api = context.read<ApiClient>();
    try {
      final res = await api.postJson('/api/admin/dev/reset-demo-data', {});
      final deleted = res['deleted'] is Map<String, dynamic>
          ? res['deleted'] as Map<String, dynamic>
          : <String, dynamic>{};
      final total = deleted.values
          .whereType<num>()
          .fold<int>(0, (acc, v) => acc + v.toInt());
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(
          backgroundColor: Colors.green,
          content: Text('Données réinitialisées ($total lignes supprimées).'),
        ));
    } catch (e) {
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(
          backgroundColor: Colors.red,
          content: Text('Erreur : ${e.toString()}'),
        ));
    }
  }

  /// Reset complet + seed démo : vide TOUS les utilisateurs + données,
  /// recrée 5 utilisateurs (admin/client/2 conf/livreur) et 4 commandes
  /// EN_ATTENTE. Demande de taper littéralement "SEED" pour confirmer.
  Future<void> _confirmSeedCleanDemo(BuildContext context) async {
    final formKey = GlobalKey<FormState>();
    final inputCtrl = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return AlertDialog(
          title: Row(
            children: const [
              Icon(Icons.warning_amber_rounded, color: Color(0xFF7F1D1D)),
              SizedBox(width: 8),
              Expanded(child: Text('⚠️ Action irréversible')),
            ],
          ),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Cette action va SUPPRIMER TOUS les utilisateurs et '
                  'données, et recréer un environnement de démo propre '
                  '(5 utilisateurs + 4 commandes EN_ATTENTE).',
                  style: TextStyle(fontSize: 13),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Tapez SEED pour confirmer.',
                  style: TextStyle(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: inputCtrl,
                  textCapitalization: TextCapitalization.characters,
                  autofocus: true,
                  decoration: const InputDecoration(
                    hintText: 'SEED',
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) {
                    if ((v ?? '').trim().toUpperCase() != 'SEED') {
                      return 'Tapez exactement SEED.';
                    }
                    return null;
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Annuler'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF7F1D1D)),
              onPressed: () {
                if (formKey.currentState?.validate() ?? false) {
                  Navigator.of(ctx).pop(true);
                }
              },
              child: const Text('Confirmer Seed'),
            ),
          ],
        );
      },
    );

    if (confirmed != true || !context.mounted) return;

    // Loader pendant l'appel — l'opération peut prendre quelques secondes.
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()),
    );

    final messenger = ScaffoldMessenger.of(context);
    final api = context.read<ApiClient>();
    Map<String, dynamic>? response;
    String? errorMessage;

    try {
      response = await api.postJson('/api/admin/dev/seed-clean-demo', {
        'confirm': 'RESET_AND_SEED',
      });
    } catch (e) {
      errorMessage = e.toString();
    }

    if (!context.mounted) return;
    Navigator.of(context).pop(); // close loader

    if (errorMessage != null) {
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(
          backgroundColor: Colors.red,
          content: Text('Erreur seed : $errorMessage'),
        ));
      return;
    }

    final created = response?['created'] is Map<String, dynamic>
        ? response!['created'] as Map<String, dynamic>
        : <String, dynamic>{};
    final users = (created['users'] as List?)?.cast<dynamic>() ?? const [];
    final commandes =
        (created['commandes'] as List?)?.cast<dynamic>() ?? const [];

    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(
        backgroundColor: Colors.green,
        content: Text(
            'Seed OK : ${users.length} utilisateurs + ${commandes.length} commandes.'),
      ));

    // Récapitulatif détaillé en dialog.
    await showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('🌱 Seed démo terminé'),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Utilisateurs créés (${users.length}) :',
                  style: const TextStyle(fontWeight: FontWeight.w900)),
              const SizedBox(height: 4),
              for (final u in users.whereType<Map<String, dynamic>>())
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Text(
                    '• ${u['email']} (${u['role']})',
                    style: const TextStyle(fontSize: 13),
                  ),
                ),
              const SizedBox(height: 12),
              Text('Commandes créées (${commandes.length}) :',
                  style: const TextStyle(fontWeight: FontWeight.w900)),
              const SizedBox(height: 4),
              for (final c in commandes.whereType<Map<String, dynamic>>())
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Text(
                    '• ${c['piece']} — ${c['montant']} DT (${c['statut']})',
                    style: const TextStyle(fontSize: 13),
                  ),
                ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final themeProv = context.watch<ThemeProvider>();
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final session = auth.session;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PremiumCard(
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: scheme.primary.withValues(alpha: 0.15),
                  child: Icon(
                    Icons.admin_panel_settings_rounded,
                    color: scheme.primary,
                    size: 30,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        session?.displayName ?? 'Administrateur',
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        session?.email ?? '',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: scheme.primaryContainer,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          'ADMIN',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: scheme.onPrimaryContainer,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const PremiumSectionHeader(
            icon: Icons.palette_rounded,
            title: 'Apparence',
          ),
          const SizedBox(height: 8),
          PremiumCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                RadioListTile<ThemeMode>(
                  title: const Text('Système'),
                  value: ThemeMode.system,
                  groupValue: themeProv.themeMode,
                  onChanged: (v) =>
                      v == null ? null : themeProv.setThemeMode(v),
                ),
                RadioListTile<ThemeMode>(
                  title: const Text('Clair'),
                  value: ThemeMode.light,
                  groupValue: themeProv.themeMode,
                  onChanged: (v) =>
                      v == null ? null : themeProv.setThemeMode(v),
                ),
                RadioListTile<ThemeMode>(
                  title: const Text('Sombre'),
                  value: ThemeMode.dark,
                  groupValue: themeProv.themeMode,
                  onChanged: (v) =>
                      v == null ? null : themeProv.setThemeMode(v),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          // Section 4.6 — accès à l'écran Apparence (couleur thème global +
          // mode clair/sombre/auto, propagé à toutes les apps mobiles).
          PremiumCard(
            padding: EdgeInsets.zero,
            child: ListTile(
              leading: const Icon(Icons.color_lens_outlined),
              title: const Text('Thème global de la plateforme'),
              subtitle: const Text('Couleur principale + mode clair/sombre'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => const AdminSettingsAppearanceScreen()),
              ),
            ),
          ),
          const SizedBox(height: 24),
          // 1.G — Reset DB démo (uniquement en environnement Dev côté backend).
          const PremiumSectionHeader(
            icon: Icons.engineering_rounded,
            title: 'Outils de démo',
          ),
          const SizedBox(height: 8),
          PremiumCard(
            padding: EdgeInsets.zero,
            child: ListTile(
              leading: const Icon(
                Icons.delete_sweep_rounded,
                color: Colors.red,
              ),
              title: const Text(
                'Réinitialiser les données de démo',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: const Text(
                'Supprime commandes, réclamations, historiques. Préserve '
                'utilisateurs et catalogue produits.',
              ),
              trailing: const Icon(Icons.chevron_right, color: Colors.red),
              onTap: () => _confirmResetDemoData(context),
            ),
          ),
          const SizedBox(height: 12),
          // Seed démo — reset complet + recréation 5 users + 4 commandes.
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: const Color(0xFF7F1D1D),
                width: 1.5,
              ),
              color: const Color(0xFFFEE2E2),
            ),
            child: ListTile(
              leading: const Icon(
                Icons.eco_rounded,
                color: Color(0xFF7F1D1D),
              ),
              title: const Text(
                '🌱 Reset complet + Seed démo',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF7F1D1D),
                ),
              ),
              subtitle: const Text(
                'Supprime TOUS les utilisateurs et données, puis recrée 5 '
                'utilisateurs de démo et 4 commandes EN_ATTENTE.',
                style: TextStyle(color: Color(0xFF7F1D1D)),
              ),
              trailing: const Icon(Icons.chevron_right,
                  color: Color(0xFF7F1D1D)),
              onTap: () => _confirmSeedCleanDemo(context),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton.tonalIcon(
            onPressed: () => _confirmLogout(context),
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Se déconnecter'),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmLogout(BuildContext context) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Déconnexion'),
        content: const Text('Voulez-vous vraiment vous déconnecter ?'),
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
  }
}
