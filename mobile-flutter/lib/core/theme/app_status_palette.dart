import 'package:flutter/material.dart';

/// Palette centralisée pour les statuts de commandes livreur.
/// Couleurs pensées pour être cohérentes entre les listes, le détail et
/// la timeline. Évite de dupliquer des tons dans chaque écran.
class StatusVisual {
  final Color fg;
  final Color bg;
  final Color border;
  final IconData icon;
  final String label;

  const StatusVisual({
    required this.fg,
    required this.bg,
    required this.border,
    required this.icon,
    required this.label,
  });
}

class AppStatusPalette {
  AppStatusPalette._();

  // Mapping statut numérique → visuel. Inclut l'état "en attente" avant
  // prise en charge (apiStatus CONFIRME).
  // Pour le livreur : distingue DEPOT_EN_COURS_DE_PREPARATION et DEPOT_PRET.
  static StatusVisual forStatut(int statut, {String? apiStatus}) {
    final api = (apiStatus ?? '').toUpperCase();
    if (api == 'CONFIRME' || api == 'EN_ATTENTE') {
      return _pending;
    }
    if (api == 'DEPOT_EN_COURS_DE_PREPARATION') return _depotInPrep;
    if (api == 'DEPOT_PRET') return _depotReady;
    switch (statut) {
      case 1:
        return _pending;
      case 2:
        return _inDelivery;
      case 3:
        return _delivered;
      case 4:
        return _rescheduled;
      case 5:
        return _returned;
      case 6:
        return _depot;
      default:
        return _unknown;
    }
  }

  static const _pending = StatusVisual(
    fg: Color(0xFF7C4F00),
    bg: Color(0xFFFFF4D6),
    border: Color(0xFFE9C46A),
    icon: Icons.inbox_rounded,
    label: 'Nouvelle',
  );

  static const _inDelivery = StatusVisual(
    fg: Color(0xFF0B5EC8),
    bg: Color(0xFFE0EEFF),
    border: Color(0xFF86B7F0),
    icon: Icons.local_shipping_rounded,
    label: 'En livraison',
  );

  static const _delivered = StatusVisual(
    fg: Color(0xFF1F7A35),
    bg: Color(0xFFE7F8EC),
    border: Color(0xFF8FD19E),
    icon: Icons.check_circle_rounded,
    label: 'Livrée',
  );

  static const _rescheduled = StatusVisual(
    fg: Color(0xFFB85C00),
    bg: Color(0xFFFFEAD9),
    border: Color(0xFFF4B183),
    icon: Icons.event_repeat_rounded,
    label: 'Reportée',
  );

  static const _returned = StatusVisual(
    fg: Color(0xFFB42318),
    bg: Color(0xFFFDECEC),
    border: Color(0xFFF2A0A0),
    icon: Icons.undo_rounded,
    label: 'Retournée',
  );

  static const _depot = StatusVisual(
    fg: Color(0xFF4B5563),
    bg: Color(0xFFF1F4F9),
    border: Color(0xFFCBD5E1),
    icon: Icons.warehouse_rounded,
    label: 'Au dépôt',
  );

  // Sous-statut dépôt : le livreur vient de prendre le colis et le
  // prépare au dépôt. Couleur orange "en cours".
  static const _depotInPrep = StatusVisual(
    fg: Color(0xFFB45309),
    bg: Color(0xFFFEF3C7),
    border: Color(0xFFFDE68A),
    icon: Icons.inventory_2_rounded,
    label: 'En préparation',
  );

  // Sous-statut dépôt : le colis est prêt à partir en livraison.
  static const _depotReady = StatusVisual(
    fg: Color(0xFF065F46),
    bg: Color(0xFFD1FAE5),
    border: Color(0xFF6EE7B7),
    icon: Icons.task_alt_rounded,
    label: 'Prêt à livrer',
  );

  static const _unknown = StatusVisual(
    fg: Color(0xFF4B5563),
    bg: Color(0xFFF1F4F9),
    border: Color(0xFFCBD5E1),
    icon: Icons.help_outline_rounded,
    label: 'Inconnu',
  );
}

/// Tokens visuels premium utilisés par les composants : rayons, ombres,
/// durées d'animation. Centralisé pour garantir la cohérence.
class PremiumTokens {
  PremiumTokens._();

  // Rayons
  static const double rSm = 10.0;
  static const double rMd = 14.0;
  static const double rLg = 20.0;
  static const double rXl = 28.0;

  // Durées
  static const Duration fast = Duration(milliseconds: 180);
  static const Duration normal = Duration(milliseconds: 280);
  static const Duration slow = Duration(milliseconds: 400);

  // Ombres (évite les ombres agressives, privilégie diffuse + légère)
  static List<BoxShadow> cardShadow(bool isDark) => [
        BoxShadow(
          color: (isDark ? Colors.black : const Color(0xFF0F172A))
              .withValues(alpha: isDark ? 0.30 : 0.06),
          blurRadius: 22,
          offset: const Offset(0, 10),
        ),
        BoxShadow(
          color: (isDark ? Colors.black : const Color(0xFF0F172A))
              .withValues(alpha: isDark ? 0.18 : 0.03),
          blurRadius: 6,
          offset: const Offset(0, 2),
        ),
      ];

  static List<BoxShadow> subtleShadow(bool isDark) => [
        BoxShadow(
          color: (isDark ? Colors.black : const Color(0xFF0F172A))
              .withValues(alpha: isDark ? 0.20 : 0.04),
          blurRadius: 12,
          offset: const Offset(0, 4),
        ),
      ];

  /// Variante un cran plus marquée pour l'état hover des cartes interactives.
  static List<BoxShadow> cardShadowElevated(bool isDark) => [
        BoxShadow(
          color: (isDark ? Colors.black : const Color(0xFF0F172A))
              .withValues(alpha: isDark ? 0.42 : 0.10),
          blurRadius: 28,
          offset: const Offset(0, 14),
        ),
        BoxShadow(
          color: (isDark ? Colors.black : const Color(0xFF0F172A))
              .withValues(alpha: isDark ? 0.24 : 0.05),
          blurRadius: 8,
          offset: const Offset(0, 3),
        ),
      ];
}
