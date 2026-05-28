import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../state/avis_provider.dart';
import 'premium/animated_entry.dart';

/// Affiche une popup d'avis premium pour une commande livrée.
///
/// Innovation :
/// - sélection emoji rapide (😞 😐 🙂 😄 🤩) mappée sur 1-5 étoiles
/// - tags rapides (livraison rapide, livreur poli, …) sélection multiple
/// - commentaire libre optionnel
/// - bouton CTA gradient avec effet glow
///
/// Backend : si l'utilisateur n'écrit aucun commentaire, les tags sélectionnés
/// sont concaténés et envoyés comme `commentaire`. Le backend reste inchangé.
class AvisPromptDialog extends StatefulWidget {
  final String commandePiece;

  const AvisPromptDialog({super.key, required this.commandePiece});

  @override
  State<AvisPromptDialog> createState() => _AvisPromptDialogState();

  /// Affiche le dialog si une commande livrée attend un avis et qu'on n'a pas
  /// déjà été promptée cette session.
  static Future<void> tryShowNext(BuildContext context) async {
    final provider = context.read<AvisProvider>();
    await provider.refresh();
    final next = provider.nextPrompt();
    if (next == null) return;
    provider.markPromptShown(next.commandePiece);
    if (!context.mounted) return;
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => ChangeNotifierProvider.value(
        value: provider,
        child: AvisPromptDialog(commandePiece: next.commandePiece),
      ),
    );
  }
}

class _AvisPromptDialogState extends State<AvisPromptDialog> {
  static const _emojis = ['😞', '😐', '🙂', '😄', '🤩'];
  static const _emojiLabels = ['Décevant', 'Bof', 'Bien', 'Très bien', 'Top'];

  static const _tagsByLevel = {
    1: ['Retard important', 'Produit abîmé', 'Livreur impoli', 'Erreur de produit'],
    2: ['Trop d\'attente', 'Emballage léger', 'Communication faible'],
    3: ['Conforme', 'Délai correct', 'À améliorer'],
    4: ['Livraison rapide', 'Livreur poli', 'Bon emballage', 'Produit conforme'],
    5: ['Excellent service !', 'Livraison express', 'Livreur exceptionnel', 'Emballage premium', 'À recommander'],
  };

  int _note = 0;
  final Set<String> _selectedTags = <String>{};
  final _commentCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  String _composeCommentaire() {
    final base = _commentCtrl.text.trim();
    final tags = _selectedTags.toList();
    if (tags.isEmpty) return base;
    final tagsLine = '[${tags.join(', ')}]';
    if (base.isEmpty) return tagsLine;
    return '$tagsLine $base';
  }

  Future<void> _submit() async {
    if (_note < 1) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Choisis une note (😞 → 🤩)')),
      );
      return;
    }
    setState(() => _submitting = true);
    final ok = await context.read<AvisProvider>().submit(
          commandePiece: widget.commandePiece,
          note: _note,
          commentaire: _composeCommentaire().isEmpty
              ? null
              : _composeCommentaire(),
        );
    if (!mounted) return;
    if (ok) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Merci pour ton avis !')),
      );
    } else {
      setState(() => _submitting = false);
      final err = context.read<AvisProvider>().error;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err ?? 'Impossible d\'envoyer.')),
      );
    }
  }

  Future<void> _dismiss() async {
    await context.read<AvisProvider>().dismiss(widget.commandePiece);
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    final tags = _note > 0 ? (_tagsByLevel[_note] ?? const <String>[]) : const <String>[];
    final mainColor = _accentForNote(_note, scheme);

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // ===== Header gradient =====
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(20, 22, 20, 22),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [mainColor, mainColor.withValues(alpha: 0.78)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                ),
                child: Column(
                  children: [
                    EntryScale(
                      duration: const Duration(milliseconds: 600),
                      child: Container(
                        width: 56, height: 56,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.20),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.30)),
                        ),
                        child: const Icon(Icons.local_shipping_rounded,
                            color: Colors.white, size: 30),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text('Comment s\'est passée la livraison ?',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.titleLarge?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                        )),
                    const SizedBox(height: 4),
                    Text('Commande ${widget.commandePiece}',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.white.withValues(alpha: 0.85),
                        )),
                  ],
                ),
              ),

              // ===== Body =====
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Emoji selector
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        for (int i = 0; i < _emojis.length; i++)
                          _EmojiButton(
                            emoji: _emojis[i],
                            label: _emojiLabels[i],
                            selected: _note == i + 1,
                            onTap: _submitting
                                ? null
                                : () => setState(() {
                                      _note = i + 1;
                                      _selectedTags.clear();
                                    }),
                          ),
                      ],
                    ),
                    if (_note > 0) ...[
                      const SizedBox(height: 18),
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 250),
                        switchInCurve: Curves.easeOutCubic,
                        child: Column(
                          key: ValueKey<int>(_note),
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.local_offer_rounded,
                                    size: 16, color: mainColor),
                                const SizedBox(width: 6),
                                Text('Tags rapides',
                                    style: theme.textTheme.labelLarge?.copyWith(
                                      fontWeight: FontWeight.w800,
                                      color: mainColor,
                                    )),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 6, runSpacing: 6,
                              children: [
                                for (final t in tags)
                                  _TagChip(
                                    label: t,
                                    selected: _selectedTags.contains(t),
                                    color: mainColor,
                                    onTap: _submitting
                                        ? null
                                        : () => setState(() {
                                              if (_selectedTags.contains(t)) {
                                                _selectedTags.remove(t);
                                              } else {
                                                _selectedTags.add(t);
                                              }
                                            }),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                      TextField(
                        controller: _commentCtrl,
                        enabled: !_submitting,
                        maxLength: 500,
                        maxLines: 3,
                        decoration: InputDecoration(
                          hintText: 'Un mot pour le livreur ? (optionnel)',
                          filled: true,
                          fillColor: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide.none,
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 12),
                        ),
                      ),
                    ],

                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: TextButton(
                            onPressed: _submitting ? null : _dismiss,
                            child: const Text('Plus tard'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          flex: 2,
                          child: _GradientCta(
                            color: mainColor,
                            enabled: !_submitting && _note >= 1,
                            loading: _submitting,
                            onPressed: _submit,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _accentForNote(int note, ColorScheme scheme) {
    switch (note) {
      case 1:
        return const Color(0xFFEF4444);
      case 2:
        return const Color(0xFFF59E0B);
      case 3:
        return const Color(0xFF6366F1);
      case 4:
        return const Color(0xFF22C55E);
      case 5:
        return const Color(0xFF8B5CF6);
      default:
        return scheme.primary;
    }
  }
}

class _EmojiButton extends StatelessWidget {
  final String emoji;
  final String label;
  final bool selected;
  final VoidCallback? onTap;

  const _EmojiButton({
    required this.emoji,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
        decoration: BoxDecoration(
          color: selected
              ? scheme.primary.withValues(alpha: 0.10)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? scheme.primary : Colors.transparent,
            width: 1.5,
          ),
        ),
        child: Column(
          children: [
            AnimatedScale(
              scale: selected ? 1.18 : 1.0,
              duration: const Duration(milliseconds: 220),
              curve: Curves.easeOutBack,
              child: Text(emoji, style: const TextStyle(fontSize: 30)),
            ),
            const SizedBox(height: 2),
            Text(label,
                style: theme.textTheme.labelSmall?.copyWith(
                  fontSize: 9,
                  fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                  color: selected ? scheme.primary : scheme.onSurfaceVariant,
                )),
          ],
        ),
      ),
    );
  }
}

class _TagChip extends StatelessWidget {
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback? onTap;
  const _TagChip({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(
          color: selected ? color : color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? color : color.withValues(alpha: 0.30),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (selected) ...[
              const Icon(Icons.check_rounded, size: 13, color: Colors.white),
              const SizedBox(width: 4),
            ],
            Text(label,
                style: TextStyle(
                  color: selected ? Colors.white : color,
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                )),
          ],
        ),
      ),
    );
  }
}

class _GradientCta extends StatefulWidget {
  final Color color;
  final bool enabled;
  final bool loading;
  final VoidCallback onPressed;
  const _GradientCta({
    required this.color,
    required this.enabled,
    required this.loading,
    required this.onPressed,
  });

  @override
  State<_GradientCta> createState() => _GradientCtaState();
}

class _GradientCtaState extends State<_GradientCta> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: widget.enabled ? (_) => setState(() => _down = true) : null,
      onTapCancel: () => setState(() => _down = false),
      onTapUp: (_) => setState(() => _down = false),
      onTap: widget.enabled && !widget.loading ? widget.onPressed : null,
      child: AnimatedScale(
        scale: _down ? 0.96 : 1.0,
        duration: const Duration(milliseconds: 110),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          height: 48,
          decoration: BoxDecoration(
            gradient: widget.enabled
                ? LinearGradient(
                    colors: [widget.color, widget.color.withValues(alpha: 0.78)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  )
                : null,
            color: widget.enabled ? null : Colors.grey.shade300,
            borderRadius: BorderRadius.circular(14),
            boxShadow: widget.enabled
                ? [
                    BoxShadow(
                      color: widget.color.withValues(alpha: 0.40),
                      blurRadius: 14,
                      offset: const Offset(0, 6),
                    ),
                  ]
                : null,
          ),
          child: Center(
            child: widget.loading
                ? const SizedBox(
                    width: 18, height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.4,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.send_rounded, color: Colors.white, size: 18),
                      SizedBox(width: 8),
                      Text('Envoyer mon avis',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                          )),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}
