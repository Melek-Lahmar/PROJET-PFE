import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class OrderContactActions extends StatelessWidget {
  final String? phone;
  final String? address;
  final double? lat;
  final double? lng;

  const OrderContactActions({
    super.key,
    this.phone,
    this.address,
    this.lat,
    this.lng,
  });

  String? _cleanPhoneRaw(String? value) {
    if (value == null) return null;
    final raw = value.trim();
    return raw.isEmpty ? null : raw;
  }

  String? _phoneForCall(String? value) {
    final raw = _cleanPhoneRaw(value);
    if (raw == null) return null;

    var cleaned = raw.replaceAll(RegExp(r'[^\d+]'), '');

    if (cleaned.startsWith('00')) {
      cleaned = '+${cleaned.substring(2)}';
    }

    if (!cleaned.startsWith('+')) {
      final digits = cleaned.replaceAll(RegExp(r'\D'), '');
      if (digits.length == 8) {
        cleaned = '+216$digits';
      } else {
        cleaned = digits;
      }
    }

    return cleaned.trim().isEmpty ? null : cleaned.trim();
  }

  String? _phoneForWhatsApp(String? value) {
    final raw = _phoneForCall(value);
    if (raw == null) return null;

    var digits = raw.replaceAll(RegExp(r'\D'), '');

    if (digits.length == 8) {
      digits = '216$digits';
    }

    return digits.isEmpty ? null : digits;
  }

  bool get _hasValidCoords {
    if (lat == null || lng == null) return false;
    return !(lat == 0 && lng == 0);
  }

  Future<void> _launchPhone() async {
    final normalizedPhone = _phoneForCall(phone);
    if (normalizedPhone == null) return;

    final uri = Uri(scheme: 'tel', path: normalizedPhone);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _launchWhatsApp() async {
    final waPhone = _phoneForWhatsApp(phone);
    if (waPhone == null) return;

    final uri = Uri.parse('https://wa.me/$waPhone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _launchMaps() async {
    Uri uri;

    if (_hasValidCoords) {
      uri = Uri.parse(
        'https://www.google.com/maps/search/?api=1&query=$lat,$lng',
      );
    } else {
      final rawAddress = (address ?? '').trim();
      if (rawAddress.isEmpty) return;

      final encoded = Uri.encodeComponent(rawAddress);
      uri = Uri.parse(
        'https://www.google.com/maps/search/?api=1&query=$encoded',
      );
    }

    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final safeAddress = (address ?? '').trim();
    final hasPhone = _phoneForCall(phone) != null;
    final hasMaps = _hasValidCoords || safeAddress.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (safeAddress.isNotEmpty) ...[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                Icons.location_on_outlined,
                size: 16,
                color: scheme.onSurfaceVariant,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  safeAddress,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
        ],
        Row(
          children: [
            if (hasPhone) ...[
              Expanded(
                child: _ActionButton(
                  icon: Icons.phone_outlined,
                  label: 'Appeler',
                  color: scheme.primary,
                  onTap: _launchPhone,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ActionButton(
                  icon: Icons.chat_outlined,
                  label: 'WhatsApp',
                  color: scheme.secondary,
                  onTap: _launchWhatsApp,
                ),
              ),
              if (hasMaps) const SizedBox(width: 10),
            ],
            if (hasMaps)
              Expanded(
                child: _ActionButton(
                  icon: Icons.map_outlined,
                  label: 'Maps',
                  color: scheme.tertiary,
                  onTap: _launchMaps,
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color.withOpacity(0.10),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  color: color,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}