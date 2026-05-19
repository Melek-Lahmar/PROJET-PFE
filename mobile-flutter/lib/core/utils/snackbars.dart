import 'package:flutter/material.dart';

class AppSnackbars {
  AppSnackbars._();

  static void showInfo(
      BuildContext context,
      String message, {
        Duration duration = const Duration(seconds: 2),
      }) {
    _show(
      context,
      message,
      icon: Icons.info_outline_rounded,
      backgroundColor: Colors.blueGrey,
      duration: duration,
    );
  }

  static void showSuccess(
      BuildContext context,
      String message, {
        Duration duration = const Duration(seconds: 2),
      }) {
    _show(
      context,
      message,
      icon: Icons.check_circle_outline_rounded,
      backgroundColor: Colors.green,
      duration: duration,
    );
  }

  static void showError(
      BuildContext context,
      String message, {
        Duration duration = const Duration(seconds: 3),
      }) {
    _show(
      context,
      message,
      icon: Icons.error_outline_rounded,
      backgroundColor: Colors.red,
      duration: duration,
    );
  }

  static void showWarning(
      BuildContext context,
      String message, {
        Duration duration = const Duration(seconds: 3),
      }) {
    _show(
      context,
      message,
      icon: Icons.warning_amber_rounded,
      backgroundColor: Colors.orange,
      duration: duration,
    );
  }

  static void _show(
      BuildContext context,
      String message, {
        required IconData icon,
        required Color backgroundColor,
        required Duration duration,
      }) {
    final messenger = ScaffoldMessenger.maybeOf(context);
    if (messenger == null) return;

    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          duration: duration,
          behavior: SnackBarBehavior.floating,
          backgroundColor: backgroundColor,
          content: Row(
            children: [
              Icon(icon, color: Colors.white, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  message,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
  }
}