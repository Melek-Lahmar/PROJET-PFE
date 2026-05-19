import 'package:flutter/material.dart';

class AppDialogs {
  AppDialogs._();

  static Future<bool> confirm(
      BuildContext context, {
        required String title,
        required String message,
        String confirmText = 'Confirmer',
        String cancelText = 'Annuler',
        IconData icon = Icons.help_outline_rounded,
        Color? accentColor,
      }) async {
    final scheme = Theme.of(context).colorScheme;
    final color = accentColor ?? scheme.primary;

    final result = await showDialog<bool>(
      context: context,
      builder: (_) {
        return AlertDialog(
          title: Row(
            children: [
              Icon(icon, color: color),
              const SizedBox(width: 10),
              Expanded(child: Text(title)),
            ],
          ),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(cancelText),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(confirmText),
            ),
          ],
        );
      },
    );

    return result ?? false;
  }

  static Future<void> info(
      BuildContext context, {
        required String title,
        required String message,
        String buttonText = 'OK',
        IconData icon = Icons.info_outline_rounded,
        Color? accentColor,
      }) async {
    final scheme = Theme.of(context).colorScheme;
    final color = accentColor ?? scheme.primary;

    await showDialog<void>(
      context: context,
      builder: (_) {
        return AlertDialog(
          title: Row(
            children: [
              Icon(icon, color: color),
              const SizedBox(width: 10),
              Expanded(child: Text(title)),
            ],
          ),
          content: Text(message),
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: Text(buttonText),
            ),
          ],
        );
      },
    );
  }

  static Future<void> success(
      BuildContext context, {
        required String title,
        required String message,
        String buttonText = 'OK',
      }) async {
    await info(
      context,
      title: title,
      message: message,
      buttonText: buttonText,
      icon: Icons.check_circle_outline_rounded,
      accentColor: Colors.green,
    );
  }

  static Future<void> error(
      BuildContext context, {
        required String title,
        required String message,
        String buttonText = 'Fermer',
      }) async {
    await info(
      context,
      title: title,
      message: message,
      buttonText: buttonText,
      icon: Icons.error_outline_rounded,
      accentColor: Colors.red,
    );
  }
}