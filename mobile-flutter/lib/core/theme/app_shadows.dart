import 'package:flutter/material.dart';

class AppShadows {
  AppShadows._();

  static const List<BoxShadow> soft = [
    BoxShadow(
      color: Color(0x120F172A),
      blurRadius: 14,
      offset: Offset(0, 6),
    ),
  ];

  static const List<BoxShadow> medium = [
    BoxShadow(
      color: Color(0x160F172A),
      blurRadius: 22,
      offset: Offset(0, 10),
    ),
  ];

  static const List<BoxShadow> strong = [
    BoxShadow(
      color: Color(0x1A0F172A),
      blurRadius: 30,
      offset: Offset(0, 14),
    ),
  ];
}