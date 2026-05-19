import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../data/services/admin_claims_overview_service.dart';
import '../../../data/services/admin_confirmatrices_service.dart';
import '../../../data/services/admin_drivers_service.dart';
import '../../../data/services/admin_orders_service.dart';
import '../../../data/services/admin_products_service.dart';
import '../../../models/admin_claims_overview.dart';
import '../../../models/admin_confirmatrice.dart';
import '../../../models/admin_dashboard_overview.dart' show AdminKpi;
import '../../../models/admin_driver.dart';
import '../../../models/admin_orders_page.dart';
import '../../../models/admin_products_overview.dart';
import 'kpi_detail_premium_screen.dart';
import 'orders/admin_order_detail_drawer.dart';

/// A.1 — Domaine du KPI cliqué. Détermine quel endpoint admin alimente
/// la liste des entités réelles affichée sous le graphique.
enum KpiDomain {
  dashboard,
  orders,
  drivers,
  confirmatrices,
  claims,
  products,
}

/// A.1 — Résout un KPI cliqué (par `kpi.key` + domaine) vers l'écran
/// `KpiDetailPremiumScreen` qui charge la VRAIE liste d'entités (commande
/// par commande, livreur par livreur, etc.) depuis les endpoints admin.
///
/// L'objectif : remplacer le mock "Période N" par les lignes réelles
/// que l'admin peut ouvrir au tap pour voir le détail entité.
class KpiDrillDownResolver {
  KpiDrillDownResolver._();

  static Future<void> openDrillDown({
    required BuildContext context,
    required AdminKpi kpi,
    required IconData icon,
    required Color accent,
    required KpiDomain domain,
  }) async {
    await Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => _buildScreen(
        context: context,
        kpi: kpi,
        icon: icon,
        accent: accent,
        domain: domain,
      ),
    ));
  }

  static Widget _buildScreen({
    required BuildContext context,
    required AdminKpi kpi,
    required IconData icon,
    required Color accent,
    required KpiDomain domain,
  }) {
    final api = context.read<ApiClient>();
    switch (domain) {
      case KpiDomain.orders:
      case KpiDomain.dashboard:
        return _ordersDrillDown(
          api: api,
          kpi: kpi,
          icon: icon,
          accent: accent,
        );
      case KpiDomain.drivers:
        return _driversDrillDown(
          api: api,
          kpi: kpi,
          icon: icon,
          accent: accent,
        );
      case KpiDomain.confirmatrices:
        return _confirmatricesDrillDown(
          api: api,
          kpi: kpi,
          icon: icon,
          accent: accent,
        );
      case KpiDomain.claims:
        return _claimsDrillDown(
          api: api,
          kpi: kpi,
          icon: icon,
          accent: accent,
        );
      case KpiDomain.products:
        return _productsDrillDown(
          api: api,
          kpi: kpi,
          icon: icon,
          accent: accent,
        );
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // ORDERS — Liste réelle des commandes (1 ligne = 1 commande)
  // ════════════════════════════════════════════════════════════════════
  static Widget _ordersDrillDown({
    required ApiClient api,
    required AdminKpi kpi,
    required IconData icon,
    required Color accent,
  }) {
    final status = _ordersStatusFor(kpi.key);
    return KpiDetailPremiumScreen<AdminOrderListItem>(
      title: kpi.label,
      subtitle: kpi.formattedValue,
      icon: icon,
      accent: accent,
      chartType: _chartTypeForOrders(kpi.key),
      loadData: (period) async {
        final svc = AdminOrdersService(api);
        final page = await svc.getPage(
          period: _toApiPeriod(period),
          status: status,
          pageSize: 50,
        );
        final items = page.items;
        // Série pour le graphique : agrégation par jour des dates.
        final series = _buildOrdersSeries(items);
        return KpiData(series: series, items: items);
      },
      searchFilter: (it, q) {
        if (q.isEmpty) return true;
        final lower = q.toLowerCase();
        return it.piece.toLowerCase().contains(lower) ||
            (it.clientName ?? '').toLowerCase().contains(lower) ||
            (it.telephone ?? '').toLowerCase().contains(lower) ||
            (it.ville ?? '').toLowerCase().contains(lower);
      },
      buildRow: (ctx, it) {
        final statusColor = _orderStatusColor(it);
        return KpiPremiumRow(
          leading: _statusAvatar(statusColor, Icons.inventory_2_rounded),
          title: it.piece,
          subtitle: _ordersSubtitle(it),
          value: it.amount == null
              ? '—'
              : '${it.amount!.toStringAsFixed(3)} DT',
          valueColor: statusColor,
          accentColor: statusColor,
          statusLabel: _orderStatusLabel(it),
          onTap: () => AdminOrderDetailDrawer.show(ctx, it.piece),
        );
      },
    );
  }

  /// Label court humanisé du statut d'une commande pour la pill colorée.
  static String _orderStatusLabel(AdminOrderListItem it) {
    final s = (it.deliveryStatus ?? it.orderStatus).toUpperCase();
    switch (s) {
      case 'LIVRE':
        return 'Livrée';
      case 'EN_LIVRAISON':
        return 'En livraison';
      case 'CONFIRME':
        return 'Confirmée';
      case 'TENTATIVE':
        return 'Tentative';
      case 'REPORTE':
        return 'Reportée';
      case 'RETOUR':
        return 'Retour';
      case 'DEPOT':
        return 'Au dépôt';
      case 'REFUSE':
        return 'Refusée';
      case 'EN_ATTENTE':
        return 'En attente';
      default:
        return s.replaceAll('_', ' ').toLowerCase();
    }
  }

  static String _ordersStatusFor(String kpiKey) {
    switch (kpiKey) {
      case 'pending':
        return 'pending';
      case 'confirmed':
        return 'confirmed';
      case 'tentative':
        return 'tentative';
      case 'refused':
        return 'refused';
      case 'inDelivery':
      case 'inProgress':
        return 'inDelivery';
      case 'delivered':
        return 'delivered';
      case 'returned':
        return 'returned';
      case 'postponed':
        return 'postponed';
      default:
        return 'all';
    }
  }

  static KpiChartType _chartTypeForOrders(String key) {
    if (key == 'deliveryRate' || key == 'returnRate' || key == 'postponedRate') {
      return KpiChartType.distribution;
    }
    return KpiChartType.timeline;
  }

  static List<KpiSeriesPoint> _buildOrdersSeries(
      List<AdminOrderListItem> items) {
    if (items.isEmpty) return const [];
    final byDay = <String, int>{};
    for (final it in items) {
      final d = it.date?.toLocal();
      if (d == null) continue;
      final key =
          '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
      byDay[key] = (byDay[key] ?? 0) + 1;
    }
    final sorted = byDay.keys.toList()..sort();
    return [
      for (final k in sorted.take(30))
        KpiSeriesPoint(k.substring(5), byDay[k]!.toDouble()),
    ];
  }

  static String _ordersSubtitle(AdminOrderListItem it) {
    final parts = <String>[];
    final clientLine = (it.clientName ?? it.tiers ?? '').trim();
    if (clientLine.isNotEmpty) parts.add(clientLine);
    if ((it.ville ?? '').trim().isNotEmpty) parts.add(it.ville!);
    final st = it.deliveryStatus ?? it.orderStatus;
    parts.add(st);
    if (it.date != null) {
      final d = it.date!.toLocal();
      parts.add(
          '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}');
    }
    return parts.join(' · ');
  }

  static Color _orderStatusColor(AdminOrderListItem it) {
    final s = (it.deliveryStatus ?? it.orderStatus).toUpperCase();
    switch (s) {
      case 'LIVRE':
        return const Color(0xFF22C55E);
      case 'EN_LIVRAISON':
        return const Color(0xFF0EA5E9);
      case 'CONFIRME':
        return const Color(0xFF6366F1);
      case 'TENTATIVE':
        return const Color(0xFFF59E0B);
      case 'REPORTE':
        return const Color(0xFFF97316);
      case 'RETOUR':
        return const Color(0xFFEF4444);
      case 'DEPOT':
        return const Color(0xFFA855F7);
      case 'REFUSE':
        return const Color(0xFF991B1B);
      default:
        return const Color(0xFF6B7280);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // DRIVERS — Liste réelle des livreurs
  // ════════════════════════════════════════════════════════════════════
  static Widget _driversDrillDown({
    required ApiClient api,
    required AdminKpi kpi,
    required IconData icon,
    required Color accent,
  }) {
    return KpiDetailPremiumScreen<AdminDriverListItem>(
      title: kpi.label,
      subtitle: kpi.formattedValue,
      icon: icon,
      accent: accent,
      chartType: KpiChartType.comparison,
      loadData: (period) async {
        final svc = AdminDriversService(api);
        final page = await svc.getPage(period: _toApiPeriod(period));
        var items = page.items;
        // Filtrage selon le KPI cliqué.
        switch (kpi.key) {
          case 'online':
            items = items.where((d) => d.online && !d.inPause).toList();
            break;
          case 'inPause':
            items = items.where((d) => d.inPause).toList();
            break;
          case 'topPerformer':
            items = [...items]
              ..sort((a, b) => b.ordersDelivered.compareTo(a.ordersDelivered));
            items = items.take(20).toList();
            break;
        }
        final series = [
          for (final d in items.take(8))
            KpiSeriesPoint(
              (d.fullName ?? '—').split(' ').first,
              d.ordersDelivered.toDouble(),
            ),
        ];
        return KpiData(series: series, items: items);
      },
      searchFilter: (it, q) {
        final lower = q.toLowerCase();
        return (it.fullName ?? '').toLowerCase().contains(lower) ||
            (it.phone ?? '').toLowerCase().contains(lower) ||
            (it.governorate ?? '').toLowerCase().contains(lower);
      },
      buildRow: (ctx, it) {
        final color = it.inPause
            ? const Color(0xFFF59E0B)
            : it.online
                ? const Color(0xFF22C55E)
                : const Color(0xFF9CA3AF);
        return KpiPremiumRow(
          leading: _statusAvatar(color, Icons.delivery_dining_rounded),
          title: it.fullName ?? '—',
          subtitle: '${it.phone ?? '—'} · ${it.governorate ?? '—'}',
          value: '${it.ordersDelivered} livr.',
          valueColor: color,
          accentColor: color,
          statusLabel: it.inPause
              ? 'En pause'
              : it.online
                  ? 'En ligne'
                  : 'Hors ligne',
        );
      },
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // CONFIRMATRICES — Liste réelle des confirmatrices
  // ════════════════════════════════════════════════════════════════════
  static Widget _confirmatricesDrillDown({
    required ApiClient api,
    required AdminKpi kpi,
    required IconData icon,
    required Color accent,
  }) {
    return KpiDetailPremiumScreen<AdminConfirmatriceListItem>(
      title: kpi.label,
      subtitle: kpi.formattedValue,
      icon: icon,
      accent: accent,
      chartType: KpiChartType.comparison,
      loadData: (period) async {
        final svc = AdminConfirmatricesService(api);
        final page = await svc.getPage(period: _toApiPeriod(period));
        var items = page.items;
        switch (kpi.key) {
          case 'online':
            items = items.where((c) => c.online && !c.inPause).toList();
            break;
          case 'inPause':
            items = items.where((c) => c.inPause).toList();
            break;
        }
        final series = [
          for (final c in items.take(8))
            KpiSeriesPoint(
              (c.fullName ?? '—').split(' ').first,
              c.claimsClosed.toDouble(),
            ),
        ];
        return KpiData(series: series, items: items);
      },
      searchFilter: (it, q) {
        final lower = q.toLowerCase();
        return (it.fullName ?? '').toLowerCase().contains(lower) ||
            (it.phone ?? '').toLowerCase().contains(lower) ||
            (it.governorate ?? '').toLowerCase().contains(lower);
      },
      buildRow: (ctx, it) {
        final color = it.inPause
            ? const Color(0xFFF59E0B)
            : it.online
                ? const Color(0xFF22C55E)
                : const Color(0xFF9CA3AF);
        return KpiPremiumRow(
          leading: _statusAvatar(color, Icons.headset_mic_rounded),
          title: it.fullName ?? '—',
          subtitle:
              '${it.phone ?? '—'} · ${it.claimsInProgress} en cours · ${it.claimsClosed} clos',
          value: it.inPause
              ? 'En pause'
              : it.online
                  ? 'En ligne'
                  : 'Hors ligne',
          valueColor: color,
          accentColor: color,
          statusLabel: it.inPause
              ? 'En pause'
              : it.online
                  ? 'En ligne'
                  : 'Hors ligne',
        );
      },
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // CLAIMS — Réclamations + demandes
  // ════════════════════════════════════════════════════════════════════
  static Widget _claimsDrillDown({
    required ApiClient api,
    required AdminKpi kpi,
    required IconData icon,
    required Color accent,
  }) {
    return KpiDetailPremiumScreen<AdminClaimRow>(
      title: kpi.label,
      subtitle: kpi.formattedValue,
      icon: icon,
      accent: accent,
      chartType: KpiChartType.distribution,
      loadData: (period) async {
        final svc = AdminClaimsOverviewService(api);
        final ov = await svc.getOverview(period: _toApiPeriod(period));
        var items = ov.unhandledCases;
        switch (kpi.key) {
          case 'claims_total':
          case 'reclamations':
            items = items.where((c) => c.typeCas == 'RECLAMATION').toList();
            break;
          case 'requests_total':
          case 'demandes':
            items = items.where((c) => c.typeCas == 'DEMANDE').toList();
            break;
        }
        final series = [
          for (final b in ov.claimsStatusBreakdown.take(5))
            KpiSeriesPoint(b.label, b.count.toDouble()),
        ];
        return KpiData(series: series, items: items);
      },
      searchFilter: (it, q) {
        final lower = q.toLowerCase();
        return it.code.toLowerCase().contains(lower) ||
            it.doPiece.toLowerCase().contains(lower) ||
            it.motif.toLowerCase().contains(lower);
      },
      buildRow: (ctx, it) {
        final color = _claimStatusColor(it.statut);
        return KpiPremiumRow(
          leading: _statusAvatar(
            color,
            it.typeCas == 'DEMANDE'
                ? Icons.local_shipping_rounded
                : Icons.report_problem_rounded,
          ),
          title: '#${it.code}',
          subtitle: '${it.motif} · ${it.doPiece} · ${it.hoursOpen}h',
          value: '${it.hoursOpen}h',
          valueColor: color,
          accentColor: color,
          statusLabel: _claimStatusLabel(it.statut),
          // Tap → ouvre le détail commande lié à la réclamation (le DoPiece).
          // Permet d'accéder à l'historique complet de la commande sans
          // changer d'onglet admin.
          onTap: () => AdminOrderDetailDrawer.show(ctx, it.doPiece),
        );
      },
    );
  }

  static Color _claimStatusColor(String s) {
    switch (s) {
      case 'ENVOYEE':
        return const Color(0xFFF59E0B);
      case 'EN_COURS_DE_TRAITEMENT':
        return const Color(0xFF0EA5E9);
      case 'CLOTUREE':
        return const Color(0xFF22C55E);
      case 'REFUSEE':
        return const Color(0xFFEF4444);
      default:
        return const Color(0xFF6B7280);
    }
  }

  static String _claimStatusLabel(String s) {
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
        return s.replaceAll('_', ' ').toLowerCase();
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // PRODUCTS — Top produits par quantité / revenu / retours
  // ════════════════════════════════════════════════════════════════════
  static Widget _productsDrillDown({
    required ApiClient api,
    required AdminKpi kpi,
    required IconData icon,
    required Color accent,
  }) {
    return KpiDetailPremiumScreen<AdminProductRow>(
      title: kpi.label,
      subtitle: kpi.formattedValue,
      icon: icon,
      accent: accent,
      chartType: KpiChartType.comparison,
      loadData: (period) async {
        final svc = AdminProductsService(api);
        final ov = await svc.getOverview(period: _toApiPeriod(period), topN: 20);
        List<AdminProductRow> items;
        switch (kpi.key) {
          case 'topRevenue':
          case 'revenue':
            items = ov.topByRevenue;
            break;
          case 'topReturns':
          case 'returns':
            items = ov.topByReturns;
            break;
          default:
            items = ov.topByQuantity;
        }
        final series = [
          for (final p in items.take(8))
            KpiSeriesPoint(
              (p.designation ?? p.articleRef).split(' ').first,
              kpi.key == 'topRevenue' ? p.revenue : p.quantity.toDouble(),
            ),
        ];
        return KpiData(series: series, items: items);
      },
      searchFilter: (it, q) {
        final lower = q.toLowerCase();
        return it.articleRef.toLowerCase().contains(lower) ||
            (it.designation ?? '').toLowerCase().contains(lower);
      },
      buildRow: (ctx, it) {
        // Sur Products on n'a pas de "statut" à proprement parler — on accent
        // selon le KPI cliqué : vert (revenue), rouge (returns), violet (qty).
        final color = kpi.key == 'topReturns' || kpi.key == 'returns'
            ? const Color(0xFFEF4444)
            : kpi.key == 'topRevenue' || kpi.key == 'revenue'
                ? const Color(0xFF22C55E)
                : const Color(0xFFA855F7);
        return KpiPremiumRow(
          leading: _statusAvatar(color, Icons.inventory_rounded),
          title: it.designation ?? it.articleRef,
          subtitle:
              '${it.articleRef} · ${it.quantity.toStringAsFixed(0)} pcs · ${it.ordersCount} cmds',
          value: '${it.revenue.toStringAsFixed(0)} DT',
          valueColor: color,
          accentColor: color,
        );
      },
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // Helpers communs
  // ════════════════════════════════════════════════════════════════════
  static String _toApiPeriod(KpiPeriod p) {
    switch (p.key) {
      case 'today':
        return 'today';
      case 'week':
        return '7d';
      case 'month':
      default:
        return '30d';
    }
  }

  static Widget _statusAvatar(Color color, IconData icon) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, color: color, size: 20),
    );
  }
}
