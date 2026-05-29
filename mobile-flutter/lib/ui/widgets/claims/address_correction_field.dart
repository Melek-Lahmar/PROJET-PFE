import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../../screens/address_picker_screen.dart';

/// Champ réutilisable de correction d'adresse, partagé entre :
///   - réclamation client motif CHANGEMENT_ADRESSE
///   - réponse client à une Demande livreur motif ADRESSE_INCORRECTE
///
/// UX simplifiée : plus de mini-map inline (trop petite, peu maniable).
/// Un gros bouton ouvre `AddressPickerScreen` plein écran ; la carte y est
/// large et confortable. Le widget affiche ensuite la position choisie,
/// avec possibilité de la modifier ou de la réinitialiser.
class AddressCorrectionField extends StatefulWidget {
  final String? initialAddress;
  final double? initialLatitude;
  final double? initialLongitude;
  final String? initialRepere;
  final String? initialInstructions;

  final void Function({
    required String? address,
    required double? latitude,
    required double? longitude,
    required String? repere,
    required String? instructionsLivreur,
  }) onChanged;

  const AddressCorrectionField({
    super.key,
    this.initialAddress,
    this.initialLatitude,
    this.initialLongitude,
    this.initialRepere,
    this.initialInstructions,
    required this.onChanged,
  });

  @override
  State<AddressCorrectionField> createState() => _AddressCorrectionFieldState();
}

class _AddressCorrectionFieldState extends State<AddressCorrectionField> {
  late final TextEditingController _addressCtrl;
  late final TextEditingController _repereCtrl;
  late final TextEditingController _instructionsCtrl;

  double? _lat;
  double? _lng;
  bool _capturingGps = false;

  @override
  void initState() {
    super.initState();
    _addressCtrl = TextEditingController(text: widget.initialAddress ?? '');
    _repereCtrl = TextEditingController(text: widget.initialRepere ?? '');
    _instructionsCtrl =
        TextEditingController(text: widget.initialInstructions ?? '');
    _lat = widget.initialLatitude;
    _lng = widget.initialLongitude;

    _addressCtrl.addListener(_emit);
    _repereCtrl.addListener(_emit);
    _instructionsCtrl.addListener(_emit);
  }

  @override
  void dispose() {
    _addressCtrl.dispose();
    _repereCtrl.dispose();
    _instructionsCtrl.dispose();
    super.dispose();
  }

  void _emit() {
    String? trimOrNull(String v) {
      final t = v.trim();
      return t.isEmpty ? null : t;
    }

    widget.onChanged(
      address: trimOrNull(_addressCtrl.text),
      latitude: _lat,
      longitude: _lng,
      repere: trimOrNull(_repereCtrl.text),
      instructionsLivreur: trimOrNull(_instructionsCtrl.text),
    );
  }

  Future<void> _captureGps() async {
    if (_capturingGps) return;
    setState(() => _capturingGps = true);
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Permission de localisation refusée.')),
        );
        return;
      }
      final pos = await Geolocator.getCurrentPosition();
      if (!mounted) return;
      setState(() {
        _lat = pos.latitude;
        _lng = pos.longitude;
      });
      _emit();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur GPS : $e')),
      );
    } finally {
      if (mounted) setState(() => _capturingGps = false);
    }
  }

  Future<void> _openMapPicker() async {
    final result = await Navigator.of(context).push<AddressPickerResult>(
      MaterialPageRoute(
        builder: (_) => AddressPickerScreen(
          initialLatitude: _lat,
          initialLongitude: _lng,
          title: 'Choisir ta nouvelle adresse',
        ),
      ),
    );
    if (!mounted || result == null) return;
    setState(() {
      _lat = result.latitude;
      _lng = result.longitude;
    });
    _emit();
  }

  void _clearGps() {
    setState(() {
      _lat = null;
      _lng = null;
    });
    _emit();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final hasGps = _lat != null && _lng != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Bloc position : bouton principal "Choisir sur la carte" + GPS auto.
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: hasGps
                ? Colors.green.shade50
                : scheme.primaryContainer.withValues(alpha: 0.25),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: hasGps
                  ? Colors.green.shade300
                  : scheme.primary.withValues(alpha: 0.3),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    hasGps
                        ? Icons.check_circle_rounded
                        : Icons.place_outlined,
                    color:
                        hasGps ? Colors.green.shade700 : scheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      hasGps
                          ? 'Position choisie'
                          : 'Aucune position choisie',
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ],
              ),
              if (hasGps) ...[
                const SizedBox(height: 6),
                Text(
                  '${_lat!.toStringAsFixed(5)}, ${_lng!.toStringAsFixed(5)}',
                  style: TextStyle(color: scheme.onSurfaceVariant),
                ),
              ],
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _openMapPicker,
                      icon: const Icon(Icons.map_rounded),
                      label: Text(hasGps
                          ? 'Modifier sur la carte'
                          : 'Choisir sur la carte'),
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 13),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    onPressed: _capturingGps ? null : _captureGps,
                    icon: _capturingGps
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child:
                                CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.my_location_rounded),
                    label: const Text('GPS'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                          vertical: 13, horizontal: 12),
                    ),
                  ),
                ],
              ),
              if (hasGps) ...[
                const SizedBox(height: 4),
                TextButton.icon(
                  onPressed: _clearGps,
                  icon: const Icon(Icons.close_rounded, size: 16),
                  label: const Text('Effacer la position'),
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: const Size(0, 32),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 14),

        // Adresse détaillée (texte)
        TextField(
          controller: _addressCtrl,
          maxLength: 300,
          maxLines: 2,
          decoration: const InputDecoration(
            labelText: 'Adresse détaillée',
            hintText: 'Ex : 12 rue de la République, 3e étage, appt 301',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.home_outlined),
          ),
        ),

        // Repère (spécif Tunisie)
        TextField(
          controller: _repereCtrl,
          maxLength: 200,
          decoration: const InputDecoration(
            labelText: 'Repère (optionnel)',
            hintText: 'Ex : à côté de la pharmacie El Amen',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.place_outlined),
          ),
        ),

        // Instructions livreur
        TextField(
          controller: _instructionsCtrl,
          maxLength: 500,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Instructions pour le livreur (optionnel)',
            hintText: 'Ex : sonner 2x, entrée côté parking',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.tips_and_updates_outlined),
            alignLabelWithHint: true,
          ),
        ),
      ],
    );
  }
}
