import 'package:flutter/material.dart';

/// Badge de statut commande client avec couleurs vivantes.
///
/// Pour `EN_LIVRAISON` : un dot pulsé "live" remplace l'icône, pour donner
/// l'effet temps réel — c'est le statut le plus engageant pour l'utilisateur
/// car ça veut dire que son colis est en route.
class CustomerOrderStatusBadge extends StatelessWidget {
  final String status;

  const CustomerOrderStatusBadge({
    super.key,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    final style = _resolveStyle(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: style.background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: style.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (style.live)
            _LivePulseDot(color: style.foreground)
          else
            Icon(style.icon, size: 14, color: style.foreground),
          const SizedBox(width: 6),
          Text(
            style.label,
            style: TextStyle(
              color: style.foreground,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }

  _StatusStyle _resolveStyle(String value) {
    final normalized = value.trim().toUpperCase();

    switch (normalized) {
      case 'CONFIRME':
        return _StatusStyle('Confirmée', Icons.verified_rounded,
            Colors.green.shade900, Colors.green.shade50, Colors.green.shade200);
      case 'EN_LIVRAISON':
        return _StatusStyle('En livraison', Icons.local_shipping_rounded,
            Colors.blue.shade900, Colors.blue.shade50, Colors.blue.shade200,
            live: true);
      case 'LIVRE':
        return _StatusStyle('Livrée', Icons.check_circle_rounded,
            Colors.teal.shade900, Colors.teal.shade50, Colors.teal.shade200);
      case 'REPORTE':
        return _StatusStyle('Reportée', Icons.event_repeat_rounded,
            Colors.orange.shade900, Colors.orange.shade50, Colors.orange.shade200);
      case 'RETOUR':
        return _StatusStyle('Retournée', Icons.undo_rounded,
            Colors.deepPurple.shade900, Colors.deepPurple.shade50, Colors.deepPurple.shade200);
      case 'DEPOT':
        return _StatusStyle('Retour dépôt', Icons.warehouse_rounded,
            Colors.brown.shade900, Colors.brown.shade50, Colors.brown.shade200);
      case 'TENTATIVE':
        return _StatusStyle('Tentative', Icons.error_outline_rounded,
            Colors.orange.shade900, Colors.orange.shade50, Colors.orange.shade200);
      case 'REFUSE':
        return _StatusStyle('Refusée', Icons.cancel_rounded,
            Colors.red.shade900, Colors.red.shade50, Colors.red.shade200);
      case 'EN_ATTENTE':
      default:
        return _StatusStyle('En attente', Icons.schedule_rounded,
            Colors.blueGrey.shade900, Colors.blueGrey.shade50, Colors.blueGrey.shade200);
    }
  }
}

class _StatusStyle {
  final String label;
  final IconData icon;
  final Color foreground;
  final Color background;
  final Color border;
  final bool live;

  const _StatusStyle(this.label, this.icon, this.foreground, this.background, this.border,
      {this.live = false});
}

class _LivePulseDot extends StatefulWidget {
  final Color color;
  const _LivePulseDot({required this.color});

  @override
  State<_LivePulseDot> createState() => _LivePulseDotState();
}

class _LivePulseDotState extends State<_LivePulseDot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1300),
  )..repeat();

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
        final t = _ctrl.value;
        return SizedBox(
          width: 14, height: 14,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Opacity(
                opacity: 1 - t,
                child: Transform.scale(
                  scale: 0.6 + 1.2 * t,
                  child: Container(
                    decoration: BoxDecoration(
                      color: widget.color.withOpacity(0.55),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ),
              Container(
                width: 7, height: 7,
                decoration: BoxDecoration(
                  color: widget.color,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
