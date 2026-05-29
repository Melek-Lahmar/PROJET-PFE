import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

/// 2.D — KPI Detail Premium : écran plein-écran qui affiche un KPI cliqué
/// avec un graphique en haut (line / bar / donut / area selon le type),
/// puis une liste détaillée filtrable / cherchable en cartes blanches
/// avec animations fluides.
///
/// Le composant est générique :
/// - `T` = type d'item de la liste (commande, livreur, réclamation, etc.)
/// - `loadData()` charge les items (et la série de chart si dynamique)
/// - `buildRow(T)` rend chaque ligne dans une carte premium
/// - `kpiType` détermine quel chart est affiché en haut.
enum KpiChartType { timeline, comparison, distribution, cumulative }

class KpiPeriod {
  final String key;
  final String label;
  const KpiPeriod(this.key, this.label);
  static const today = KpiPeriod('today', "Aujourd'hui");
  static const week = KpiPeriod('week', 'Semaine');
  static const month = KpiPeriod('month', 'Mois');
}

class KpiSeriesPoint {
  final String label;
  final double value;
  final Color? color;
  const KpiSeriesPoint(this.label, this.value, {this.color});
}

class KpiData<T> {
  final List<KpiSeriesPoint> series;
  final List<T> items;
  const KpiData({this.series = const [], this.items = const []});
}

class KpiDetailPremiumScreen<T> extends StatefulWidget {
  final String title;
  final String? subtitle;
  final IconData icon;
  final Color accent;
  final KpiChartType chartType;
  final Future<KpiData<T>> Function(KpiPeriod period) loadData;
  /// Construit la ligne pour un item. Le `BuildContext` est fourni pour
  /// permettre aux closures d'ouvrir des écrans de détail au tap.
  final Widget Function(BuildContext context, T item) buildRow;
  final bool Function(T item, String query)? searchFilter;
  final List<KpiPeriod> periods;

  const KpiDetailPremiumScreen({
    super.key,
    required this.title,
    this.subtitle,
    required this.icon,
    required this.accent,
    required this.chartType,
    required this.loadData,
    required this.buildRow,
    this.searchFilter,
    this.periods = const [KpiPeriod.today, KpiPeriod.week, KpiPeriod.month],
  });

  @override
  State<KpiDetailPremiumScreen<T>> createState() =>
      _KpiDetailPremiumScreenState<T>();
}

class _KpiDetailPremiumScreenState<T> extends State<KpiDetailPremiumScreen<T>>
    with SingleTickerProviderStateMixin {
  late KpiPeriod _period;
  KpiData<T>? _data;
  bool _loading = true;
  String? _error;
  String _query = '';

  late final AnimationController _entryCtrl;
  late final Animation<double> _entryAnim;

  @override
  void initState() {
    super.initState();
    _period = widget.periods.first;
    _entryCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _entryAnim = CurvedAnimation(parent: _entryCtrl, curve: Curves.easeOutCubic);
    _load();
  }

  @override
  void dispose() {
    _entryCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await widget.loadData(_period);
      if (!mounted) return;
      setState(() {
        _data = data;
        _loading = false;
      });
      _entryCtrl
        ..reset()
        ..forward();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  List<T> get _filteredItems {
    final items = _data?.items ?? const [];
    if (_query.isEmpty || widget.searchFilter == null) return items;
    return items.where((it) => widget.searchFilter!(it, _query)).toList();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      body: SafeArea(
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // ── Header gradient sticky ──────────────────────────────
            SliverPersistentHeader(
              pinned: false,
              delegate: _StickyHeaderDelegate(
                minExtent: 250,
                maxExtent: 360,
                builder: (shrink) => _buildHeader(scheme),
              ),
            ),
            // ── Toolbar (recherche + filtres période) ──────────────
            SliverPersistentHeader(
              pinned: true,
              delegate: _StickyHeaderDelegate(
                minExtent: 132,
                maxExtent: 132,
                builder: (shrink) => _buildToolbar(),
              ),
            ),
            // ── Liste détaillée ────────────────────────────────────
            if (_loading)
              SliverList.builder(
                itemCount: 6,
                itemBuilder: (_, __) => const _SkeletonRow(),
              )
            else if (_error != null)
              SliverFillRemaining(
                hasScrollBody: false,
                child: _errorState(),
              )
            else if (_filteredItems.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: _emptyState(),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
                sliver: SliverList.separated(
                  itemCount: _filteredItems.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (ctx, i) {
                    final delay = (i * 35).clamp(0, 600).toDouble();
                    return _AnimatedRow(
                      delayMs: delay,
                      child: widget.buildRow(ctx, _filteredItems[i]),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  // ── Header (titre + graphique premium) ──────────────────────────
  Widget _buildHeader(ColorScheme scheme) {
    final accent = widget.accent;
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            accent.withValues(alpha: 0.95),
            Color.lerp(accent, Colors.black, 0.18) ?? accent,
          ],
        ),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
        boxShadow: [
          BoxShadow(
            color: accent.withValues(alpha: 0.30),
            blurRadius: 24,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                onPressed: () => Navigator.of(context).maybePop(),
                icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
              ),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(widget.icon, color: Colors.white, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 20,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (widget.subtitle != null)
                      Text(
                        widget.subtitle!,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                      ),
                  ],
                ),
              ),
              IconButton(
                onPressed: _load,
                icon: const Icon(Icons.refresh_rounded, color: Colors.white),
                tooltip: 'Rafraîchir',
              ),
            ],
          ),
          const SizedBox(height: 8),
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(top: 4),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
              ),
              child: _loading
                  ? _ShimmerBox(height: double.infinity, accent: accent)
                  : AnimatedBuilder(
                      animation: _entryAnim,
                      builder: (_, __) {
                        return _buildChart(_data?.series ?? const [], accent);
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChart(List<KpiSeriesPoint> series, Color accent) {
    if (series.isEmpty) {
      return Center(
        child: Text(
          'Aucune donnée pour cette période.',
          style: TextStyle(color: Colors.white.withValues(alpha: 0.85)),
        ),
      );
    }

    switch (widget.chartType) {
      case KpiChartType.timeline:
      case KpiChartType.cumulative:
        return _LineChart(
          series: series,
          accent: Colors.white,
          fillStrong: widget.chartType == KpiChartType.cumulative,
          progress: _entryAnim.value,
        );
      case KpiChartType.comparison:
        return _HorizontalBarChart(
          series: series,
          accent: Colors.white,
          progress: _entryAnim.value,
        );
      case KpiChartType.distribution:
        return _DonutChart(
          series: series,
          progress: _entryAnim.value,
        );
    }
  }

  Widget _buildToolbar() {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      color: const Color(0xFFF6F7FB),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Filtres de période en chips.
          SizedBox(
            height: 36,
            child: Row(
              children: [
                for (final p in widget.periods)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(p.label),
                      selected: _period.key == p.key,
                      onSelected: (_) {
                        if (_period.key != p.key) {
                          setState(() => _period = p);
                          _load();
                        }
                      },
                      selectedColor: widget.accent.withValues(alpha: 0.18),
                      labelStyle: TextStyle(
                        color: _period.key == p.key
                            ? widget.accent
                            : scheme.onSurfaceVariant,
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                      ),
                      side: BorderSide(
                        color: _period.key == p.key
                            ? widget.accent
                            : Colors.transparent,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          if (widget.searchFilter != null)
            TextField(
              onChanged: (v) => setState(() => _query = v.trim().toLowerCase()),
              style: const TextStyle(fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Rechercher dans la liste…',
                prefixIcon: const Icon(Icons.search_rounded, size: 20),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(vertical: 4),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                      color: Colors.black.withValues(alpha: 0.06)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                      color: Colors.black.withValues(alpha: 0.06)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: widget.accent),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _errorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline_rounded,
                size: 64, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 12),
            Text(
              _error ?? '',
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _load,
              child: const Text('Réessayer'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _emptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: widget.accent.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.inbox_outlined,
                color: widget.accent,
                size: 56,
              ),
            ),
            const SizedBox(height: 18),
            Text(
              'Aucune donnée',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              _query.isEmpty
                  ? 'Rien à afficher pour cette période.'
                  : 'Aucun résultat pour « $_query ».',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════════
// Sticky header delegate (titre + chart en haut)
// ════════════════════════════════════════════════════════════════════
class _StickyHeaderDelegate extends SliverPersistentHeaderDelegate {
  final double minExtent;
  final double maxExtent;
  final Widget Function(double shrinkOffset) builder;

  _StickyHeaderDelegate({
    required this.minExtent,
    required this.maxExtent,
    required this.builder,
  });

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return builder(shrinkOffset);
  }

  @override
  bool shouldRebuild(covariant _StickyHeaderDelegate old) =>
      old.minExtent != minExtent || old.maxExtent != maxExtent;
}

// ════════════════════════════════════════════════════════════════════
// CHARTS
// ════════════════════════════════════════════════════════════════════

class _LineChart extends StatelessWidget {
  final List<KpiSeriesPoint> series;
  final Color accent;
  final bool fillStrong;
  final double progress;

  const _LineChart({
    required this.series,
    required this.accent,
    required this.progress,
    this.fillStrong = false,
  });

  @override
  Widget build(BuildContext context) {
    final maxV = series.map((p) => p.value).fold<double>(
        0, (acc, v) => math.max(acc, v));

    final spots = <FlSpot>[];
    for (var i = 0; i < series.length; i++) {
      spots.add(FlSpot(i.toDouble(), series[i].value * progress));
    }

    return LineChart(
      LineChartData(
        minY: 0,
        maxY: (maxV == 0 ? 1 : maxV) * 1.15,
        gridData: const FlGridData(show: false),
        titlesData: FlTitlesData(
          show: true,
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 22,
              interval: math.max(1, (series.length / 5).floorToDouble()),
              getTitlesWidget: (v, _) {
                final i = v.toInt();
                if (i < 0 || i >= series.length) return const SizedBox();
                return Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    series[i].label,
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                );
              },
            ),
          ),
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        borderData: FlBorderData(show: false),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            curveSmoothness: 0.32,
            color: accent,
            barWidth: 3.2,
            isStrokeCapRound: true,
            dotData: FlDotData(
              show: true,
              getDotPainter: (spot, _, __, ___) => FlDotCirclePainter(
                radius: 3.2,
                color: Colors.white,
                strokeColor: accent,
                strokeWidth: 2,
              ),
            ),
            belowBarData: BarAreaData(
              show: true,
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  accent.withValues(alpha: fillStrong ? 0.55 : 0.28),
                  accent.withValues(alpha: 0.02),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HorizontalBarChart extends StatelessWidget {
  final List<KpiSeriesPoint> series;
  final Color accent;
  final double progress;

  const _HorizontalBarChart({
    required this.series,
    required this.accent,
    required this.progress,
  });

  @override
  Widget build(BuildContext context) {
    final maxV = series.map((p) => p.value).fold<double>(
        0, (acc, v) => math.max(acc, v));
    final safe = maxV == 0 ? 1 : maxV;

    return Column(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        for (final p in series.take(5))
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                SizedBox(
                  width: 70,
                  child: Text(
                    p.label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Expanded(
                  child: TweenAnimationBuilder<double>(
                    duration: const Duration(milliseconds: 700),
                    curve: Curves.easeOutCubic,
                    tween: Tween(
                        begin: 0,
                        end: (p.value / safe) * progress),
                    builder: (_, v, __) {
                      return ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          height: 14,
                          color: Colors.white.withValues(alpha: 0.15),
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: FractionallySizedBox(
                              widthFactor: v.clamp(0.0, 1.0),
                              child: Container(color: accent),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  width: 50,
                  child: Text(
                    p.value.toStringAsFixed(
                        p.value.truncateToDouble() == p.value ? 0 : 1),
                    textAlign: TextAlign.right,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _DonutChart extends StatelessWidget {
  final List<KpiSeriesPoint> series;
  final double progress;

  const _DonutChart({required this.series, required this.progress});

  @override
  Widget build(BuildContext context) {
    final total = series.fold<double>(0, (acc, p) => acc + p.value);
    final palette = [
      Colors.white,
      Colors.white.withValues(alpha: 0.85),
      Colors.white.withValues(alpha: 0.7),
      Colors.white.withValues(alpha: 0.55),
      Colors.white.withValues(alpha: 0.4),
    ];

    return Row(
      children: [
        Expanded(
          flex: 5,
          child: PieChart(
            PieChartData(
              centerSpaceRadius: 36,
              sectionsSpace: 2,
              startDegreeOffset: -90 + (1 - progress) * 360,
              sections: [
                for (var i = 0; i < series.length; i++)
                  PieChartSectionData(
                    value: series[i].value * progress,
                    color: series[i].color ?? palette[i % palette.length],
                    radius: 28,
                    title: '',
                  ),
              ],
            ),
          ),
        ),
        Expanded(
          flex: 5,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (var i = 0; i < series.length; i++)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color:
                              series[i].color ?? palette[i % palette.length],
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          series[i].label,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        total == 0
                            ? '0%'
                            : '${(series[i].value / total * 100).toStringAsFixed(0)}%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

// ════════════════════════════════════════════════════════════════════
// SUPPORT WIDGETS (animations, skeleton, row)
// ════════════════════════════════════════════════════════════════════

class _AnimatedRow extends StatefulWidget {
  final Widget child;
  final double delayMs;

  const _AnimatedRow({required this.child, required this.delayMs});

  @override
  State<_AnimatedRow> createState() => _AnimatedRowState();
}

class _AnimatedRowState extends State<_AnimatedRow>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;
  late final Animation<double> _slide;
  late final Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 420),
    );
    _slide = Tween<double>(begin: 16, end: 0).animate(
      CurvedAnimation(parent: _c, curve: Curves.easeOutCubic),
    );
    _fade = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _c, curve: Curves.easeOut),
    );
    Future.delayed(Duration(milliseconds: widget.delayMs.toInt()), () {
      if (mounted) _c.forward();
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (_, child) => Transform.translate(
        offset: Offset(0, _slide.value),
        child: Opacity(opacity: _fade.value, child: child),
      ),
      child: widget.child,
    );
  }
}

class _SkeletonRow extends StatefulWidget {
  const _SkeletonRow();

  @override
  State<_SkeletonRow> createState() => _SkeletonRowState();
}

class _SkeletonRowState extends State<_SkeletonRow>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            _box(40, 40, 12),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _box(double.infinity, 12, 4),
                  const SizedBox(height: 8),
                  _box(120, 10, 4),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _box(double w, double h, double r) {
    return AnimatedBuilder(
      animation: _c,
      builder: (_, __) {
        final t = _c.value;
        return Container(
          width: w,
          height: h,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Colors.black.withValues(alpha: 0.06),
                Colors.black.withValues(alpha: 0.12),
                Colors.black.withValues(alpha: 0.06),
              ],
              stops: [
                math.max(0, t - 0.3),
                t,
                math.min(1, t + 0.3),
              ],
            ),
            borderRadius: BorderRadius.circular(r),
          ),
        );
      },
    );
  }
}

class _ShimmerBox extends StatefulWidget {
  final double height;
  final Color accent;
  const _ShimmerBox({required this.height, required this.accent});

  @override
  State<_ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<_ShimmerBox>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (_, __) {
        return Container(
          height: widget.height,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment(-1 + 2 * _c.value, 0),
              end: Alignment(1 + 2 * _c.value, 0),
              colors: [
                Colors.white.withValues(alpha: 0.08),
                Colors.white.withValues(alpha: 0.20),
                Colors.white.withValues(alpha: 0.08),
              ],
            ),
            borderRadius: BorderRadius.circular(12),
          ),
        );
      },
    );
  }
}

// ════════════════════════════════════════════════════════════════════
// KpiPremiumRow : helper pour construire des lignes cohérentes
// ════════════════════════════════════════════════════════════════════

class KpiPremiumRow extends StatelessWidget {
  final Widget? leading;
  final String title;
  final String? subtitle;
  final String value;
  final Color? valueColor;
  final VoidCallback? onTap;

  /// Couleur d'accent dérivée du statut métier de l'item. Quand fournie :
  /// - bordure gauche 4px de la couleur,
  /// - fond très légèrement teinté de la couleur (alpha ~5%),
  /// - ombre douce de la couleur,
  /// → l'admin "voit" instantanément le statut sans relire le subtitle.
  final Color? accentColor;

  /// Label court affiché en pill colorée à droite (ex: "Livré", "En pause",
  /// "Clôturée"). Utilise [accentColor] si fourni.
  final String? statusLabel;

  const KpiPremiumRow({
    super.key,
    this.leading,
    required this.title,
    this.subtitle,
    required this.value,
    this.valueColor,
    this.onTap,
    this.accentColor,
    this.statusLabel,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final accent = accentColor;

    return Container(
      decoration: BoxDecoration(
        color: accent == null
            ? Colors.white
            : Color.lerp(Colors.white, accent, 0.045) ?? Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: accent == null
            ? null
            : Border(
                left: BorderSide(color: accent, width: 4),
              ),
        boxShadow: accent == null
            ? null
            : [
                BoxShadow(
                  color: accent.withValues(alpha: 0.10),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                if (leading != null) ...[
                  leading!,
                  const SizedBox(width: 12),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 14,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          subtitle!,
                          style: TextStyle(
                            color: scheme.onSurfaceVariant,
                            fontSize: 12,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                      if (statusLabel != null && accent != null) ...[
                        const SizedBox(height: 6),
                        _StatusPill(label: statusLabel!, color: accent),
                      ],
                    ],
                  ),
                ),
                Text(
                  value,
                  style: TextStyle(
                    color: valueColor ?? accent ?? scheme.primary,
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(width: 4),
                if (onTap != null)
                  Icon(Icons.chevron_right_rounded,
                      color: scheme.onSurfaceVariant),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  final String label;
  final Color color;

  const _StatusPill({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.13),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.30), width: 1),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 10.5,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.2,
        ),
      ),
    );
  }
}
