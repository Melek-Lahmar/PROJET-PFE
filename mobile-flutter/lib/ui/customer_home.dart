import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/notification_coordinator.dart';
import '../core/notification_service.dart';
import '../core/realtime_service.dart';
import '../state/auth_provider.dart';
import '../state/client_demandes_provider.dart';
import '../state/notification_preferences.dart';
import 'screens/client_claims_screen.dart';
import 'screens/client_demandes_screen.dart';
import 'screens/client_orders_screen.dart';
import 'screens/client_profile_screen.dart';
import 'widgets/connection_banner.dart';
import 'widgets/premium/animated_entry.dart';

/// Shell client premium :
/// - header gradient avec greeting contextuel (selon heure)
/// - bottom nav M3 arrondi avec ombre subtile
/// - transition animée entre onglets via `AnimatedPageStack`
class CustomerHome extends StatefulWidget {
  const CustomerHome({super.key});
  @override
  State<CustomerHome> createState() => _CustomerHomeState();
}

class _CustomerHomeState extends State<CustomerHome> {
  int _currentIndex = 0;

  NotificationCoordinator? _coordinator;

  late final List<Widget> _pages = const [
    ClientOrdersScreen(),
    ClientClaimsScreen(),
    ClientDemandesScreen(),
    ClientProfileScreen(),
  ];

  static const List<_TabSpec> _tabs = [
    _TabSpec(
      title: 'Mes commandes',
      subtitle: 'Suivi en temps réel',
      icon: Icons.inventory_2_outlined,
      activeIcon: Icons.inventory_2,
      label: 'Commandes',
      color: Color(0xFF6366F1),
    ),
    _TabSpec(
      title: 'Mes réclamations',
      subtitle: 'Historique et nouveau dépôt',
      icon: Icons.support_agent_outlined,
      activeIcon: Icons.support_agent,
      label: 'Réclam.',
      color: Color(0xFFF59E0B),
    ),
    _TabSpec(
      title: 'Demandes',
      subtitle: 'Réponses à donner',
      icon: Icons.mark_email_unread_outlined,
      activeIcon: Icons.mark_email_read,
      label: 'Demandes',
      color: Color(0xFFEF4444),
    ),
    _TabSpec(
      title: 'Mon profil',
      subtitle: 'Compte et préférences',
      icon: Icons.person_outline_rounded,
      activeIcon: Icons.person_rounded,
      label: 'Profil',
      color: Color(0xFF22C55E),
    ),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final realtime = context.read<RealtimeService>();
      final prefs = context.read<NotificationPreferences>();
      final session = context.read<AuthProvider>().session;

      _coordinator = NotificationCoordinator.client(
        realtime: realtime,
        notifications: NotificationService.I,
        prefs: prefs,
        selfUserId: session?.userId,
      )..start();
    });
  }

  @override
  void dispose() {
    _coordinator?.stop();
    super.dispose();
  }

  void _onTap(int index) {
    if (_currentIndex == index) return;
    setState(() => _currentIndex = index);
  }

  Future<void> _logout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Déconnexion'),
        content: const Text('Voulez-vous vraiment vous déconnecter ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Se déconnecter'),
          ),
        ],
      ),
    );
    if (confirm == true && mounted) {
      await context.read<AuthProvider>().logout();
    }
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 5) return 'Bonsoir';
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bel après-midi';
    return 'Bonsoir';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final session = context.watch<AuthProvider>().session;
    final demandesProvider = context.watch<ClientDemandesProvider>();
    final pending = demandesProvider.pendingCount;
    final tab = _tabs[_currentIndex];
    final isProfile = _currentIndex == 3;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Column(
        children: [
          _ClientHeader(
            greeting: _greeting(),
            displayName: session?.displayName ?? 'Client',
            tab: tab,
            tabIndex: _currentIndex,
            pendingDemandes: pending,
            onLogout: _logout,
            showGreeting: !isProfile,
          ),
          // Section 1.7.4 — bandeau persistant si connexion instable.
          const ConnectionBanner(),
          Expanded(
            child: AnimatedPageStack(index: _currentIndex, pages: _pages),
          ),
        ],
      ),
      bottomNavigationBar: _ClientNavBar(
        tabs: _tabs,
        currentIndex: _currentIndex,
        onTap: _onTap,
        pendingDemandes: pending,
      ),
    );
  }
}

class _TabSpec {
  final String title;
  final String subtitle;
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final Color color;
  const _TabSpec({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.color,
  });
}

class _ClientHeader extends StatelessWidget {
  final String greeting;
  final String displayName;
  final _TabSpec tab;
  final int tabIndex;
  final int pendingDemandes;
  final VoidCallback onLogout;
  final bool showGreeting;

  const _ClientHeader({
    required this.greeting,
    required this.displayName,
    required this.tab,
    required this.tabIndex,
    required this.pendingDemandes,
    required this.onLogout,
    required this.showGreeting,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [tab.color, tab.color.withValues(alpha: 0.78)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: tab.color.withValues(alpha: 0.30),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 12, 18),
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 280),
            switchInCurve: Curves.easeOutCubic,
            transitionBuilder: (child, animation) {
              final slide = Tween<Offset>(
                begin: const Offset(0.04, 0),
                end: Offset.zero,
              ).animate(animation);
              return FadeTransition(
                opacity: animation,
                child: SlideTransition(position: slide, child: child),
              );
            },
            child: Column(
              key: ValueKey<int>(tabIndex),
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (showGreeting) ...[
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '$greeting,',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: Colors.white.withValues(alpha: 0.86),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              displayName,
                              style: theme.textTheme.titleLarge?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      _AvatarCircle(
                        initial: _initial(displayName),
                        color: tab.color,
                      ),
                      IconButton(
                        tooltip: 'Se déconnecter',
                        color: Colors.white,
                        onPressed: onLogout,
                        icon: const Icon(Icons.logout_rounded),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                ],
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.30)),
                      ),
                      child: Icon(tab.activeIcon, color: Colors.white, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            tab.title,
                            style: theme.textTheme.titleMedium?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          Text(
                            tab.subtitle,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: Colors.white.withValues(alpha: 0.85),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (!showGreeting)
                      IconButton(
                        tooltip: 'Se déconnecter',
                        color: Colors.white,
                        onPressed: onLogout,
                        icon: const Icon(Icons.logout_rounded),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _initial(String name) {
    final t = name.trim();
    if (t.isEmpty) return '?';
    return t.substring(0, 1).toUpperCase();
  }
}

class _AvatarCircle extends StatelessWidget {
  final String initial;
  final Color color;
  const _AvatarCircle({required this.initial, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 42, height: 42,
      margin: const EdgeInsets.only(right: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Center(
        child: Text(
          initial,
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.w900,
            fontSize: 18,
          ),
        ),
      ),
    );
  }
}

class _ClientNavBar extends StatelessWidget {
  final List<_TabSpec> tabs;
  final int currentIndex;
  final ValueChanged<int> onTap;
  final int pendingDemandes;

  const _ClientNavBar({
    required this.tabs,
    required this.currentIndex,
    required this.onTap,
    required this.pendingDemandes,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      top: false,
      child: Container(
        decoration: BoxDecoration(
          color: theme.scaffoldBackgroundColor,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 18,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: NavigationBar(
          selectedIndex: currentIndex,
          onDestinationSelected: onTap,
          height: 70,
          backgroundColor: Colors.transparent,
          surfaceTintColor: Colors.transparent,
          indicatorColor: tabs[currentIndex].color.withValues(alpha: 0.18),
          elevation: 0,
          animationDuration: const Duration(milliseconds: 300),
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          destinations: [
            for (int i = 0; i < tabs.length; i++) _buildDestination(tabs[i], i),
          ],
        ),
      ),
    );
  }

  NavigationDestination _buildDestination(_TabSpec t, int index) {
    final isDemandes = index == 2;
    Widget iconWidget = Icon(t.icon);
    Widget activeWidget = Icon(t.activeIcon);
    if (isDemandes) {
      iconWidget = Badge(
        isLabelVisible: pendingDemandes > 0,
        label: Text('$pendingDemandes'),
        child: Icon(t.icon),
      );
      activeWidget = Badge(
        isLabelVisible: pendingDemandes > 0,
        label: Text('$pendingDemandes'),
        child: Icon(t.activeIcon),
      );
    }
    return NavigationDestination(
      icon: iconWidget,
      selectedIcon: activeWidget,
      label: t.label,
    );
  }
}
