import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';

import 'core/api_client.dart' as core_api;
import 'core/constants/storage_keys.dart';
import 'core/notification_service.dart';
import 'core/realtime_service.dart';
import 'core/services/local_storage_service.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_bootstrap.dart';
import 'core/token_store.dart';
import 'data/repositories/deliveries_repository_api.dart'
as deliveries_repo;
import 'data/services/auth_service.dart';
import 'data/services/client_claims_service.dart';
import 'data/services/commande_lock_service.dart';
import 'data/services/confirmatrice_claims_service.dart';
import 'data/services/confirmatrice_orders_service.dart';
import 'data/services/confirmatrice_status_service.dart';
import 'data/services/customer_orders_service.dart';
import 'data/services/admin_claims_overview_service.dart';
// n8n webhook supprimé : le chatbot orchestre tout côté backend via
// POST /api/admin/chat/ask, voir AdminChatService.
import 'data/services/admin_chat_service.dart';
import 'data/services/admin_products_service.dart';
import 'data/services/admin_confirmatrices_service.dart';
import 'data/services/admin_drivers_service.dart';
import 'data/services/admin_orders_service.dart';
import 'data/services/dashboard_service.dart';
import 'data/services/avis_service.dart';
import 'data/services/backend_health_service.dart';
import 'data/services/livreur_active_delivery_service.dart';
import 'data/services/livreur_escalation_service.dart';
import 'data/services/livreur_location_service.dart';
import 'data/services/livreur_pool_service.dart';
import 'data/services/livreur_stats_service.dart';
import 'data/services/offline_queue_service.dart';
import 'data/services/offline_photos_queue_service.dart';
import 'state/admin_filters_provider.dart';
import 'state/livreur_stats_provider.dart';
import 'state/admin_claims_overview_provider.dart';
import 'state/admin_products_provider.dart';
import 'state/chat/admin_chat_provider.dart';
import 'state/admin_confirmatrices_provider.dart';
import 'state/admin_drivers_provider.dart';
import 'state/admin_orders_provider.dart';
import 'state/app_nav_provider.dart';
import 'state/livreur_pool_provider.dart';
import 'state/auth_provider.dart';
import 'state/avis_provider.dart';
import 'state/client_claims_provider.dart';
import 'state/client_demandes_provider.dart';
import 'state/confirmatrice_claims_provider.dart';
import 'state/confirmatrice_orders_provider.dart';
import 'state/confirmatrice_status_provider.dart';
import 'state/notification_preferences.dart';
import 'state/customer_orders_provider.dart';
import 'state/dashboard_provider.dart';
import 'state/deliveries_provider.dart';
import 'state/navigation_provider.dart';
import 'state/theme_provider.dart';
import 'ui/admin/admin_home.dart';
import 'ui/confirmatrice_home.dart';
import 'ui/customer_home.dart';
import 'ui/home.dart';
import 'ui/screens/login_screen.dart';
import 'ui/screens/onboarding_screen.dart';
import 'ui/screens/splash_screen.dart';
import 'ui/screens/transit/transit_home_screen.dart';
import 'ui/screens/supervisor/supervisor_home_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('fr_FR', null);
  await NotificationService.I.init();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final tokenStore = TokenStore();
    final api = core_api.ApiClient(tokenStore: tokenStore);
    final authService = AuthService(
      api: api,
      tokenStore: tokenStore,
    );

    // Refonte 2026-05-11 : le callback 401 est branché ci-dessous au moment
    // où l'AuthProvider est créé, pour qu'il puisse purger le token ET
    // mettre session=null + notifyListeners() (déclenche la bascule vers
    // LoginScreen au prochain build du _Root).

    // Refonte 2026-05-10 — Section 1.7 + 2.15 : services hors ligne globaux.
    final health = BackendHealthService()..startHeartbeat();
    final offline = OfflineQueueService(api, health);
    // ignore: discarded_futures
    offline.init();
    // V2-2 — queue dédiée aux photos (multipart binaire, fichier persisté).
    final photosQueue = OfflinePhotosQueueService(api, health);
    // ignore: discarded_futures
    photosQueue.init();
    final livreurLoc = LivreurLocationService(LivreurActiveDeliveryService(api), health);
    // ignore: discarded_futures
    livreurLoc.init();

    // Section 2.24 — RealtimeService unique partagé par tous les rôles.
    // Permet à ThemeChanged d'atteindre les 4 apps (admin/livreur/conf/client)
    // et évite de multiplier les connexions au hub /hubs/reclamations.
    // ensureConnected() est déclenché plus bas après le login (token requis).
    final realtime = RealtimeService(
      tokenStore: tokenStore,
      baseUrl: api.baseUrl,
    );

    return MultiProvider(
      providers: [
        Provider<core_api.ApiClient>.value(value: api),
        Provider<RealtimeService>.value(value: realtime),
        ChangeNotifierProvider.value(value: health),
        ChangeNotifierProvider.value(value: offline),
        ChangeNotifierProvider.value(value: photosQueue),
        ChangeNotifierProvider.value(value: livreurLoc),
        ChangeNotifierProvider(
          create: (_) => AppNavProvider(),
        ),
        ChangeNotifierProvider(
          create: (_) {
            final tp = ThemeProvider();
            // Charge la préférence locale puis lance le bootstrap admin
            // (cache → fetch /api/admin/config/theme), non bloquant.
            // ignore: discarded_futures
            tp.load().then((_) => ThemeBootstrap.bootstrap(tp, api));
            // Section 2.24 — Réception SignalR ThemeChanged → MAJ instantanée
            // de la couleur/mode dans toutes les apps connectées.
            realtime.themeChanged.listen((ev) {
              final color = ev.primaryColor;
              if (color != null && color.isNotEmpty) {
                tp.setPrimaryColorHex(color);
              }
              final mode = ev.themeMode;
              if (mode != null && mode.isNotEmpty) {
                tp.setThemeModeFromString(mode, persist: true);
              }
            });
            return tp;
          },
        ),
        ChangeNotifierProvider(
          create: (_) {
            final provider = AuthProvider(authService);
            // Sur 401 reçu n'importe où dans l'app → purge session + redirige
            // login (gestion centralisée via ApiClient.onUnauthorized).
            api.onUnauthorized = () {
              // ignore: discarded_futures
              provider.logout();
            };
            // ignore: discarded_futures
            provider.tryAutoLogin().then((_) {
              // Section 2.24 — connecte le hub SignalR dès qu'on a un token,
              // pour recevoir ThemeChanged même hors écran rôle-spécifique.
              if (provider.session != null) {
                // ignore: discarded_futures
                realtime.ensureConnected();
              }
            });
            // Reconnecte le hub à chaque login ultérieur.
            provider.addListener(() {
              if (provider.session != null) {
                // ignore: discarded_futures
                realtime.ensureConnected();
              }
            });
            return provider;
          },
        ),
        ChangeNotifierProvider(
          create: (_) => NavigationProvider(),
        ),
        ChangeNotifierProvider(
          create: (_) => DashboardProvider(
            DashboardService(api),
          ),
        ),
        // Phase 10 — préférence son notifs (globale, persistée).
        ChangeNotifierProvider(
          create: (_) => NotificationPreferences()..load(),
        ),
      ],
      child: _AppView(api: api),
    );
  }
}

class _AppView extends StatelessWidget {
  final core_api.ApiClient api;

  const _AppView({
    required this.api,
  });

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Delivery App',
      theme: AppTheme.lightThemeFor(themeProvider.primaryColor),
      darkTheme: AppTheme.darkThemeFor(themeProvider.primaryColor),
      themeMode: themeProvider.themeMode,
      home: _Root(api: api),
    );
  }
}

class _Root extends StatefulWidget {
  final core_api.ApiClient api;

  const _Root({
    required this.api,
  });

  @override
  State<_Root> createState() => _RootState();
}

class _RootState extends State<_Root> {
  bool? _onboardingSeen;

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
    setState(() => _onboardingSeen = seen);
  }

  Future<void> _finishOnboarding() async {
    await LocalStorageService.setBool(
      StorageKeys.onboardingSeen,
      true,
    );

    if (!mounted) return;
    setState(() => _onboardingSeen = true);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (_onboardingSeen == null) {
      return const SplashScreen(
        subtitle: 'Préparation de l’application...',
      );
    }

    if (!_onboardingSeen!) {
      return OnboardingScreen(
        onDone: _finishOnboarding,
      );
    }

    if (auth.loading && auth.session == null) {
      return const SplashScreen();
    }

    if (auth.session == null) {
      return const LoginScreen();
    }

    final session = auth.session!;

    if (session.canUseSupervisorApp) {
      return SupervisorHomeScreen(api: widget.api);
    }

    if (session.canUseTransitApp) {
      return TransitHomeScreen(api: widget.api);
    }

    if (session.canUseAdminApp) {
      return MultiProvider(
        providers: [
          Provider<core_api.ApiClient>.value(value: widget.api),
          ChangeNotifierProvider(
            create: (_) => AdminFiltersProvider(),
          ),
          ChangeNotifierProvider(
            create: (_) => AdminOrdersProvider(
              AdminOrdersService(widget.api),
            ),
          ),
          ChangeNotifierProvider(
            create: (_) => AdminDriversProvider(
              AdminDriversService(widget.api),
            ),
          ),
          ChangeNotifierProvider(
            create: (_) => AdminConfirmatricesProvider(
              AdminConfirmatricesService(widget.api),
            ),
          ),
          ChangeNotifierProvider(
            create: (_) => AdminClaimsOverviewProvider(
              AdminClaimsOverviewService(widget.api),
            ),
          ),
          ChangeNotifierProvider(
            create: (_) => AdminProductsProvider(
              AdminProductsService(widget.api),
            ),
          ),
          ChangeNotifierProvider(
            create: (_) => AdminChatProvider(
              AdminChatService(api: widget.api),
            ),
          ),
        ],
        child: const AdminHome(),
      );
    }

    if (session.canUseDriverApp) {
      // Section 2.15 — branche le repository sur l'OfflineQueueService global
      // pour les actions de statut (LIVRE / REPORTE / RETOUR / EN_LIVRAISON).
      final deliveriesRepository = deliveries_repo.DeliveriesRepositoryApi(
        api: widget.api,
        offline: context.read<OfflineQueueService>(),
      );
      final poolService = LivreurPoolService(widget.api);
      final escalationService = LivreurEscalationService(widget.api);

      return MultiProvider(
        providers: [
          // ApiClient exposé pour les features livreur (signal, escalade,
          // attachés à un écran détail sans polluer le provider).
          Provider<core_api.ApiClient>.value(value: widget.api),
          Provider<LivreurEscalationService>.value(value: escalationService),
          ChangeNotifierProvider(
            create: (_) => DeliveriesProvider(deliveriesRepository),
          ),
          ChangeNotifierProvider(
            create: (_) => LivreurPoolProvider(poolService),
          ),
          ChangeNotifierProvider(
            create: (ctx) => LivreurStatsProvider(
              LivreurStatsService(
                widget.api,
                offline: ctx.read<OfflineQueueService>(),
              ),
            ),
          ),
        ],
        child: const Home(),
      );
    }

    if (session.canUseConfirmatriceApp) {
      final claimsService = ConfirmatriceClaimsService(widget.api);
      final ordersService = ConfirmatriceOrdersService(widget.api);
      final lockService = CommandeLockService(widget.api);
      final statusService = ConfirmatriceStatusService(widget.api);
      // Section 2.24 — réutilise le RealtimeService root (1 connexion partagée).
      final realtime = context.read<RealtimeService>();
      // ignore: discarded_futures
      realtime.ensureConnected();

      return MultiProvider(
        providers: [
          ChangeNotifierProvider(
            create: (_) => ConfirmatriceOrdersProvider(
              ordersService,
              lockService: lockService,
              realtime: realtime,
            )..refresh(status: 0),
          ),
          ChangeNotifierProvider(
            create: (_) => ConfirmatriceClaimsProvider(claimsService)..refresh(),
          ),
          ChangeNotifierProvider(
            create: (_) => ConfirmatriceStatusProvider(statusService),
          ),
        ],
        child: const ConfirmatriceHome(),
      );
    }

    if (session.canUseCustomerApp) {
      // V2-2 — branche les services client sur OfflineQueueService et la queue
      // photos dédiée pour fonctionner hors ligne avec UI optimiste.
      final offlineQueue = context.read<OfflineQueueService>();
      final photosQ = context.read<OfflinePhotosQueueService>();
      final ordersService = CustomerOrdersService(widget.api);
      final claimsService = ClientClaimsService(
        widget.api,
        offline: offlineQueue,
        photosQueue: photosQ,
      );
      final avisService = AvisService(widget.api, offline: offlineQueue);
      // Section 2.24 — réutilise le RealtimeService root (1 connexion partagée).
      final realtime = context.read<RealtimeService>();
      // ignore: discarded_futures
      realtime.ensureConnected();

      return MultiProvider(
        providers: [
          ChangeNotifierProvider(
            create: (_) => CustomerOrdersProvider(ordersService),
          ),
          ChangeNotifierProvider(
            create: (_) => ClientClaimsProvider(claimsService)..refresh(),
          ),
          ChangeNotifierProvider(
            create: (_) => ClientDemandesProvider(claimsService)..refresh(),
          ),
          ChangeNotifierProvider(
            create: (_) => AvisProvider(avisService),
          ),
        ],
        child: const CustomerHome(),
      );
    }

    return _UnsupportedRoleScreen(
      roles: session.roles,
      onLogout: () => context.read<AuthProvider>().logout(),
    );
  }
}

class _UnsupportedRoleScreen extends StatelessWidget {
  final List<String> roles;
  final VoidCallback onLogout;

  const _UnsupportedRoleScreen({
    required this.roles,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rôle non supporté'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.admin_panel_settings_outlined,
                  size: 56,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(height: 16),
                Text(
                  'Ce compte est authentifié, mais cette application Flutter ne gère pas encore cet espace.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Rôles détectés : ${roles.join(', ')}',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: onLogout,
                  icon: const Icon(Icons.logout_rounded),
                  label: const Text('Se déconnecter'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}