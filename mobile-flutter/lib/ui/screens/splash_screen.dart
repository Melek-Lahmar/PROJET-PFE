import 'package:flutter/material.dart';

import '../../core/theme/app_spacing.dart';
import '../widgets/premium/animated_entry.dart';

/// Splash premium : fond dégradé + particules flottantes + entrée
/// orchestrée du logo et du texte.
///
/// Affiché pendant `tryAutoLogin`. Volontairement léger en CPU :
/// 1 controller pour la pulsation, 1 controller pour les particules,
/// les `EntryAnimation` enfants se disposent eux-mêmes.
class SplashScreen extends StatefulWidget {
  final String title;
  final String subtitle;
  final bool loading;

  const SplashScreen({
    super.key,
    this.title = 'Delivery',
    this.subtitle = 'On prépare ton espace…',
    this.loading = true,
  });

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Scaffold(
      body: Stack(
        children: [
          // ---- Fond gradient ----
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  scheme.primary,
                  Color.lerp(scheme.primary, Colors.black, 0.35) ?? scheme.primary,
                ],
              ),
            ),
          ),
          // ---- Particules flottantes (RepaintBoundary interne) ----
          const Positioned.fill(child: FloatingParticles()),
          // ---- Contenu ----
          SafeArea(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.screenPadding),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Logo : entrée scale + pulsation continue
                      EntryScale(
                        duration: const Duration(milliseconds: 800),
                        child: AnimatedBuilder(
                          animation: _pulse,
                          builder: (_, child) => Transform.scale(
                            scale: 1 + _pulse.value * 0.04,
                            child: child,
                          ),
                          child: Container(
                            width: 116,
                            height: 116,
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.14),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Colors.white.withOpacity(0.35),
                                width: 2,
                              ),
                            ),
                            child: const Icon(
                              Icons.local_shipping_rounded,
                              size: 54,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xxl),
                      // Titre + sous-titre cascadés
                      EntryAnimation(
                        delay: const Duration(milliseconds: 280),
                        child: Text(
                          widget.title,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      EntryAnimation(
                        delay: const Duration(milliseconds: 380),
                        child: Text(
                          widget.subtitle,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: Colors.white.withOpacity(0.85),
                            height: 1.5,
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xxl),
                      if (widget.loading)
                        EntryAnimation(
                          delay: const Duration(milliseconds: 480),
                          child: const SizedBox(
                            width: 28,
                            height: 28,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.4,
                              valueColor:
                                  AlwaysStoppedAnimation(Colors.white),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
