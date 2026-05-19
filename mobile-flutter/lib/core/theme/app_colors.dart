import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Brand
  static const Color primary = Color(0xFF2563EB);
  static const Color primaryDark = Color(0xFF1D4ED8);
  static const Color secondary = Color(0xFF14B8A6);
  static const Color accent = Color(0xFF38BDF8);

  // Feedback
  static const Color success = Color(0xFF16A34A);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFDC2626);
  static const Color info = Color(0xFF0EA5E9);

  // Light surfaces
  static const Color lightBackground = Color(0xFFF8FAFC);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightSurfaceAlt = Color(0xFFF1F5F9);

  // Dark surfaces
  static const Color darkBackground = Color(0xFF0F172A);
  static const Color darkSurface = Color(0xFF111827);
  static const Color darkSurfaceAlt = Color(0xFF1F2937);

  // Text / borders
  static const Color lightText = Color(0xFF0F172A);
  static const Color lightTextSoft = Color(0xFF475569);
  static const Color darkText = Color(0xFFF8FAFC);
  static const Color darkTextSoft = Color(0xFFCBD5E1);

  static const Color lightBorder = Color(0xFFE2E8F0);
  static const Color darkBorder = Color(0xFF334155);

  static const Color shadow = Color(0x140F172A);

  static const ColorScheme lightColorScheme = ColorScheme(
    brightness: Brightness.light,
    primary: primary,
    onPrimary: Colors.white,
    secondary: secondary,
    onSecondary: Colors.white,
    error: error,
    onError: Colors.white,
    background: lightBackground,
    onBackground: lightText,
    surface: lightSurface,
    onSurface: lightText,
    surfaceVariant: lightSurfaceAlt,
    onSurfaceVariant: lightTextSoft,
    outline: lightBorder,
    outlineVariant: Color(0xFFEAEFF5),
    shadow: shadow,
    scrim: Color(0x66000000),
    inverseSurface: Color(0xFF0F172A),
    onInverseSurface: Colors.white,
    inversePrimary: Color(0xFF93C5FD),
  );

  static const ColorScheme darkColorScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: Color(0xFF60A5FA),
    onPrimary: Color(0xFF0B1220),
    secondary: Color(0xFF2DD4BF),
    onSecondary: Color(0xFF042F2E),
    error: Color(0xFFF87171),
    onError: Color(0xFF190909),
    background: darkBackground,
    onBackground: darkText,
    surface: darkSurface,
    onSurface: darkText,
    surfaceVariant: darkSurfaceAlt,
    onSurfaceVariant: darkTextSoft,
    outline: darkBorder,
    outlineVariant: Color(0xFF293548),
    shadow: Colors.black,
    scrim: Color(0x99000000),
    inverseSurface: Colors.white,
    onInverseSurface: Color(0xFF0F172A),
    inversePrimary: primary,
  );
}