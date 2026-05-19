import 'package:flutter/material.dart';

class Responsive {
  Responsive._();

  static const double mobileMax = 599;
  static const double tabletMax = 1023;
  static const double contentMaxWidth = 1100;
  static const double formMaxWidth = 430;

  static double width(BuildContext context) {
    return MediaQuery.of(context).size.width;
  }

  static double height(BuildContext context) {
    return MediaQuery.of(context).size.height;
  }

  static bool isMobile(BuildContext context) {
    return width(context) <= mobileMax;
  }

  static bool isTablet(BuildContext context) {
    final w = width(context);
    return w > mobileMax && w <= tabletMax;
  }

  static bool isDesktop(BuildContext context) {
    return width(context) > tabletMax;
  }

  static bool isSmallPhone(BuildContext context) {
    return width(context) < 360;
  }

  static double screenPadding(BuildContext context) {
    final w = width(context);

    if (w >= 1200) return 32;
    if (w >= 900) return 24;
    if (w >= 600) return 20;
    return 16;
  }

  static double sectionGap(BuildContext context) {
    if (isDesktop(context)) return 24;
    if (isTablet(context)) return 20;
    return 16;
  }

  static int dashboardGridCount(BuildContext context) {
    final w = width(context);

    if (w >= 1200) return 4;
    if (w >= 800) return 3;
    return 2;
  }

  static int cardGridCount(BuildContext context) {
    final w = width(context);

    if (w >= 1100) return 3;
    if (w >= 700) return 2;
    return 1;
  }

  static double cardAspectRatio(BuildContext context) {
    final w = width(context);

    if (w >= 1100) return 1.55;
    if (w >= 700) return 1.45;
    return 1.25;
  }

  static EdgeInsets pagePadding(BuildContext context) {
    final p = screenPadding(context);
    return EdgeInsets.all(p);
  }

  static EdgeInsets pagePaddingOnlyHorizontal(BuildContext context) {
    final p = screenPadding(context);
    return EdgeInsets.symmetric(horizontal: p);
  }

  static BoxConstraints centeredContentConstraints({
    double maxWidth = contentMaxWidth,
  }) {
    return BoxConstraints(maxWidth: maxWidth);
  }

  static BoxConstraints formConstraints() {
    return const BoxConstraints(maxWidth: formMaxWidth);
  }
}