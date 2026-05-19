import 'package:flutter/material.dart';

/// Section 2.18 — composant générique drill-down KPI admin Flutter.
/// Push navigation. AppBar avec bouton retour + bouton Excel/PDF.
class AdminKpiDetailScreen<T> extends StatefulWidget {
  final String title;
  final Future<List<T>> Function() loadData;
  final Widget Function(T item) buildRow;
  final void Function(T item)? onRowTap;
  final void Function()? onExportExcel;
  final void Function()? onExportPdf;

  const AdminKpiDetailScreen({
    super.key,
    required this.title,
    required this.loadData,
    required this.buildRow,
    this.onRowTap,
    this.onExportExcel,
    this.onExportPdf,
  });

  @override
  State<AdminKpiDetailScreen<T>> createState() => _AdminKpiDetailScreenState<T>();
}

class _AdminKpiDetailScreenState<T> extends State<AdminKpiDetailScreen<T>> {
  bool _loading = true;
  String? _error;
  List<T> _items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      _items = await widget.loadData();
    } catch (e) {
      _error = e.toString();
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        actions: [
          if (widget.onExportExcel != null)
            IconButton(
                onPressed: widget.onExportExcel,
                icon: const Icon(Icons.table_view),
                tooltip: 'Exporter Excel'),
          if (widget.onExportPdf != null)
            IconButton(
                onPressed: widget.onExportPdf,
                icon: const Icon(Icons.picture_as_pdf),
                tooltip: 'Exporter PDF'),
          IconButton(
            onPressed: _load,
            icon: const Icon(Icons.refresh),
            tooltip: 'Rafraîchir',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!),
                      const SizedBox(height: 8),
                      FilledButton(onPressed: _load, child: const Text('Réessayer')),
                    ],
                  ),
                )
              : _items.isEmpty
                  ? const Center(child: Text('Aucune donnée.'))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(8),
                        itemCount: _items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 6),
                        itemBuilder: (_, i) => InkWell(
                          onTap: widget.onRowTap == null
                              ? null
                              : () => widget.onRowTap!(_items[i]),
                          child: widget.buildRow(_items[i]),
                        ),
                      ),
                    ),
    );
  }
}
