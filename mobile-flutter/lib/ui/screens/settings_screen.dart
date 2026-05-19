import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/storage_keys.dart';
import '../../core/services/local_storage_service.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/snackbars.dart';
import '../../state/theme_provider.dart';
import '../widgets/common/app_card.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _onboardingSeen = true;
  bool _loadingFlags = true;
  bool _resetting = false;

  @override
  void initState() {
    super.initState();
    _loadFlags();
  }

  Future<void> _loadFlags() async {
    final seen = await LocalStorageService.getBool(
      StorageKeys.onboardingSeen,
      defaultValue: false,
    );

    if (!mounted) return;
    setState(() {
      _onboardingSeen = seen;
      _loadingFlags = false;
    });
  }

  Future<void> _setTheme(ThemeMode mode) async {
    await context.read<ThemeProvider>().setThemeMode(mode);
    if (!mounted) return;

    final label = switch (mode) {
      ThemeMode.system => 'Thème système',
      ThemeMode.light => 'Mode clair',
      ThemeMode.dark => 'Mode sombre',
    };

    AppSnackbars.showSuccess(context, '$label activé');
  }

  Future<void> _setOnboardingSeen(bool value) async {
    await LocalStorageService.setBool(
      StorageKeys.onboardingSeen,
      value,
    );

    if (!mounted) return;
    setState(() => _onboardingSeen = value);

    AppSnackbars.showInfo(
      context,
      value
          ? 'Onboarding marqué comme vu'
          : 'Onboarding réactivé pour le prochain démarrage',
    );
  }

  Future<void> _resetLastTab() async {
    await LocalStorageService.setInt(StorageKeys.lastTabIndex, 0);
    if (!mounted) return;
    AppSnackbars.showSuccess(
      context,
      'Dernier onglet réinitialisé sur Nouvelles commandes',
    );
  }

  Future<void> _resetLocalUiPrefs() async {
    setState(() => _resetting = true);

    try {
      await LocalStorageService.remove(StorageKeys.lastTabIndex);
      await LocalStorageService.remove(StorageKeys.themeMode);
      await LocalStorageService.remove(StorageKeys.onboardingSeen);

      if (!mounted) return;

      setState(() {
        _onboardingSeen = false;
      });

      await context.read<ThemeProvider>().setThemeMode(ThemeMode.system);

      if (!mounted) return;
      AppSnackbars.showSuccess(
        context,
        'Préférences UI réinitialisées',
      );
    } finally {
      if (mounted) {
        setState(() => _resetting = false);
      }
    }
  }

  Widget _themeTile(
      BuildContext context, {
        required String title,
        required String subtitle,
        required ThemeMode value,
        required ThemeMode groupValue,
        required VoidCallback onTap,
      }) {
    final selected = value == groupValue;

    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: selected
              ? Theme.of(context).colorScheme.primary.withOpacity(0.08)
              : Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.45),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected
                ? Theme.of(context).colorScheme.primary.withOpacity(0.30)
                : Theme.of(context).colorScheme.outline.withOpacity(0.25),
          ),
        ),
        child: Row(
          children: [
            Radio<ThemeMode>(
              value: value,
              groupValue: groupValue,
              onChanged: (_) => onTap(),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    final themeMode = themeProvider.themeMode;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Paramètres'),
      ),
      body: _loadingFlags
          ? const Center(
        child: CircularProgressIndicator(),
      )
          : ListView(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Apparence',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Choisis comment l’application doit afficher le thème.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color:
                    Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                _themeTile(
                  context,
                  title: 'Système',
                  subtitle: 'Suit automatiquement le thème du téléphone',
                  value: ThemeMode.system,
                  groupValue: themeMode,
                  onTap: () => _setTheme(ThemeMode.system),
                ),
                const SizedBox(height: AppSpacing.sm),
                _themeTile(
                  context,
                  title: 'Clair',
                  subtitle: 'Interface lumineuse',
                  value: ThemeMode.light,
                  groupValue: themeMode,
                  onTap: () => _setTheme(ThemeMode.light),
                ),
                const SizedBox(height: AppSpacing.sm),
                _themeTile(
                  context,
                  title: 'Sombre',
                  subtitle: 'Interface sombre',
                  value: ThemeMode.dark,
                  groupValue: themeMode,
                  onTap: () => _setTheme(ThemeMode.dark),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Expérience utilisateur',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _onboardingSeen,
                  onChanged: (v) => _setOnboardingSeen(v),
                  title: const Text('Onboarding déjà vu'),
                  subtitle: Text(
                    _onboardingSeen
                        ? 'L’onboarding ne s’affichera plus au démarrage'
                        : 'L’onboarding se réaffichera au prochain démarrage',
                  ),
                ),
                const Divider(height: 24),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.tab_rounded),
                  title: const Text('Réinitialiser le dernier onglet'),
                  subtitle: const Text(
                    'Le prochain démarrage ouvrira le premier onglet',
                  ),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: _resetLastTab,
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Maintenance',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Réinitialise les préférences locales de l’interface.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color:
                    Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _resetting ? null : _resetLocalUiPrefs,
                    icon: _resetting
                        ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                        : const Icon(Icons.restart_alt_rounded),
                    label: Text(
                      _resetting
                          ? 'Réinitialisation...'
                          : 'Réinitialiser les préférences UI',
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }
}