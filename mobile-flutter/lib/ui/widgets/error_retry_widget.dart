import 'package:flutter/material.dart';

import '../../core/api_exception.dart';

/// Widget standard pour afficher une erreur HTTP/réseau et proposer un retry.
///
/// Usage type dans un écran :
/// ```dart
/// if (provider.error != null) {
///   return ErrorRetryWidget(
///     error: provider.error!,
///     onRetry: provider.load,
///   );
/// }
/// ```
///
/// Si `error` est une [ApiException], on affiche `displayMessage` (déjà adapté
/// au statut HTTP). Sinon on affiche `error.toString()`.
class ErrorRetryWidget extends StatelessWidget {
  final Object error;
  final VoidCallback? onRetry;
  final EdgeInsetsGeometry padding;

  const ErrorRetryWidget({
    super.key,
    required this.error,
    this.onRetry,
    this.padding = const EdgeInsets.all(24),
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (icon, color, message) = _resolve();

    return Center(
      child: SingleChildScrollView(
        padding: padding,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: color),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Réessayer'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  (IconData, Color, String) _resolve() {
    final err = error;
    if (err is ApiException) {
      if (err.isTimeout) {
        return (Icons.schedule_outlined, Colors.orange, err.displayMessage);
      }
      if (err.isNetwork) {
        return (Icons.cloud_off_outlined, Colors.orange, err.displayMessage);
      }
      if (err.isUnauthorized) {
        return (Icons.lock_outline, Colors.red, err.displayMessage);
      }
      if (err.isForbidden) {
        return (Icons.do_not_disturb_outlined, Colors.red, err.displayMessage);
      }
      if (err.isNotFound) {
        return (Icons.search_off_outlined, Colors.grey, err.displayMessage);
      }
      if (err.isServerError) {
        return (Icons.dns_outlined, Colors.red, err.displayMessage);
      }
      return (Icons.error_outline, Colors.red, err.displayMessage);
    }
    return (Icons.error_outline, Colors.red, err.toString());
  }
}

/// Variante compacte pour les zones où l'on n'a pas la place d'afficher
/// l'erreur en plein écran (header de carte, popup, etc.).
class ErrorRetryInline extends StatelessWidget {
  final Object error;
  final VoidCallback? onRetry;

  const ErrorRetryInline({super.key, required this.error, this.onRetry});

  @override
  Widget build(BuildContext context) {
    final message = error is ApiException
        ? (error as ApiException).displayMessage
        : error.toString();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.red.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: Colors.red, size: 20),
          const SizedBox(width: 8),
          Expanded(child: Text(message, style: const TextStyle(fontSize: 13))),
          if (onRetry != null)
            TextButton(onPressed: onRetry, child: const Text('Réessayer')),
        ],
      ),
    );
  }
}
