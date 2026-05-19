import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../data/services/admin_confirmatrices_service.dart';
import '../../../models/admin_confirmatrice_work_stats.dart';

/// A.2 — Écran "Confirmatrices — temps de travail / temps de pause".
/// L'admin choisit une période arbitraire (date + heure début → date +
/// heure fin) ; la liste affiche pour chaque confirmatrice le temps de
/// pause total + son pourcentage (vert si < 10 %, orange si > 30 %).
class AdminConfirmatricesWorkStatsScreen extends StatefulWidget {
  const AdminConfirmatricesWorkStatsScreen({super.key});

  @override
  State<AdminConfirmatricesWorkStatsScreen> createState() =>
      _AdminConfirmatricesWorkStatsScreenState();
}

class _AdminConfirmatricesWorkStatsScreenState
    extends State<AdminConfirmatricesWorkStatsScreen> {
  late DateTime _from;
  late DateTime _to;
  bool _loading = true;
  String? _error;
  AdminConfirmatricesWorkStats? _data;

  static const _accent = Color(0xFF6E3CE9);

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _from = DateTime(now.year, now.month, now.day, 0, 0);
    _to = DateTime(now.year, now.month, now.day, 23, 59);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final svc = AdminConfirmatricesService(context.read<ApiClient>());
      final d = await svc.getWorkStats(from: _from, to: _to);
      if (!mounted) return;
      setState(() {
        _data = d;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _pickFrom() async {
    final newDate = await showDatePicker(
      context: context,
      initialDate: _from,
      firstDate: DateTime(2024),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (newDate == null || !mounted) return;
    final newTime = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_from),
    );
    if (newTime == null) return;
    setState(() {
      _from = DateTime(newDate.year, newDate.month, newDate.day,
          newTime.hour, newTime.minute);
    });
  }

  Future<void> _pickTo() async {
    final newDate = await showDatePicker(
      context: context,
      initialDate: _to,
      firstDate: DateTime(2024),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (newDate == null || !mounted) return;
    final newTime = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_to),
    );
    if (newTime == null) return;
    setState(() {
      _to = DateTime(newDate.year, newDate.month, newDate.day,
          newTime.hour, newTime.minute);
    });
  }

  String _fmt(DateTime d) {
    String two(int x) => x.toString().padLeft(2, '0');
    return '${two(d.day)}/${two(d.month)}/${d.year} ${two(d.hour)}:${two(d.minute)}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      appBar: AppBar(
        title: const Text('Confirmatrices — temps de pause'),
        backgroundColor: _accent,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          _periodCard(),
          if (_loading)
            const Expanded(
                child: Center(child: CircularProgressIndicator()))
          else if (_error != null)
            Expanded(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline_rounded,
                          color: Colors.red, size: 56),
                      const SizedBox(height: 12),
                      Text(_error!, textAlign: TextAlign.center),
                      const SizedBox(height: 12),
                      FilledButton(
                          onPressed: _load, child: const Text('Réessayer')),
                    ],
                  ),
                ),
              ),
            )
          else if (_data == null || _data!.confirmatrices.isEmpty)
            const Expanded(child: Center(child: Text('Aucune confirmatrice.')))
          else
            Expanded(child: _list(_data!)),
        ],
      ),
    );
  }

  Widget _periodCard() {
    final expectedMinutes = _to.difference(_from).inMinutes;
    final h = expectedMinutes ~/ 60;
    final m = expectedMinutes % 60;
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 12, 12, 6),
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
              color: Color(0x10000000),
              blurRadius: 12,
              offset: Offset(0, 4))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.event_note_rounded, color: _accent, size: 20),
              const SizedBox(width: 8),
              const Text('Période analysée',
                  style:
                      TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
              const Spacer(),
              if (expectedMinutes > 0)
                Text('Durée : ${h}h ${m.toString().padLeft(2, '0')}min',
                    style: const TextStyle(
                        color: Color(0xFF8A8FA8),
                        fontWeight: FontWeight.w700,
                        fontSize: 12)),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: _datePickerTile('Du', _from, _pickFrom)),
              const SizedBox(width: 10),
              Expanded(child: _datePickerTile('Au', _to, _pickTo)),
            ],
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _loading ? null : _load,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Appliquer le filtre'),
              style: FilledButton.styleFrom(
                backgroundColor: _accent,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _datePickerTile(String label, DateTime value, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFFF6F7FB),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFE6E8F2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: const TextStyle(
                    color: Color(0xFF8A8FA8),
                    fontSize: 11,
                    fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.schedule_rounded, size: 16, color: _accent),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(_fmt(value),
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontWeight: FontWeight.w900, fontSize: 13)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _list(AdminConfirmatricesWorkStats data) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(12, 6, 12, 24),
      itemCount: data.confirmatrices.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) => _row(data.confirmatrices[i]),
    );
  }

  Widget _row(AdminConfirmatriceWorkStatsItem c) {
    final pauseColor = c.pauseRatePercent > 30
        ? const Color(0xFFF97316)
        : c.pauseRatePercent < 10
            ? const Color(0xFF22C55E)
            : const Color(0xFF6B7280);
    final statusColor =
        c.isOnline ? const Color(0xFF22C55E) : const Color(0xFF9CA3AF);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
              color: Color(0x10000000),
              blurRadius: 10,
              offset: Offset(0, 4))
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor: _accent.withOpacity(0.12),
                radius: 22,
                child: const Icon(Icons.headset_mic_rounded,
                    color: _accent, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c.nom,
                        style: const TextStyle(
                            fontWeight: FontWeight.w900, fontSize: 15)),
                    const SizedBox(height: 2),
                    Text(
                        '${c.telephone ?? '—'}  ·  ${c.gouvernorat ?? '—'}',
                        style: const TextStyle(
                            color: Color(0xFF8A8FA8), fontSize: 12)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                            color: statusColor, shape: BoxShape.circle)),
                    const SizedBox(width: 4),
                    Text(c.isOnline ? 'En ligne' : 'Hors ligne',
                        style: TextStyle(
                            color: statusColor,
                            fontWeight: FontWeight.w800,
                            fontSize: 11)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _kpi(Icons.assignment_late_rounded,
                  'En cours', c.currentLoad.toString(), Colors.blue)),
              const SizedBox(width: 8),
              Expanded(
                  child: _kpi(Icons.task_alt_rounded, 'Clôturés',
                      c.casCloturees.toString(), Colors.green)),
              const SizedBox(width: 8),
              Expanded(
                child: _kpi(
                  Icons.coffee_rounded,
                  'Pause',
                  '${c.formatPauseDuration()}\n(${c.pauseRatePercent.toStringAsFixed(1)}%)',
                  pauseColor,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _kpi(IconData icon, String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.10),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(height: 4),
          Text(label,
              style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w800,
                  fontSize: 11)),
          const SizedBox(height: 2),
          Text(value,
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontWeight: FontWeight.w900,
                  color: color,
                  fontSize: 12,
                  height: 1.2)),
        ],
      ),
    );
  }
}
