import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/constants/storage_keys.dart';
import '../core/notification_service.dart';
import '../core/services/local_storage_service.dart';
import '../core/theme/app_status_palette.dart';
import '../models/delivery.dart';
import '../state/app_nav_provider.dart';
import '../state/deliveries_provider.dart';
import 'screens/livreur/delivery_details_screen.dart';
import 'screens/livreur/livreur_profile_screen.dart';
import 'screens/livreur/livreur_stats_screen.dart';
import 'screens/livreur/my_orders_screen.dart';
import 'screens/livreur/new_orders_screen.dart';
import 'screens/map_screen.dart' as map_screen;
import 'widgets/connection_banner.dart';

/// Home livreur — 5 onglets métier :
/// 1. Nouvelles commandes — celles qui peuvent être prises
/// 2. Mes livraisons — celles déjà acceptées
/// 3. Carte — tournée OSRM
/// 4. Statistiques — dashboard
/// 5. Profil — identité + paramètres
///
/// Refonte premium : AppBar minimaliste, bottom nav M3 arrondie, transitions
/// douces entre onglets, titre contextuel qui se lit comme une conversation.
class Home extends StatefulWidget {
  const Home({super.key});

  @override
  State<Home> createState() => _HomeState();
}

class _HomeState extends State<Home> with WidgetsBindingObserver {
  StreamSubscription<String>? _notifSub;

  static const _titles = [
    'Nouvelles commandes',
    'Mes livraisons',
    'Carte',
    'Statistiques',
    'Profil',
  ];

  List<Widget> _buildPages() => const [
        LivreurNewOrdersScreen(),
        LivreurMyOrdersScreen(),
        map_screen.MapScreen(),
        // Section 2.1 — onglet Stats refondu (sélecteur date, hero, cashbox, etc.).
        // L'ancien dashboard reste accessible mais Stats devient le défaut.
        LivreurStatsScreen(),
        LivreurProfileScreen(),
      ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _init();
    _notifSub = NotificationService.I.onArrivalTap.listen(_handleArrivalTap);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      context.read<DeliveriesProvider>().refresh();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _notifSub?.cancel();
    context.read<DeliveriesProvider>().stopAutoRefresh();
    super.dispose();
  }

  Future<void> _init() async {
    final del = context.read<DeliveriesProvider>();
    await _restoreLastTab();
    await del.refresh();
    del.startAutoRefresh(every: const Duration(seconds: 30));
  }

  Future<void> _restoreLastTab() async {
    final saved = await LocalStorageService.getInt(
      StorageKeys.lastTabIndex,
      defaultValue: 0,
    );
    if (!mounted) return;
    final safe = saved.clamp(0, _titles.length - 1);
    context.read<AppNavProvider>().setIndex(safe);
  }

  Future<void> _saveLastTab(int index) {
    return LocalStorageService.setInt(StorageKeys.lastTabIndex, index);
  }

  Future<void> _onTabChanged(int index) async {
    context.read<AppNavProvider>().setIndex(index);
    await _saveLastTab(index);
  }

  Future<void> _handleArrivalTap(String doPiece) async {
    if (!mounted) return;

    final del = context.read<DeliveriesProvider>();
    final nav = context.read<AppNavProvider>();

    // L'arrivée à un stop amène sur la carte + ouvre la page détail
    // premium, plus cohérent avec le reste de la nouvelle expérience.
    nav.setIndex(2); // Carte
    await _saveLastTab(2);
    await del.refresh();

    final found = _findDelivery(del, doPiece);
    if (found == null || !mounted) return;

    del.select(found);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => ChangeNotifierProvider.value(
            value: context.read<DeliveriesProvider>(),
            child: DeliveryDetailsScreen(doPiece: doPiece),
          ),
        ),
      );
    });
  }

  Delivery? _findDelivery(DeliveriesProvider del, String doPiece) {
    for (final x in del.myOrders) {
      if (x.doPiece == doPiece) return x;
    }
    for (final x in del.newOrders) {
      if (x.doPiece == doPiece) return x;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final nav = context.watch<AppNavProvider>();
    final idx = nav.index.clamp(0, _titles.length - 1);

    return Scaffold(
      appBar: _buildAppBar(context, idx),
      body: Column(
        children: [
          // Section 1.7.4 — bandeau persistant si connexion instable.
          const ConnectionBanner(),
          Expanded(
            child: AnimatedSwitcher(
              duration: PremiumTokens.normal,
              switchInCurve: Curves.easeOutCubic,
              switchOutCurve: Curves.easeInCubic,
              transitionBuilder: (child, animation) => FadeTransition(
                opacity: animation,
                child: SlideTransition(
                  position: Tween<Offset>(
                    begin: const Offset(0, 0.02),
                    end: Offset.zero,
                  ).animate(animation),
                  child: child,
                ),
              ),
              child: KeyedSubtree(
                key: ValueKey(idx),
                child: _buildPages()[idx],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: _PremiumNavBar(
        selectedIndex: idx,
        onChanged: _onTabChanged,
      ),
    );
  }

  PreferredSizeWidget? _buildAppBar(BuildContext context, int idx) {
    // Carte et Profil gèrent leur propre header visuel ; on masque l'AppBar
    // pour laisser la respiration. Les autres onglets ont leur propre titre
    // dans le body (hero), donc l'AppBar est minimaliste.
    if (idx == 2 || idx == 4) return null;
    return AppBar(
      title: AnimatedSwitcher(
        duration: const Duration(milliseconds: 240),
        switchInCurve: Curves.easeOutCubic,
        transitionBuilder: (child, animation) {
          final slide = Tween<Offset>(
            begin: const Offset(0.06, 0),
            end: Offset.zero,
          ).animate(animation);
          return FadeTransition(
            opacity: animation,
            child: SlideTransition(position: slide, child: child),
          );
        },
        child: Text(
          _titles[idx],
          key: ValueKey<int>(idx),
        ),
      ),
      centerTitle: false,
      elevation: 0,
      scrolledUnderElevation: 0,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      actions: [
        IconButton(
          tooltip: 'Rafraîchir',
          onPressed: () => context.read<DeliveriesProvider>().refresh(),
          icon: const Icon(Icons.refresh_rounded),
        ),
      ],
    );
  }
}

/// Bottom nav M3 premium avec animation douce de l'indicateur
/// (scale+opacity). 5 destinations.
class _PremiumNavBar extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  const _PremiumNavBar({
    required this.selectedIndex,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).scaffoldBackgroundColor,
          boxShadow: PremiumTokens.subtleShadow(
            Theme.of(context).brightness == Brightness.dark,
          ),
        ),
        child: NavigationBar(
          selectedIndex: selectedIndex,
          onDestinationSelected: onChanged,
          height: 70,
          backgroundColor: Colors.transparent,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          animationDuration: PremiumTokens.normal,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.inbox_outlined),
              selectedIcon: Icon(Icons.inbox_rounded),
              label: 'Nouvelles',
            ),
            NavigationDestination(
              icon: Icon(Icons.local_shipping_outlined),
              selectedIcon: Icon(Icons.local_shipping_rounded),
              label: 'Livraisons',
            ),
            NavigationDestination(
              icon: Icon(Icons.map_outlined),
              selectedIcon: Icon(Icons.map_rounded),
              label: 'Carte',
            ),
            NavigationDestination(
              icon: Icon(Icons.insights_outlined),
              selectedIcon: Icon(Icons.insights_rounded),
              label: 'Stats',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline_rounded),
              selectedIcon: Icon(Icons.person_rounded),
              label: 'Profil',
            ),
          ],
        ),
      ),
    );
  }
}
