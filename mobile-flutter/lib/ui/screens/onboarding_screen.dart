import 'package:flutter/material.dart';

import '../../core/theme/app_spacing.dart';
import '../widgets/common/app_button.dart';
import '../widgets/common/app_card.dart';

class OnboardingScreen extends StatefulWidget {
  final VoidCallback? onDone;

  const OnboardingScreen({
    super.key,
    this.onDone,
  });

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _controller = PageController();
  int _index = 0;

  final List<_OnboardingItem> _items = const [
    _OnboardingItem(
      icon: Icons.fiber_new_rounded,
      title: 'Nouvelles commandes',
      subtitle:
      'Consulte rapidement les nouvelles commandes disponibles et prends en charge celles qui te concernent.',
    ),
    _OnboardingItem(
      icon: Icons.map_rounded,
      title: 'Carte & navigation',
      subtitle:
      'Visualise les stops sur la carte, calcule un circuit optimisé et ouvre Google Maps pour guider la livraison.',
    ),
    _OnboardingItem(
      icon: Icons.dashboard_rounded,
      title: 'Suivi & performance',
      subtitle:
      'Analyse tes commandes, ton avancement et les statistiques du dashboard depuis une interface claire.',
    ),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  bool get _isLast => _index == _items.length - 1;

  Future<void> _next() async {
    if (_isLast) {
      widget.onDone?.call();
      return;
    }

    await _controller.nextPage(
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOut,
    );
  }

  Future<void> _skip() async {
    await _controller.animateToPage(
      _items.length - 1,
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          child: Column(
            children: [
              Row(
                children: [
                  const Spacer(),
                  if (!_isLast)
                    TextButton(
                      onPressed: _skip,
                      child: const Text('Passer'),
                    ),
                ],
              ),
              Expanded(
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 460),
                    child: PageView.builder(
                      controller: _controller,
                      itemCount: _items.length,
                      onPageChanged: (value) {
                        setState(() => _index = value);
                      },
                      itemBuilder: (context, i) {
                        return _OnboardingPage(
                          item: _items[i],
                          index: i,
                          controller: _controller,
                        );
                      },
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(_items.length, (i) {
                  final active = i == _index;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: active ? 24 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: active
                          ? scheme.primary
                          : scheme.outline.withOpacity(0.45),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  );
                }),
              ),
              const SizedBox(height: AppSpacing.xxl),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 460),
                child: Row(
                  children: [
                    if (_index > 0) ...[
                      Expanded(
                        child: AppButton(
                          label: 'Retour',
                          variant: AppButtonVariant.outlined,
                          onPressed: () async {
                            await _controller.previousPage(
                              duration: const Duration(milliseconds: 260),
                              curve: Curves.easeOut,
                            );
                          },
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                    ],
                    Expanded(
                      child: AppButton(
                        label: _isLast ? 'Commencer' : 'Continuer',
                        icon: _isLast
                            ? Icons.check_rounded
                            : Icons.arrow_forward_rounded,
                        onPressed: _next,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.md),
            ],
          ),
        ),
      ),
    );
  }
}

class _OnboardingItem {
  final IconData icon;
  final String title;
  final String subtitle;

  const _OnboardingItem({
    required this.icon,
    required this.title,
    required this.subtitle,
  });
}

/// Page individuelle de l'onboarding avec parallax sur l'icône :
/// l'icône se déplace horizontalement et change légèrement d'échelle selon
/// la distance à la page courante. Effet "carousel premium".
class _OnboardingPage extends StatelessWidget {
  final _OnboardingItem item;
  final int index;
  final PageController controller;

  const _OnboardingPage({
    required this.item,
    required this.index,
    required this.controller,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        // Distance entre la page courante et celle-ci, dans [-1, 1].
        double offset = 0;
        if (controller.hasClients && controller.position.haveDimensions) {
          offset = (controller.page ?? controller.initialPage.toDouble()) - index;
        }
        final clamped = offset.clamp(-1.0, 1.0);
        final iconShift = clamped * 60; // parallax horizontal
        final iconScale = 1 - clamped.abs() * 0.18;
        final cardOpacity = (1 - clamped.abs() * 0.7).clamp(0.0, 1.0);

        return Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Transform.translate(
              offset: Offset(iconShift, 0),
              child: Transform.scale(
                scale: iconScale,
                child: Container(
                  width: 108,
                  height: 108,
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        scheme.primary.withOpacity(0.18),
                        scheme.primary.withOpacity(0.05),
                      ],
                    ),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: scheme.primary.withOpacity(0.18),
                        blurRadius: 28,
                        offset: const Offset(0, 12),
                      ),
                    ],
                  ),
                  child: Icon(
                    item.icon,
                    size: 50,
                    color: scheme.primary,
                  ),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
            Opacity(
              opacity: cardOpacity,
              child: child,
            ),
          ],
        );
      },
      child: AppCard(
        child: Padding(
          padding: const EdgeInsets.symmetric(
            vertical: AppSpacing.xl,
            horizontal: AppSpacing.lg,
          ),
          child: Column(
            children: [
              Text(
                item.title,
                textAlign: TextAlign.center,
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                item.subtitle,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: scheme.onSurfaceVariant,
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}