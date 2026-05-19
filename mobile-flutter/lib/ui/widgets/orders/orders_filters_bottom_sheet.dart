import 'package:flutter/material.dart';

import '../../../core/constants.dart';
import '../../../models/orders_filters.dart';

class OrdersFiltersBottomSheet extends StatefulWidget {
  final OrdersFilters initialFilters;
  final ValueChanged<OrdersFilters> onApply;

  const OrdersFiltersBottomSheet({
    super.key,
    required this.initialFilters,
    required this.onApply,
  });

  @override
  State<OrdersFiltersBottomSheet> createState() =>
      _OrdersFiltersBottomSheetState();
}

class _OrdersFiltersBottomSheetState extends State<OrdersFiltersBottomSheet> {
  late int? _selectedStatus;
  late bool _urgentOnly;
  late bool _todayOnly;
  late DateTime? _dateFrom;
  late DateTime? _dateTo;

  late TextEditingController _paymentCtrl;
  late TextEditingController _minCtrl;
  late TextEditingController _maxCtrl;

  @override
  void initState() {
    super.initState();

    final f = widget.initialFilters;

    _selectedStatus = f.statut;
    _urgentOnly = f.urgentOnly;
    _todayOnly = f.todayOnly;
    _dateFrom = f.dateFrom;
    _dateTo = f.dateTo;

    _paymentCtrl = TextEditingController(text: f.paymentMethod ?? '');
    _minCtrl = TextEditingController(
      text: f.minMontant != null ? f.minMontant!.toStringAsFixed(2) : '',
    );
    _maxCtrl = TextEditingController(
      text: f.maxMontant != null ? f.maxMontant!.toStringAsFixed(2) : '',
    );
  }

  @override
  void dispose() {
    _paymentCtrl.dispose();
    _minCtrl.dispose();
    _maxCtrl.dispose();
    super.dispose();
  }

  double? _parseAmount(String raw) {
    final cleaned = raw.trim().replaceAll(',', '.');
    if (cleaned.isEmpty) return null;
    return double.tryParse(cleaned);
  }

  String _fmtDate(DateTime? date) {
    if (date == null) return 'Non définie';
    final d = date.day.toString().padLeft(2, '0');
    final m = date.month.toString().padLeft(2, '0');
    final y = date.year.toString();
    return '$d/$m/$y';
  }

  Future<void> _pickDate({
    required DateTime? initialDate,
    required ValueChanged<DateTime?> onPicked,
  }) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate ?? now,
      firstDate: DateTime(now.year - 2),
      lastDate: DateTime(now.year + 2),
    );

    if (!mounted) return;
    onPicked(picked);
  }

  void _apply() {
    final filters = OrdersFilters(
      statut: _selectedStatus,
      urgentOnly: _urgentOnly,
      todayOnly: _todayOnly,
      paymentMethod:
      _paymentCtrl.text.trim().isEmpty ? null : _paymentCtrl.text.trim(),
      minMontant: _parseAmount(_minCtrl.text),
      maxMontant: _parseAmount(_maxCtrl.text),
      dateFrom: _todayOnly ? null : _dateFrom,
      dateTo: _todayOnly ? null : _dateTo,
    );

    widget.onApply(filters);
    Navigator.of(context).pop();
  }

  void _reset() {
    setState(() {
      _selectedStatus = null;
      _urgentOnly = false;
      _todayOnly = false;
      _dateFrom = null;
      _dateTo = null;
      _paymentCtrl.clear();
      _minCtrl.clear();
      _maxCtrl.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 12, 16, 16 + bottomInset),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 42,
                  height: 5,
                  decoration: BoxDecoration(
                    color: scheme.outlineVariant,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Filtres avancés',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 18),
              DropdownButtonFormField<int?>(
                value: _selectedStatus,
                decoration: const InputDecoration(
                  labelText: 'Statut',
                ),
                items: const [
                  DropdownMenuItem<int?>(
                    value: null,
                    child: Text('Tous'),
                  ),
                  DropdownMenuItem<int?>(
                    value: Statut.confirme,
                    child: Text('Confirmé'),
                  ),
                  DropdownMenuItem<int?>(
                    value: Statut.enLivraison,
                    child: Text('En livraison'),
                  ),
                  DropdownMenuItem<int?>(
                    value: Statut.livre,
                    child: Text('Livré'),
                  ),
                  DropdownMenuItem<int?>(
                    value: Statut.reporte,
                    child: Text('Reporté'),
                  ),
                  DropdownMenuItem<int?>(
                    value: Statut.retourne,
                    child: Text('Retourné'),
                  ),
                  DropdownMenuItem<int?>(
                    value: Statut.depot,
                    child: Text('Dépôt'),
                  ),
                ],
                onChanged: (value) {
                  setState(() {
                    _selectedStatus = value;
                  });
                },
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _paymentCtrl,
                decoration: const InputDecoration(
                  labelText: 'Mode de paiement',
                  hintText: 'Ex: Espèces',
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _minCtrl,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: const InputDecoration(
                        labelText: 'Montant min',
                        hintText: '0.00',
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _maxCtrl,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: const InputDecoration(
                        labelText: 'Montant max',
                        hintText: '999.99',
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              SwitchListTile.adaptive(
                value: _urgentOnly,
                contentPadding: EdgeInsets.zero,
                title: const Text('Seulement urgent'),
                onChanged: (v) {
                  setState(() {
                    _urgentOnly = v;
                  });
                },
              ),
              SwitchListTile.adaptive(
                value: _todayOnly,
                contentPadding: EdgeInsets.zero,
                title: const Text('Commandes du jour'),
                onChanged: (v) {
                  setState(() {
                    _todayOnly = v;
                    if (v) {
                      _dateFrom = null;
                      _dateTo = null;
                    }
                  });
                },
              ),
              const SizedBox(height: 8),
              Opacity(
                opacity: _todayOnly ? 0.45 : 1,
                child: IgnorePointer(
                  ignoring: _todayOnly,
                  child: Column(
                    children: [
                      InkWell(
                        onTap: () => _pickDate(
                          initialDate: _dateFrom,
                          onPicked: (value) {
                            setState(() {
                              _dateFrom = value;
                            });
                          },
                        ),
                        borderRadius: BorderRadius.circular(14),
                        child: Ink(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: scheme.outline.withOpacity(0.28),
                            ),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.date_range_outlined),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text('Date début : ${_fmtDate(_dateFrom)}'),
                              ),
                              const Icon(Icons.chevron_right),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      InkWell(
                        onTap: () => _pickDate(
                          initialDate: _dateTo,
                          onPicked: (value) {
                            setState(() {
                              _dateTo = value;
                            });
                          },
                        ),
                        borderRadius: BorderRadius.circular(14),
                        child: Ink(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: scheme.outline.withOpacity(0.28),
                            ),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.event_available_outlined),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text('Date fin : ${_fmtDate(_dateTo)}'),
                              ),
                              const Icon(Icons.chevron_right),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _reset,
                      child: const Text('Réinitialiser'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: _apply,
                      child: const Text('Appliquer'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}