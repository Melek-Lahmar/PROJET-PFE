import 'package:flutter/material.dart';

import '../../../core/theme/app_status_palette.dart';

/// Template de bottom sheet premium : coins arrondis top, drag handle,
/// padding/safeArea cohérents, titre optionnel. Utilisé pour harmoniser
/// toutes les bottom sheets de l'app (filtres, sélecteurs, confirmations).
class PremiumBottomSheet extends StatelessWidget {
  final String? title;
  final String? subtitle;
  final Widget child;
  final bool draggable;
  final double initialChildSize;
  final double minChildSize;
  final double maxChildSize;

  const PremiumBottomSheet({
    super.key,
    required this.child,
    this.title,
    this.subtitle,
    this.draggable = false,
    this.initialChildSize = 0.5,
    this.minChildSize = 0.25,
    this.maxChildSize = 0.95,
  });

  /// Helper : show a PremiumBottomSheet avec tous les réglages par défaut.
  /// Évite de répéter le Material / radii / isScrollControlled partout.
  static Future<T?> show<T>({
    required BuildContext context,
    required WidgetBuilder builder,
    bool isScrollControlled = true,
    bool draggable = false,
  }) {
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: isScrollControlled,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => PremiumBottomSheet(
        draggable: draggable,
        child: Builder(builder: builder),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    Widget body = Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Handle drag
          Center(
            child: Container(
              width: 44,
              height: 4,
              margin: const EdgeInsets.only(top: 10, bottom: 10),
              decoration: BoxDecoration(
                color: scheme.outlineVariant,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
          if (title != null) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
              child: Text(
                title!,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
            ),
          ],
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
              child: Text(
                subtitle!,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
              ),
            ),
          ],
          if (title != null || subtitle != null) const SizedBox(height: 10),
          Flexible(child: child),
          const SizedBox(height: 12),
        ],
      ),
    );

    if (draggable) {
      body = DraggableScrollableSheet(
        expand: false,
        initialChildSize: initialChildSize,
        minChildSize: minChildSize,
        maxChildSize: maxChildSize,
        builder: (_, scroll) => SingleChildScrollView(
          controller: scroll,
          child: body,
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius:
            const BorderRadius.vertical(top: Radius.circular(PremiumTokens.rXl)),
        boxShadow: PremiumTokens.cardShadow(
          Theme.of(context).brightness == Brightness.dark,
        ),
      ),
      child: SafeArea(
        top: false,
        child: body,
      ),
    );
  }
}
