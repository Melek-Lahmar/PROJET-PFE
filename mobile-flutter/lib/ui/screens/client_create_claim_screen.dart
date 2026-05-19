import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../core/validators.dart';
import '../../data/reclamation_motifs.dart';
import '../../models/client_claim.dart';
import '../../models/customer_order.dart';
import '../../state/client_claims_provider.dart';
import '../../state/customer_orders_provider.dart';
import '../widgets/claims/address_correction_field.dart';

class ClientCreateClaimScreen extends StatefulWidget {
  final CustomerOrder? lockedOrder;
  final String initialPiece;

  /// Permet à l'appelant de pré-sélectionner un motif (ex : bouton
  /// « Reprogrammer » du tracking qui pousse `REPROGRAMMATION`).
  /// Ignoré si le motif n'est pas disponible pour le statut de la commande.
  final String? initialMotifCode;

  const ClientCreateClaimScreen({
    super.key,
    this.initialPiece = '',
    this.initialMotifCode,
  }) : lockedOrder = null;

  const ClientCreateClaimScreen.forOrder({
    super.key,
    required CustomerOrder order,
    this.initialMotifCode,
  })  : lockedOrder = order,
        initialPiece = '';

  bool get isLocked => lockedOrder != null;

  @override
  State<ClientCreateClaimScreen> createState() => _ClientCreateClaimScreenState();
}

class _ClientCreateClaimScreenState extends State<ClientCreateClaimScreen> {
  static const String _globalKey = '__GLOBAL__';

  final _formKey = GlobalKey<FormState>();
  final _descriptionCtrl = TextEditingController();
  final _correctionPhoneCtrl = TextEditingController();

  bool _submitting = false;
  bool _loadingOrders = true;
  String? _loadingError;

  List<CustomerOrder> _orders = const [];
  String? _selectedOrderPiece;
  String _selectedLineKey = _globalKey;
  ClientMotif? _selectedMotif;
  final List<File> _pickedPhotos = [];

  // Phase 6 — valeurs du widget AddressCorrectionField (motif CHANGEMENT_ADRESSE)
  String? _address;
  double? _latitude;
  double? _longitude;
  String? _repere;
  String? _instructions;

  // Phase 7 — motif REPROGRAMMATION : date J+1..J+14 + créneau MATIN/APRES_MIDI/SOIR.
  DateTime? _reprogDate;
  String? _reprogCreneau;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadOrders());
  }

  @override
  void dispose() {
    _descriptionCtrl.dispose();
    _correctionPhoneCtrl.dispose();
    super.dispose();
  }

  CustomerOrder? get _selectedOrder {
    if (widget.isLocked) return widget.lockedOrder;
    final piece = _selectedOrderPiece;
    if (piece == null) return null;
    for (final o in _orders) {
      if (o.piece == piece) return o;
    }
    return null;
  }

  bool get _isGlobal => _selectedLineKey == _globalKey;
  String? get _selectedArRef => _isGlobal ? null : _selectedLineKey;

  bool get _isOrderDelivered =>
      (_selectedOrder?.normalizedStatus.toUpperCase() ?? '') == 'LIVRE';

  List<ClientMotif> get _availableMotifs =>
      clientMotifsForOrderStatus(_selectedOrder?.normalizedStatus ?? '');

  Future<void> _loadOrders() async {
    if (!mounted) return;
    setState(() {
      _loadingOrders = true;
      _loadingError = null;
    });
    try {
      if (widget.isLocked) {
        _orders = [widget.lockedOrder!];
        _selectedOrderPiece = widget.lockedOrder!.piece;
      } else {
        final provider = context.read<CustomerOrdersProvider>();
        var orders = [...provider.orders];
        if (orders.isEmpty) {
          await provider.refresh().timeout(const Duration(seconds: 10));
          orders = [...provider.orders];
        }
        _orders = orders;
        _selectedOrderPiece = _orders.isNotEmpty ? _orders.first.piece : null;
      }
      _selectedLineKey = _globalKey;
      _onOrderChanged();
    } catch (e) {
      _loadingError = e.toString();
    } finally {
      if (mounted) setState(() => _loadingOrders = false);
    }
  }

  void _onOrderChanged() {
    // Réinitialise le motif sélectionné avec le premier disponible, sauf si
    // l'appelant a pré-sélectionné un motif et qu'il est dispo pour ce statut.
    final motifs = _availableMotifs;
    ClientMotif? preset;
    final hint = widget.initialMotifCode;
    if (hint != null) {
      for (final m in motifs) {
        if (m.code == hint) {
          preset = m;
          break;
        }
      }
    }
    _selectedMotif = preset ?? (motifs.isNotEmpty ? motifs.first : null);
    _pickedPhotos.clear();
    _correctionPhoneCtrl.clear();
    _descriptionCtrl.clear();
    _address = null;
    _latitude = null;
    _longitude = null;
    _repere = null;
    _instructions = null;
    _reprogDate = null;
    _reprogCreneau = null;
  }

  Future<void> _pickReprogDate() async {
    final now = DateTime.now();
    final first = DateTime(now.year, now.month, now.day).add(const Duration(days: 1));
    final last = first.add(const Duration(days: 13)); // J+1 à J+14 inclus
    final picked = await showDatePicker(
      context: context,
      helpText: 'Date de reprogrammation (J+1 à J+14)',
      initialDate: _reprogDate?.toLocal() ?? first,
      firstDate: first,
      lastDate: last,
    );
    if (picked == null) return;
    // Midi UTC de la date choisie : la validation backend ne regarde que le
    // jour calendaire UTC, cette heure pivot évite tout décalage de fuseau.
    setState(() => _reprogDate = DateTime.utc(picked.year, picked.month, picked.day, 12));
  }

  Future<void> _pickPhoto(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(source: source, imageQuality: 85);
      if (picked == null) return;
      if (_pickedPhotos.length >= 5) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Maximum 5 photos par demande.')),
        );
        return;
      }
      setState(() => _pickedPhotos.add(File(picked.path)));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur photo : $e')),
        );
      }
    }
  }

  String? _buildCorrectionJson() {
    final m = _selectedMotif;
    if (m == null || !m.needsCorrection) return null;
    final phone = _correctionPhoneCtrl.text.trim();
    final map = <String, dynamic>{};
    if (m.code == 'CHANGEMENT_ADRESSE') {
      if (_address != null && _address!.isNotEmpty) map['address'] = _address;
      if (_latitude != null) map['latitude'] = _latitude;
      if (_longitude != null) map['longitude'] = _longitude;
      if (_repere != null && _repere!.isNotEmpty) map['repere'] = _repere;
      if (_instructions != null && _instructions!.isNotEmpty) {
        map['instructions'] = _instructions;
      }
    }
    if (m.code == 'CHANGEMENT_NUMERO' && phone.isNotEmpty) {
      map['phone'] = TunisianPhoneValidator.normalize(phone);
    }
    return map.isEmpty ? null : jsonEncode(map);
  }

  Future<void> _submit() async {
    if (_submitting) return;
    final motif = _selectedMotif;
    if (motif == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sélectionne un motif.')),
      );
      return;
    }
    if (!_formKey.currentState!.validate()) return;

    final order = _selectedOrder;
    if (order == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez sélectionner une commande.')),
      );
      return;
    }

    // Validation photo obligatoire
    if (motif.needsPhoto && _pickedPhotos.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              'Photo obligatoire pour le motif "${motif.label}". Ajoute au moins une photo.'),
        ),
      );
      return;
    }

    // Validation correction obligatoire
    if (motif.needsCorrection) {
      if (motif.code == 'CHANGEMENT_ADRESSE') {
        if (_address == null || _address!.length < 5) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Renseigne la nouvelle adresse (5 caractères minimum).')),
          );
          return;
        }
        if (_latitude == null || _longitude == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Sélectionne la position sur la carte ou utilise "Ma position".')),
          );
          return;
        }
      } else {
        final corr = _buildCorrectionJson();
        if (corr == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Saisis la nouvelle valeur (adresse ou numéro).')),
          );
          return;
        }
      }
    }

    // Phase 7 — validation reprogrammation (bornes identiques au backend).
    if (motif.code == 'REPROGRAMMATION') {
      if (_reprogDate == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Choisis une date de reprogrammation (J+1 à J+14).')),
        );
        return;
      }
      final today = DateTime.now();
      final todayMidnight = DateTime(today.year, today.month, today.day);
      final pickedMidnight = DateTime(
        _reprogDate!.toLocal().year,
        _reprogDate!.toLocal().month,
        _reprogDate!.toLocal().day,
      );
      final diff = pickedMidnight.difference(todayMidnight).inDays;
      if (diff < 1 || diff > 14) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('La date doit être entre demain (J+1) et J+14.')),
        );
        return;
      }
      if (_reprogCreneau == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Choisis un créneau : Matin, Après-midi ou Soir.')),
        );
        return;
      }
    }

    setState(() => _submitting = true);

    try {
      final created = await context.read<ClientClaimsProvider>().create(
            doPiece: order.piece,
            isGlobal: _isGlobal,
            arRef: _selectedArRef,
            motif: motif.code,
            description: _descriptionCtrl.text.trim(),
            correctionProposee: _buildCorrectionJson(),
            photos: motif.needsPhoto && _pickedPhotos.isNotEmpty ? _pickedPhotos : null,
            reprogrammationDate:
                motif.code == 'REPROGRAMMATION' ? _reprogDate : null,
            reprogrammationCreneau:
                motif.code == 'REPROGRAMMATION' ? _reprogCreneau : null,
          );

      if (!mounted) return;
      if (created != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Demande envoyée avec succès.')),
        );
        Navigator.of(context).pop<ClientClaim>(created);
      } else {
        final error = context.read<ClientClaimsProvider>().error;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error ?? 'Impossible de créer la demande.')),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isLocked
            ? 'Demande — ${widget.lockedOrder!.piece}'
            : 'Nouvelle demande'),
      ),
      body: Builder(
        builder: (context) {
          if (_loadingOrders) {
            return const Center(child: CircularProgressIndicator());
          }
          if (_loadingError != null) {
            return _Error(title: 'Erreur chargement', message: _loadingError!, onRetry: _loadOrders);
          }
          final order = _selectedOrder;
          if (order == null) {
            return _Error(
              title: 'Aucune commande disponible',
              message: 'Ouvre tes commandes d\'abord.',
              onRetry: _loadOrders,
            );
          }

          final availableMotifs = _availableMotifs;
          if (availableMotifs.isEmpty) {
            return _Error(
              title: 'Aucun motif disponible',
              message: 'Le statut actuel de la commande ne permet aucune réclamation.',
              onRetry: _loadOrders,
            );
          }

          // S'assurer que le motif actuel est dans la liste disponible
          final motif = _selectedMotif != null &&
                  availableMotifs.any((m) => m.code == _selectedMotif!.code)
              ? _selectedMotif!
              : availableMotifs.first;
          if (_selectedMotif?.code != motif.code) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) setState(() => _selectedMotif = motif);
            });
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Bandeau statut commande
                  Container(
                    padding: const EdgeInsets.all(10),
                    margin: const EdgeInsets.only(bottom: 14),
                    decoration: BoxDecoration(
                      color: _isOrderDelivered
                          ? scheme.primaryContainer.withOpacity(0.4)
                          : scheme.tertiaryContainer.withOpacity(0.4),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(children: [
                      Icon(
                        _isOrderDelivered
                            ? Icons.check_circle_rounded
                            : Icons.local_shipping_outlined,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _isOrderDelivered
                              ? 'Commande livrée — motifs disponibles : endommagé, non conforme, mauvais comportement.'
                              : 'Commande non livrée — motifs disponibles : adresse, numéro, annulation, reprog, non reçu.',
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                        ),
                      ),
                    ]),
                  ),

                  if (!widget.isLocked) ...[
                    DropdownButtonFormField<String>(
                      value: _selectedOrderPiece,
                      isExpanded: true,
                      decoration: const InputDecoration(
                        labelText: 'Commande concernée',
                        border: OutlineInputBorder(),
                      ),
                      items: _orders
                          .map((o) => DropdownMenuItem<String>(
                                value: o.piece,
                                child: Text('${o.piece} • ${o.statusLabel}',
                                    overflow: TextOverflow.ellipsis),
                              ))
                          .toList(),
                      onChanged: _submitting
                          ? null
                          : (v) {
                              if (v == null) return;
                              setState(() {
                                _selectedOrderPiece = v;
                                _selectedLineKey = _globalKey;
                                _onOrderChanged();
                              });
                            },
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Scope
                  DropdownButtonFormField<String>(
                    value: _selectedLineKey,
                    isExpanded: true,
                    decoration: const InputDecoration(
                      labelText: 'Périmètre',
                      border: OutlineInputBorder(),
                    ),
                    items: [
                      const DropdownMenuItem(
                        value: _globalKey,
                        child: Text('Toute la commande'),
                      ),
                      ...order.lines.map((l) => DropdownMenuItem(
                            value: l.articleRef,
                            child: Text(
                              '${l.articleRef} • ${(l.designation ?? '').isEmpty ? l.articleRef : l.designation!.trim()}',
                              overflow: TextOverflow.ellipsis,
                            ),
                          )),
                    ],
                    onChanged: _submitting
                        ? null
                        : (v) {
                            if (v == null) return;
                            setState(() => _selectedLineKey = v);
                          },
                  ),
                  const SizedBox(height: 14),

                  // Motif (filtré selon statut commande)
                  DropdownButtonFormField<ClientMotif>(
                    value: motif,
                    isExpanded: true,
                    decoration: const InputDecoration(
                      labelText: 'Motif',
                      border: OutlineInputBorder(),
                    ),
                    items: availableMotifs
                        .map((m) => DropdownMenuItem(
                              value: m,
                              child: Text(m.label),
                            ))
                        .toList(),
                    onChanged: _submitting
                        ? null
                        : (v) {
                            if (v == null) return;
                            setState(() {
                              _selectedMotif = v;
                              _pickedPhotos.clear();
                              _correctionPhoneCtrl.clear();
                              _address = null;
                              _latitude = null;
                              _longitude = null;
                              _repere = null;
                              _instructions = null;
                              _reprogDate = null;
                              _reprogCreneau = null;
                            });
                          },
                  ),

                  // Photo obligatoire bandeau (seulement pour endommagé / non conforme)
                  if (motif.needsPhoto) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: scheme.errorContainer.withOpacity(0.4),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.photo_camera_outlined, color: scheme.error),
                          const SizedBox(width: 8),
                          const Expanded(
                            child: Text(
                              'Photo obligatoire pour ce motif.',
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 14),

                  // Correction (seulement pour changement adresse / numéro)
                  if (motif.code == 'CHANGEMENT_ADRESSE')
                    AddressCorrectionField(
                      initialAddress: _address,
                      initialLatitude: _latitude,
                      initialLongitude: _longitude,
                      initialRepere: _repere,
                      initialInstructions: _instructions,
                      onChanged: ({
                        required String? address,
                        required double? latitude,
                        required double? longitude,
                        required String? repere,
                        required String? instructionsLivreur,
                      }) {
                        setState(() {
                          _address = address;
                          _latitude = latitude;
                          _longitude = longitude;
                          _repere = repere;
                          _instructions = instructionsLivreur;
                        });
                      },
                    ),
                  if (motif.code == 'CHANGEMENT_NUMERO')
                    TextFormField(
                      controller: _correctionPhoneCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Nouveau numéro tunisien',
                        hintText: '22123456 ou +216 22 123 456',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.phone,
                      maxLength: 20,
                      validator: (v) {
                        if (motif.code != 'CHANGEMENT_NUMERO') return null;
                        return TunisianPhoneValidator.validate(v);
                      },
                    ),
                  if (motif.needsCorrection) const SizedBox(height: 14),

                  // Phase 7 — Reprogrammation : date + créneau obligatoires.
                  if (motif.code == 'REPROGRAMMATION') ...[
                    _ReprogrammationPicker(
                      selectedDate: _reprogDate,
                      selectedCreneau: _reprogCreneau,
                      onPickDate: _submitting ? null : _pickReprogDate,
                      onChangeCreneau: _submitting
                          ? null
                          : (code) => setState(() => _reprogCreneau = code),
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Description — TOUJOURS optionnelle
                  TextFormField(
                    controller: _descriptionCtrl,
                    enabled: !_submitting,
                    minLines: 3,
                    maxLines: 5,
                    maxLength: 1000,
                    decoration: const InputDecoration(
                      labelText: 'Description (optionnelle)',
                      hintText: 'Ajoute des précisions si tu veux.',
                      border: OutlineInputBorder(),
                      alignLabelWithHint: true,
                    ),
                    // Pas de validator — champ 100% optionnel côté client
                  ),
                  const SizedBox(height: 14),

                  // Photos — UNIQUEMENT pour les motifs qui en ont besoin
                  if (motif.needsPhoto) ...[
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text('Photos (${_pickedPhotos.length}/5)',
                          style: const TextStyle(fontWeight: FontWeight.w700)),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        ..._pickedPhotos.asMap().entries.map((e) => Stack(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(10),
                                  child: Image.file(
                                    e.value,
                                    width: 80,
                                    height: 80,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                                Positioned(
                                  top: 2,
                                  right: 2,
                                  child: InkWell(
                                    onTap: () {
                                      setState(() => _pickedPhotos.removeAt(e.key));
                                    },
                                    child: Container(
                                      decoration: const BoxDecoration(
                                        color: Colors.black54,
                                        shape: BoxShape.circle,
                                      ),
                                      padding: const EdgeInsets.all(4),
                                      child: const Icon(Icons.close,
                                          size: 14, color: Colors.white),
                                    ),
                                  ),
                                ),
                              ],
                            )),
                        if (_pickedPhotos.length < 5)
                          InkWell(
                            onTap: () => _pickPhoto(ImageSource.camera),
                            child: Container(
                              width: 80,
                              height: 80,
                              decoration: BoxDecoration(
                                color: scheme.surfaceContainerHighest.withOpacity(0.5),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.photo_camera_outlined),
                            ),
                          ),
                        if (_pickedPhotos.length < 5)
                          InkWell(
                            onTap: () => _pickPhoto(ImageSource.gallery),
                            child: Container(
                              width: 80,
                              height: 80,
                              decoration: BoxDecoration(
                                color: scheme.surfaceContainerHighest.withOpacity(0.5),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.photo_library_outlined),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 20),
                  ],

                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _submitting ? null : _submit,
                      icon: _submitting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.send_rounded),
                      label: Text(_submitting ? 'Envoi...' : 'Envoyer la demande'),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _Error extends StatelessWidget {
  final String title;
  final String message;
  final VoidCallback onRetry;
  const _Error({required this.title, required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded, size: 56),
            const SizedBox(height: 16),
            Text(title,
                textAlign: TextAlign.center,
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Réessayer'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Phase 7 — Bloc date + créneau affiché pour le motif REPROGRAMMATION.
/// Fenêtre : J+1 à J+14. Créneaux : MATIN (9-13h), APRES_MIDI (13-18h),
/// SOIR (18-20h). Les valeurs sont transmises au parent via callbacks.
class _ReprogrammationPicker extends StatelessWidget {
  final DateTime? selectedDate;
  final String? selectedCreneau;
  final VoidCallback? onPickDate;
  final void Function(String code)? onChangeCreneau;

  const _ReprogrammationPicker({
    required this.selectedDate,
    required this.selectedCreneau,
    required this.onPickDate,
    required this.onChangeCreneau,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final dateLabel = selectedDate == null
        ? 'Choisir une date (demain au plus tôt, J+14 au plus tard)'
        : _formatDate(selectedDate!.toLocal());

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.event_repeat_rounded, color: scheme.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Reprogrammation',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w900),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Sélectionne une nouvelle date et un créneau.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 12),
            InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: onPickDate,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                decoration: BoxDecoration(
                  border: Border.all(color: scheme.outline.withOpacity(0.5)),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.calendar_today_outlined,
                      color: selectedDate == null
                          ? scheme.onSurfaceVariant
                          : scheme.primary,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        dateLabel,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontWeight: selectedDate == null
                              ? FontWeight.w600
                              : FontWeight.w900,
                          color: selectedDate == null
                              ? scheme.onSurfaceVariant
                              : scheme.onSurface,
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(Icons.chevron_right_rounded,
                        color: scheme.onSurfaceVariant),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              'Créneau',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _CreneauChip(
                  code: 'MATIN',
                  label: 'Matin (9h–13h)',
                  selected: selectedCreneau == 'MATIN',
                  onTap: onChangeCreneau,
                ),
                _CreneauChip(
                  code: 'APRES_MIDI',
                  label: 'Après-midi (13h–18h)',
                  selected: selectedCreneau == 'APRES_MIDI',
                  onTap: onChangeCreneau,
                ),
                _CreneauChip(
                  code: 'SOIR',
                  label: 'Soir (18h–20h)',
                  selected: selectedCreneau == 'SOIR',
                  onTap: onChangeCreneau,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  static String _formatDate(DateTime d) {
    String two(int v) => v.toString().padLeft(2, '0');
    return '${two(d.day)}/${two(d.month)}/${d.year}';
  }
}

class _CreneauChip extends StatelessWidget {
  final String code;
  final String label;
  final bool selected;
  final void Function(String code)? onTap;

  const _CreneauChip({
    required this.code,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: onTap == null ? null : (_) => onTap!(code),
    );
  }
}
