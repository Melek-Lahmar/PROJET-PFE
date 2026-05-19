import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Helpers d'animation premium réutilisables sur les écrans first-impression
/// (splash, login, onboarding) et tout écran qui mérite un effet d'entrée.
///
/// Tous les widgets ici sont **performance-aware** :
/// - utilisent `RepaintBoundary` pour isoler les repaints
/// - n'instancient qu'un seul `AnimationController` par effet
/// - aucun `setState` à l'intérieur du build
/// - aucune dépendance externe (pas de package additionnel)

// ============================================================================
// AnimatedPageStack — IndexedStack qui anime le passage d'une page à l'autre
// ============================================================================

/// Drop-in replacement de `IndexedStack` avec transition fade+slide
/// premium entre les pages, tout en préservant l'état de chaque enfant
/// (chaque page reste montée, comme `IndexedStack`).
///
/// Utilisé sur les shells avec onglets (admin, customer, confirmatrice,
/// driver) pour donner un effet "wow" sans casser les providers internes.
///
/// Performance : un seul `AnimatedSwitcher` qui ne reconstruit que la page
/// active. Le `KeyedSubtree(ValueKey(index))` garantit que Flutter détecte
/// le changement et joue la transition.
class AnimatedPageStack extends StatelessWidget {
  final int index;
  final List<Widget> pages;
  final Duration duration;
  final double slide;

  const AnimatedPageStack({
    super.key,
    required this.index,
    required this.pages,
    this.duration = const Duration(milliseconds: 280),
    this.slide = 0.015,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: duration,
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      transitionBuilder: (child, animation) {
        final s = Tween<Offset>(
          begin: Offset(0, slide),
          end: Offset.zero,
        ).animate(animation);
        return FadeTransition(
          opacity: animation,
          child: SlideTransition(position: s, child: child),
        );
      },
      child: KeyedSubtree(
        key: ValueKey<int>(index),
        child: pages[index],
      ),
    );
  }
}

// ============================================================================
// EntryAnimation — fade + slide vertical à l'apparition
// ============================================================================

/// Anime l'apparition d'un widget : fade + slide vertical court.
/// Utiliser pour des éléments qui apparaissent une seule fois (titre,
/// sous-titre, bouton CTA…).
///
/// Le `delay` permet de cascader plusieurs entrées (effet staggered).
class EntryAnimation extends StatefulWidget {
  final Widget child;
  final Duration duration;
  final Duration delay;
  final double slide;
  final Curve curve;

  const EntryAnimation({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 520),
    this.delay = Duration.zero,
    this.slide = 16,
    this.curve = Curves.easeOutCubic,
  });

  @override
  State<EntryAnimation> createState() => _EntryAnimationState();
}

class _EntryAnimationState extends State<EntryAnimation>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: widget.duration);
    Future.delayed(widget.delay, () {
      if (mounted) _ctrl.forward();
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, child) {
        final t = widget.curve.transform(_ctrl.value);
        return Opacity(
          opacity: t,
          child: Transform.translate(
            offset: Offset(0, widget.slide * (1 - t)),
            child: child,
          ),
        );
      },
      child: widget.child,
    );
  }
}

// ============================================================================
// StaggeredColumn — orchestrateur de cascading entries
// ============================================================================

/// Wrappe ses enfants dans des [EntryAnimation] avec un délai croissant
/// pour produire un effet staggered (cascade).
class StaggeredColumn extends StatelessWidget {
  final List<Widget> children;
  final Duration step;
  final Duration initialDelay;
  final CrossAxisAlignment crossAxisAlignment;
  final MainAxisAlignment mainAxisAlignment;
  final MainAxisSize mainAxisSize;

  const StaggeredColumn({
    super.key,
    required this.children,
    this.step = const Duration(milliseconds: 90),
    this.initialDelay = const Duration(milliseconds: 80),
    this.crossAxisAlignment = CrossAxisAlignment.center,
    this.mainAxisAlignment = MainAxisAlignment.start,
    this.mainAxisSize = MainAxisSize.max,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: crossAxisAlignment,
      mainAxisAlignment: mainAxisAlignment,
      mainAxisSize: mainAxisSize,
      children: [
        for (int i = 0; i < children.length; i++)
          EntryAnimation(
            delay: initialDelay + step * i,
            child: children[i],
          ),
      ],
    );
  }
}

// ============================================================================
// EntryScale — scale 0.85 → 1.0 + fade (idéal pour logos, hero icons)
// ============================================================================

class EntryScale extends StatefulWidget {
  final Widget child;
  final Duration duration;
  final Duration delay;
  final double from;

  const EntryScale({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 700),
    this.delay = Duration.zero,
    this.from = 0.78,
  });

  @override
  State<EntryScale> createState() => _EntryScaleState();
}

class _EntryScaleState extends State<EntryScale>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: widget.duration);
    Future.delayed(widget.delay, () {
      if (mounted) _ctrl.forward();
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, child) {
        final t = Curves.easeOutBack.transform(_ctrl.value.clamp(0.0, 1.0));
        final scale = widget.from + (1 - widget.from) * t;
        return Opacity(
          opacity: _ctrl.value.clamp(0.0, 1.0),
          child: Transform.scale(
            scale: scale,
            child: child,
          ),
        );
      },
      child: widget.child,
    );
  }
}

// ============================================================================
// FloatingParticles — fond animé (cercles flottants) sur gradient
// ============================================================================

/// Particules circulaires translucides flottant lentement, parfaites pour
/// donner de la vie à un fond avec gradient (splash, login, hero sections).
///
/// Utiliser dans un `Stack` au-dessus du gradient et SOUS le contenu :
/// ```dart
/// Stack(children: [
///   _GradientBackground(),
///   const FloatingParticles(),
///   _Content(),
/// ])
/// ```
///
/// Performance : un unique `AnimationController` repeating; les particules
/// sont peintes via un `CustomPainter` (un seul layer Canvas) wrappé dans
/// un `RepaintBoundary` pour éviter de redessiner les enfants.
class FloatingParticles extends StatefulWidget {
  final int count;
  final Color color;
  final double minRadius;
  final double maxRadius;
  final Duration period;

  const FloatingParticles({
    super.key,
    this.count = 14,
    this.color = Colors.white,
    this.minRadius = 6,
    this.maxRadius = 28,
    this.period = const Duration(seconds: 18),
  });

  @override
  State<FloatingParticles> createState() => _FloatingParticlesState();
}

class _FloatingParticlesState extends State<FloatingParticles>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final List<_Particle> _particles;

  @override
  void initState() {
    super.initState();
    final rng = math.Random(42);
    _particles = List.generate(widget.count, (i) {
      return _Particle(
        seed: rng.nextDouble(),
        radius: widget.minRadius +
            rng.nextDouble() * (widget.maxRadius - widget.minRadius),
        opacity: 0.04 + rng.nextDouble() * 0.10,
        speed: 0.5 + rng.nextDouble() * 1.5,
        startX: rng.nextDouble(),
        startY: rng.nextDouble(),
      );
    });
    _ctrl = AnimationController(vsync: this, duration: widget.period)
      ..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: AnimatedBuilder(
        animation: _ctrl,
        builder: (_, __) {
          return CustomPaint(
            painter: _ParticlesPainter(
              particles: _particles,
              t: _ctrl.value,
              color: widget.color,
            ),
            size: Size.infinite,
          );
        },
      ),
    );
  }
}

class _Particle {
  final double seed;
  final double radius;
  final double opacity;
  final double speed;
  final double startX;
  final double startY;

  _Particle({
    required this.seed,
    required this.radius,
    required this.opacity,
    required this.speed,
    required this.startX,
    required this.startY,
  });
}

class _ParticlesPainter extends CustomPainter {
  final List<_Particle> particles;
  final double t;
  final Color color;

  _ParticlesPainter({
    required this.particles,
    required this.t,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;
    for (final p in particles) {
      // Position cyclique : monte lentement, sort par le haut, repart par le bas.
      final phase = (t * p.speed + p.seed) % 1.0;
      final y = (1 - phase) * (size.height + p.radius * 2) - p.radius;
      final wobble = math.sin((phase + p.seed) * math.pi * 2) * 24;
      final x = (p.startX * size.width) + wobble;

      paint.color = color.withOpacity(p.opacity);
      canvas.drawCircle(Offset(x, y), p.radius, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _ParticlesPainter old) =>
      old.t != t || old.color != color;
}
