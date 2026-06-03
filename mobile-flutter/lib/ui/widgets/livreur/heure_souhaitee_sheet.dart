import 'package:flutter/material.dart';

/// Bottom sheet premium pour poser un **report partiel** (même journée) sur
/// une commande EN_LIVRAISON. Le statut ne change pas — seul un champ
/// `LI_HeureSouhaitee` est mis à jour côté backend.
///
/// Retourne :
///   - DateTime  → nouvelle heure souhaitée
///   - DateTime(0) sentinel via [clearResult] → débloquer maintenant
///   - null → annulation
class HeureSouhaiteeResult {
  final DateTime? heureSouhaitee;
  final bool clearNow;

  const HeureSouhaiteeResult.set(DateTime when)
      : heureSouhaitee = when,
        clearNow = false;

  const HeureSouhaiteeResult.clear()
      : heureSouhaitee = null,
        clearNow = true;
}

Future<HeureSouhaiteeResult?> showHeureSouhaiteeSheet(
  BuildContext context, {
  required String doPiece,
  DateTime? current,
}) {
  return showModalBottomSheet<HeureSouhaiteeResult>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _HeureSouhaiteeSheet(
      doPiece: doPiece,
      current: current,
    ),
  );
}

class _HeureSouhaiteeSheet extends StatefulWidget {
  final String doPiece;
  final DateTime? current;

  const _HeureSouhaiteeSheet({
    required this.doPiece,
    this.current,
  });

  @override
  State<_HeureSouhaiteeSheet> createState() => _HeureSouhaiteeSheetState();
}

class _HeureSouhaiteeSheetState extends State<_HeureSouhaiteeSheet> {
  TimeOfDay? _picked;

  @override
  void initState() {
    super.initState();
    if (widget.current != null) {
      _picked = TimeOfDay.fromDateTime(widget.current!);
    }
  }

  DateTime _at(Duration offset) {
    final now = DateTime.now();
    return now.add(offset);
  }

  /// Garde-fou : la cible doit être aujourd'hui ET dans le futur.
  bool _isValidForToday(DateTime target) {
    final now = DateTime.now();
    return target.isAfter(now) && target.day == now.day &&
        target.month == now.month && target.year == now.year;
  }

  void _submit(DateTime when) {
    if (!_isValidForToday(when)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'Le report partiel doit rester sur la journée. Pour demain, utilise « Reporter ».'),
        ),
      );
      return;
    }
    Navigator.of(context).pop(HeureSouhaiteeResult.set(when));
  }

  Future<void> _pickCustom() async {
    final now = TimeOfDay.now();
    final initial = _picked ??
        TimeOfDay(hour: (now.hour + 1) % 24, minute: now.minute);
    final result = await showTimePicker(
      context: context,
      initialTime: initial,
      builder: (ctx, child) => MediaQuery(
        data: MediaQuery.of(ctx).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (result == null) return;
    final today = DateTime.now();
    final target = DateTime(
      today.year, today.month, today.day, result.hour, result.minute,
    );
    setState(() => _picked = result);
    _submit(target);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final inset = MediaQuery.of(context).viewInsets.bottom;
    final hasCurrent = widget.current != null;

    return Padding(
      padding: EdgeInsets.only(bottom: inset),
      child: Container(
        decoration: BoxDecoration(
          color: scheme.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag handle
            Center(
              child: Container(
                width: 38,
                height: 4,
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                  color: scheme.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEA580C).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.schedule_rounded,
                    color: Color(0xFFEA580C),
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Reporter dans la journée',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                      Text(
                        '${widget.doPiece} • le statut reste « En livraison »',
                        style: TextStyle(
                          color: scheme.onSurfaceVariant,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              'Reporter de…',
              style: TextStyle(
                color: scheme.onSurfaceVariant,
                fontWeight: FontWeight.w700,
                fontSize: 12,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                _QuickChip(
                  label: '+30 min',
                  onTap: () => _submit(_at(const Duration(minutes: 30))),
                ),
                const SizedBox(width: 8),
                _QuickChip(
                  label: '+1 h',
                  onTap: () => _submit(_at(const Duration(hours: 1))),
                ),
                const SizedBox(width: 8),
                _QuickChip(
                  label: '+2 h',
                  onTap: () => _submit(_at(const Duration(hours: 2))),
                ),
              ],
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _pickCustom,
                icon: const Icon(Icons.access_time_rounded, size: 18),
                label: Text(
                  _picked == null
                      ? 'Choisir une heure précise'
                      : 'Heure : ${_picked!.hour.toString().padLeft(2, '0')}:${_picked!.minute.toString().padLeft(2, '0')}',
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  side: BorderSide(color: scheme.outline),
                ),
              ),
            ),
            if (hasCurrent) ...[
              const SizedBox(height: 16),
              const Divider(height: 1),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  onPressed: () => Navigator.of(context)
                      .pop(const HeureSouhaiteeResult.clear()),
                  icon: const Icon(Icons.flash_on_rounded, size: 18),
                  label: const Text(
                    'Débloquer maintenant',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFF16A34A),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _QuickChip extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _QuickChip({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 14),
            decoration: BoxDecoration(
              color: const Color(0xFFEA580C).withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: const Color(0xFFEA580C).withValues(alpha: 0.4),
                width: 1,
              ),
            ),
            alignment: Alignment.center,
            child: Text(
              label,
              style: const TextStyle(
                color: Color(0xFFEA580C),
                fontWeight: FontWeight.w900,
                fontSize: 14,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
