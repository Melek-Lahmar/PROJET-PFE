import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Mini-courbe sparkline (sans axes ni labels) pour intégration compacte
/// dans une KPI card ou un detail sheet.
///
/// Trace une courbe lissée (Bezier) avec dégradé de remplissage et un
/// dernier point mis en évidence. Performance : un seul `CustomPainter`,
/// rien d'animé par défaut (utiliser un `AnimatedBuilder` externe pour
/// animer si besoin).
class SparklinePainter extends CustomPainter {
  final List<double> values;
  final Color color;
  final double strokeWidth;
  final bool showLastDot;
  final bool fill;

  SparklinePainter({
    required this.values,
    required this.color,
    this.strokeWidth = 2.4,
    this.showLastDot = true,
    this.fill = true,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (values.length < 2) return;
    final minV = values.reduce(math.min);
    final maxV = values.reduce(math.max);
    final range = (maxV - minV).abs() < 0.0001 ? 1.0 : (maxV - minV);

    final pts = <Offset>[];
    for (int i = 0; i < values.length; i++) {
      final x = i / (values.length - 1) * size.width;
      final norm = (values[i] - minV) / range;
      final y = size.height - norm * (size.height * 0.85) - size.height * 0.075;
      pts.add(Offset(x, y));
    }

    // Path lissé.
    final path = Path()..moveTo(pts.first.dx, pts.first.dy);
    for (int i = 0; i < pts.length - 1; i++) {
      final p0 = pts[i];
      final p1 = pts[i + 1];
      final mid = Offset((p0.dx + p1.dx) / 2, (p0.dy + p1.dy) / 2);
      path.quadraticBezierTo(p0.dx, p0.dy, mid.dx, mid.dy);
    }
    path.lineTo(pts.last.dx, pts.last.dy);

    if (fill) {
      final fillPath = Path.from(path)
        ..lineTo(size.width, size.height)
        ..lineTo(0, size.height)
        ..close();
      final paintFill = Paint()
        ..shader = LinearGradient(
          colors: [color.withOpacity(0.35), color.withOpacity(0.02)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
      canvas.drawPath(fillPath, paintFill);
    }

    final paintLine = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..strokeWidth = strokeWidth;
    canvas.drawPath(path, paintLine);

    if (showLastDot) {
      final paintDot = Paint()..color = color;
      final paintDotRing = Paint()
        ..color = Colors.white
        ..style = PaintingStyle.fill;
      canvas.drawCircle(pts.last, strokeWidth + 2.5, paintDotRing);
      canvas.drawCircle(pts.last, strokeWidth + 0.5, paintDot);
    }
  }

  @override
  bool shouldRepaint(covariant SparklinePainter old) =>
      old.values != values || old.color != color || old.strokeWidth != strokeWidth;
}

/// Widget pratique : un Sparkline auto-dimensionné.
class Sparkline extends StatelessWidget {
  final List<double> values;
  final Color color;
  final double height;
  final bool showLastDot;
  final bool fill;

  const Sparkline({
    super.key,
    required this.values,
    required this.color,
    this.height = 36,
    this.showLastDot = true,
    this.fill = true,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      width: double.infinity,
      child: CustomPaint(
        painter: SparklinePainter(
          values: values,
          color: color,
          showLastDot: showLastDot,
          fill: fill,
        ),
      ),
    );
  }
}

/// Génère une série démo plausible autour d'une valeur courante en se basant
/// sur le delta vs période précédente. Sert UNIQUEMENT au mode démo PFE quand
/// l'API ne renvoie pas de série temporelle pour le KPI.
List<double> demoSeriesAround({
  required double current,
  required double? deltaPercent,
  int points = 7,
  int? seed,
}) {
  final rng = math.Random(seed ?? current.toInt() ^ (deltaPercent ?? 0).toInt());
  final delta = (deltaPercent ?? 0) / 100.0;
  final start = current / (1 + delta == 0 ? 0.001 : 1 + delta);
  final out = <double>[];
  for (int i = 0; i < points; i++) {
    final progress = i / (points - 1);
    final base = start + (current - start) * progress;
    final jitter = (rng.nextDouble() - 0.5) * (current.abs() * 0.10 + 1);
    out.add(math.max(0, base + jitter));
  }
  out[out.length - 1] = current;
  return out;
}
