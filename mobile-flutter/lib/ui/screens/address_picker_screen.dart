import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Résultat d'une sélection de position sur la carte plein écran.
class AddressPickerResult {
  final double latitude;
  final double longitude;

  const AddressPickerResult({
    required this.latitude,
    required this.longitude,
  });
}

/// Écran plein écran pour choisir une position sur la carte.
///
/// UX :
///  - la carte occupe toute la surface,
///  - un pin fixe au centre de l'écran ; c'est la carte qu'on déplace,
///  - bouton flottant "Ma position" pour recentrer sur le GPS,
///  - barre d'action basse "Confirmer cette position" qui retourne
///    [AddressPickerResult] au parent via [Navigator.pop].
class AddressPickerScreen extends StatefulWidget {
  final double? initialLatitude;
  final double? initialLongitude;
  final String? title;

  const AddressPickerScreen({
    super.key,
    this.initialLatitude,
    this.initialLongitude,
    this.title,
  });

  @override
  State<AddressPickerScreen> createState() => _AddressPickerScreenState();
}

class _AddressPickerScreenState extends State<AddressPickerScreen> {
  // Fallback : Tunis si rien n'est fourni.
  static const LatLng _defaultCenter = LatLng(36.8065, 10.1815);

  GoogleMapController? _mapController;
  late LatLng _center;
  bool _capturingGps = false;

  @override
  void initState() {
    super.initState();
    _center = (widget.initialLatitude != null && widget.initialLongitude != null)
        ? LatLng(widget.initialLatitude!, widget.initialLongitude!)
        : _defaultCenter;
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
      final target = LatLng(pos.latitude, pos.longitude);
      setState(() => _center = target);
      await _mapController?.animateCamera(
        CameraUpdate.newLatLngZoom(target, 17),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur GPS : $e')),
      );
    } finally {
      if (mounted) setState(() => _capturingGps = false);
    }
  }

  void _onCameraMove(CameraPosition position) {
    _center = position.target;
  }

  void _confirm() {
    Navigator.of(context).pop(
      AddressPickerResult(
        latitude: _center.latitude,
        longitude: _center.longitude,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title ?? 'Choisir la position'),
      ),
      body: Stack(
        alignment: Alignment.center,
        children: [
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: _center,
              zoom: widget.initialLatitude != null ? 16 : 12,
            ),
            onMapCreated: (ctrl) => _mapController = ctrl,
            onCameraMove: _onCameraMove,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            compassEnabled: false,
          ),
          // Pin fixe au centre de l'écran : on déplace la carte, le pin reste.
          // Hauteur 48 mais on le décale un peu vers le haut pour que la
          // pointe corresponde au centre exact.
          const IgnorePointer(
            child: Padding(
              padding: EdgeInsets.only(bottom: 44),
              child: Icon(
                Icons.location_on_rounded,
                size: 48,
                color: Color(0xFFD32F2F),
              ),
            ),
          ),
          // Bandeau d'aide haut.
          Positioned(
            top: 12,
            left: 12,
            right: 12,
            child: Material(
              color: Colors.transparent,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.92),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x22000000),
                      blurRadius: 6,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline_rounded,
                        size: 18, color: scheme.primary),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'Déplace la carte pour placer le pin à ta porte, '
                        'puis appuie sur Confirmer.',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          // Bouton "Ma position" flottant.
          Positioned(
            right: 12,
            bottom: 118,
            child: FloatingActionButton(
              heroTag: 'addr_picker_gps',
              onPressed: _capturingGps ? null : _captureGps,
              tooltip: 'Ma position',
              child: _capturingGps
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2.4),
                    )
                  : const Icon(Icons.my_location_rounded),
            ),
          ),
          // Barre d'action basse.
          Positioned(
            left: 12,
            right: 12,
            bottom: 24,
            child: Material(
              color: Colors.transparent,
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x26000000),
                      blurRadius: 10,
                      offset: Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Position : '
                            '${_center.latitude.toStringAsFixed(5)}, '
                            '${_center.longitude.toStringAsFixed(5)}',
                            style:
                                const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _confirm,
                        icon: const Icon(Icons.check_rounded),
                        label: const Text('Confirmer cette position'),
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          textStyle: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 15,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
