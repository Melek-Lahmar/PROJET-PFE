import 'package:flutter/material.dart';

enum AppButtonVariant {
  primary,
  secondary,
  outlined,
  text,
  danger,
  gradient,
  glow,
}

/// Bouton applicatif standard avec animation press universelle.
///
/// Variantes :
/// - `primary` / `secondary` / `outlined` / `text` / `danger` : variantes
///   classiques (theme).
/// - `gradient` : dégradé primary→primary.shade plus chaud, ombre tintée.
/// - `glow` : variante gradient + halo lumineux pulsé (idéal CTAs hero).
///
/// Effet press : scale 0.96 + opacity 0.85 (110ms easeOut) — appliqué à toutes
/// les variantes.
class AppButton extends StatefulWidget {
  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final bool isLoading;
  final IconData? icon;
  final double? width;
  final double height;
  final EdgeInsetsGeometry? padding;
  final List<Color>? gradientColors;

  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.isLoading = false,
    this.icon,
    this.width,
    this.height = 52,
    this.padding,
    this.gradientColors,
  });

  @override
  State<AppButton> createState() => _AppButtonState();
}

class _AppButtonState extends State<AppButton> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final disabled = widget.onPressed == null || widget.isLoading;

    Widget child = Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (widget.isLoading)
          SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2.2,
              valueColor: AlwaysStoppedAnimation<Color>(_foregroundColor(scheme)),
            ),
          )
        else if (widget.icon != null)
          Icon(widget.icon, size: 18),
        if (widget.isLoading || widget.icon != null) const SizedBox(width: 10),
        Flexible(
          child: Text(widget.label, overflow: TextOverflow.ellipsis),
        ),
      ],
    );

    Widget button;
    switch (widget.variant) {
      case AppButtonVariant.primary:
        button = SizedBox(
          width: widget.width,
          height: widget.height,
          child: ElevatedButton(
            onPressed: disabled ? null : widget.onPressed,
            style: ElevatedButton.styleFrom(padding: widget.padding),
            child: child,
          ),
        );
        break;
      case AppButtonVariant.secondary:
        button = SizedBox(
          width: widget.width,
          height: widget.height,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: scheme.secondary,
              foregroundColor: scheme.onSecondary,
              padding: widget.padding,
            ),
            onPressed: disabled ? null : widget.onPressed,
            child: child,
          ),
        );
        break;
      case AppButtonVariant.outlined:
        button = SizedBox(
          width: widget.width,
          height: widget.height,
          child: OutlinedButton(
            onPressed: disabled ? null : widget.onPressed,
            style: OutlinedButton.styleFrom(padding: widget.padding),
            child: child,
          ),
        );
        break;
      case AppButtonVariant.text:
        button = SizedBox(
          width: widget.width,
          height: widget.height,
          child: TextButton(
            onPressed: disabled ? null : widget.onPressed,
            style: TextButton.styleFrom(padding: widget.padding),
            child: child,
          ),
        );
        break;
      case AppButtonVariant.danger:
        button = SizedBox(
          width: widget.width,
          height: widget.height,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: scheme.error,
              foregroundColor: scheme.onError,
              padding: widget.padding,
            ),
            onPressed: disabled ? null : widget.onPressed,
            child: child,
          ),
        );
        break;
      case AppButtonVariant.gradient:
      case AppButtonVariant.glow:
        button = _GradientButton(
          label: widget.label,
          icon: widget.icon,
          isLoading: widget.isLoading,
          width: widget.width,
          height: widget.height,
          padding: widget.padding,
          colors: widget.gradientColors ??
              [scheme.primary, Color.alphaBlend(scheme.primary.withValues(alpha: 0.75), scheme.tertiary)],
          glow: widget.variant == AppButtonVariant.glow,
          enabled: !disabled,
          onPressed: widget.onPressed,
        );
        break;
    }

    return GestureDetector(
      onTapDown: disabled ? null : (_) => setState(() => _down = true),
      onTapCancel: () => setState(() => _down = false),
      onTapUp: (_) => setState(() => _down = false),
      child: AnimatedScale(
        scale: _down ? 0.96 : 1.0,
        duration: const Duration(milliseconds: 110),
        curve: Curves.easeOut,
        child: AnimatedOpacity(
          duration: const Duration(milliseconds: 110),
          opacity: _down ? 0.88 : 1.0,
          child: button,
        ),
      ),
    );
  }

  Color _foregroundColor(ColorScheme scheme) {
    switch (widget.variant) {
      case AppButtonVariant.primary:
        return scheme.onPrimary;
      case AppButtonVariant.secondary:
        return scheme.onSecondary;
      case AppButtonVariant.outlined:
      case AppButtonVariant.text:
        return scheme.primary;
      case AppButtonVariant.danger:
        return scheme.onError;
      case AppButtonVariant.gradient:
      case AppButtonVariant.glow:
        return Colors.white;
    }
  }
}

class _GradientButton extends StatefulWidget {
  final String label;
  final IconData? icon;
  final bool isLoading;
  final double? width;
  final double height;
  final EdgeInsetsGeometry? padding;
  final List<Color> colors;
  final bool glow;
  final bool enabled;
  final VoidCallback? onPressed;

  const _GradientButton({
    required this.label,
    required this.icon,
    required this.isLoading,
    required this.width,
    required this.height,
    required this.padding,
    required this.colors,
    required this.glow,
    required this.enabled,
    required this.onPressed,
  });

  @override
  State<_GradientButton> createState() => _GradientButtonState();
}

class _GradientButtonState extends State<_GradientButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1800),
  );

  @override
  void initState() {
    super.initState();
    if (widget.glow && widget.enabled) _ctrl.repeat(reverse: true);
  }

  @override
  void didUpdateWidget(_GradientButton old) {
    super.didUpdateWidget(old);
    final shouldRun = widget.glow && widget.enabled;
    if (shouldRun && !_ctrl.isAnimating) _ctrl.repeat(reverse: true);
    if (!shouldRun && _ctrl.isAnimating) _ctrl.stop();
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
      builder: (_, __) {
        final pulse = widget.glow ? (0.4 + 0.4 * _ctrl.value) : 0.32;
        return SizedBox(
          width: widget.width,
          height: widget.height,
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: widget.enabled && !widget.isLoading
                  ? widget.onPressed
                  : null,
              child: Ink(
                padding: widget.padding ??
                    const EdgeInsets.symmetric(horizontal: 18),
                decoration: BoxDecoration(
                  gradient: widget.enabled
                      ? LinearGradient(
                          colors: widget.colors,
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        )
                      : null,
                  color: widget.enabled ? null : Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: widget.enabled
                      ? [
                          BoxShadow(
                            color: widget.colors.first.withValues(alpha: pulse),
                            blurRadius: widget.glow ? 22 : 14,
                            offset: const Offset(0, 6),
                          ),
                        ]
                      : null,
                ),
                child: Center(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (widget.isLoading)
                        const SizedBox(
                          width: 18, height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      else if (widget.icon != null)
                        Icon(widget.icon, size: 18, color: Colors.white),
                      if (widget.isLoading || widget.icon != null)
                        const SizedBox(width: 10),
                      Flexible(
                        child: Text(widget.label,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                            )),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
