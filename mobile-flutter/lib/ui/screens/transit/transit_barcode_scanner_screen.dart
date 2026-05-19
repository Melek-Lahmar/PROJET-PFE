import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../core/api_exception.dart';
import '../../../data/services/refonte/transit_service.dart';

class TransitBarcodeScannerScreen extends StatefulWidget {
  final TransitService service;
  final String missionId;
  final String? articleRef;

  const TransitBarcodeScannerScreen({
    super.key,
    required this.service,
    required this.missionId,
    this.articleRef,
  });

  @override
  State<TransitBarcodeScannerScreen> createState() =>
      _TransitBarcodeScannerScreenState();
}

class _TransitBarcodeScannerScreenState
    extends State<TransitBarcodeScannerScreen> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
  );

  bool _busy = false;
  String? _lastBarcode;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _handleBarcode(String raw) async {
    final barcode = raw.trim();
    if (barcode.isEmpty || _busy || barcode == _lastBarcode) return;

    setState(() {
      _busy = true;
      _lastBarcode = barcode;
    });

    try {
      await _controller.stop();
      final result = await widget.service.scan(
        missionId: widget.missionId,
        scannedBarcode: barcode,
      );
      if (!mounted) return;
      final success = result['success'] == true;
      final message =
          (result['message'] ?? (success ? 'Scan validé.' : 'Scan refusé.'))
              .toString();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: success ? Colors.green : Colors.red,
        ),
      );
      Navigator.pop(context, success);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.displayMessage), backgroundColor: Colors.red),
      );
      await _controller.start();
      if (!mounted) return;
      setState(() {
        _busy = false;
        _lastBarcode = null;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Scan impossible : $e'),
          backgroundColor: Colors.red,
        ),
      );
      await _controller.start();
      if (!mounted) return;
      setState(() {
        _busy = false;
        _lastBarcode = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.articleRef == null
              ? 'Scanner transit'
              : 'Scanner ${widget.articleRef}',
        ),
        actions: [
          IconButton(
            tooltip: 'Lampe',
            onPressed: () => _controller.toggleTorch(),
            icon: const Icon(Icons.flashlight_on_outlined),
          ),
          IconButton(
            tooltip: 'Changer caméra',
            onPressed: () => _controller.switchCamera(),
            icon: const Icon(Icons.cameraswitch_outlined),
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: (capture) {
              String? value;
              for (final barcode in capture.barcodes) {
                final raw = barcode.rawValue?.trim();
                if (raw != null && raw.isNotEmpty) {
                  value = raw;
                  break;
                }
              }
              if (value != null) {
                unawaited(_handleBarcode(value));
              }
            },
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                boxShadow: const [
                  BoxShadow(blurRadius: 18, color: Colors.black26),
                ],
              ),
              child: SafeArea(
                top: false,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _busy
                          ? 'Validation backend en cours...'
                          : 'Présente le code-barres dans le cadre.',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Aucun changement local n’est appliqué avant confirmation API.',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (_busy)
            const Center(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.black54,
                  shape: BoxShape.circle,
                ),
                child: Padding(
                  padding: EdgeInsets.all(20),
                  child: CircularProgressIndicator(color: Colors.white),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
