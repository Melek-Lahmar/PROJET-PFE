// Smoke test minimaliste : on charge l'app sans crasher.
// Le test "counter" auto-généré n'a aucun rapport avec ce projet.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:projet_pfe_flutter/main.dart';

void main() {
  testWidgets('App boots without crash', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp(enableBackgroundServices: false));
    await tester.pump(const Duration(seconds: 2));
    await tester.pump();
    // L'app initialise les providers + montre splash/onboarding/login.
    // On ne fait que vérifier qu'aucune exception n'est levée.
    expect(tester.takeException(), isNull);
    // S'assure qu'au moins un widget Material existe.
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
