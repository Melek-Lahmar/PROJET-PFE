import 'package:flutter/material.dart';

class AppRadii {
  AppRadii._();

  static const Radius r8 = Radius.circular(8);
  static const Radius r12 = Radius.circular(12);
  static const Radius r16 = Radius.circular(16);
  static const Radius r20 = Radius.circular(20);
  static const Radius r24 = Radius.circular(24);
  static const Radius r999 = Radius.circular(999);

  static const BorderRadius xs = BorderRadius.all(r8);
  static const BorderRadius sm = BorderRadius.all(r12);
  static const BorderRadius md = BorderRadius.all(r16);
  static const BorderRadius lg = BorderRadius.all(r20);
  static const BorderRadius xl = BorderRadius.all(r24);
  static const BorderRadius pill = BorderRadius.all(r999);

  static const BorderRadius bottomSheet = BorderRadius.vertical(
    top: r24,
  );
}