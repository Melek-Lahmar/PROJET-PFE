import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../models/chat_message.dart';
import '../../../state/chat/admin_chat_provider.dart';
import '../../widgets/premium/animated_entry.dart';
import '../widgets/proactive_insights_banner.dart';
import '../widgets/quick_replies_row.dart';
import '../widgets/voice_buttons.dart';

/// Module chat admin — interface premium full-screen.
/// Backend inchangé : POST /api/admin/chat/ask (router → executor → formatter).
class AdminChatScreen extends StatefulWidget {
  /// `embedded` = mode plein-écran intégré dans l'onglet (pas d'AppBar locale).
  final bool embedded;

  const AdminChatScreen({super.key, this.embedded = false});

  static Future<void> showAsDialog(BuildContext context) async {
    await showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (_) => Dialog(
        insetPadding: const EdgeInsets.all(24),
        clipBehavior: Clip.antiAlias,
        child: SizedBox(
          width: 760, height: 660,
          child: ChangeNotifierProvider.value(
            value: context.read<AdminChatProvider>(),
            child: const AdminChatScreen(),
          ),
        ),
      ),
    );
  }

  @override
  State<AdminChatScreen> createState() => _AdminChatScreenState();
}

class _AdminChatScreenState extends State<AdminChatScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final _focus = FocusNode();

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _send([String? override]) {
    final text = override ?? _input.text;
    if (text.trim().isEmpty) return;
    _input.clear();
    context.read<AdminChatProvider>().send(text).then((_) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scroll.hasClients) {
          _scroll.animateTo(_scroll.position.maxScrollExtent,
              duration: const Duration(milliseconds: 280),
              curve: Curves.easeOutCubic);
        }
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final prov = context.watch<AdminChatProvider>();
    final messages = prov.messages;

    final lastSuggestions = messages.isNotEmpty &&
            messages.last.role == ChatMessageRole.assistant &&
            (messages.last.suggestions?.isNotEmpty ?? false)
        ? messages.last.suggestions ?? const <String>[]
        : const <String>[];

    final body = Column(
      children: [
        if (!widget.embedded) _buildHeader(theme, prov),
        // Section 3.6 — bandeau alertes proactives au-dessus du chat
        ProactiveInsightsBanner(onAnalyze: (q) => _send(q)),
        Expanded(
          child: Stack(
            children: [
              messages.isEmpty
                  ? _Welcome(onSuggestion: (s) => _send(s))
                  : ListView.builder(
                      controller: _scroll,
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                      itemCount: messages.length,
                      itemBuilder: (_, i) {
                        final msg = messages[i];
                        return EntryAnimation(
                          duration: const Duration(milliseconds: 260),
                          slide: 12,
                          child: _Bubble(message: msg),
                        );
                      },
                    ),
              if (prov.sending)
                Positioned(
                  left: 16, right: 16, bottom: 6,
                  child: _TypingIndicator(color: scheme.primary),
                ),
            ],
          ),
        ),
        // Section 3.4 — quick-replies (si présentes dans le dernier message)
        if (lastSuggestions.isNotEmpty)
          QuickRepliesRow(suggestions: lastSuggestions, onTap: _send),
        _Composer(
          controller: _input,
          focusNode: _focus,
          enabled: !prov.sending,
          onSend: _send,
          hasMessages: messages.isNotEmpty,
          onClear: messages.isEmpty ? null : prov.clear,
        ),
      ],
    );

    if (widget.embedded) {
      return Container(
        color: scheme.surface,
        child: body,
      );
    }
    return Scaffold(body: body);
  }

  Widget _buildHeader(ThemeData theme, AdminChatProvider prov) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 12, 16),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 42, height: 42,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.20),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withOpacity(0.30)),
            ),
            child: const Icon(Icons.smart_toy_rounded, color: Colors.white),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Assistant IA',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                    )),
                Text('Posez une question — chiffres, tendances, prédictions',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 11,
                    )),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Effacer',
            color: Colors.white,
            onPressed: prov.messages.isEmpty ? null : prov.clear,
            icon: const Icon(Icons.delete_sweep_outlined),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// Welcome screen — catégories de questions premium
// ============================================================================

class _SuggestionCategory {
  final String title;
  final IconData icon;
  final Color color;
  final List<String> questions;
  const _SuggestionCategory({
    required this.title,
    required this.icon,
    required this.color,
    required this.questions,
  });
}

class _Welcome extends StatelessWidget {
  final ValueChanged<String> onSuggestion;
  const _Welcome({required this.onSuggestion});

  static const _categories = [
    _SuggestionCategory(
      title: 'Chiffres',
      icon: Icons.bar_chart_rounded,
      color: Color(0xFF3B82F6),
      questions: [
        "Combien de commandes livrées aujourd'hui ?",
        "Total des réclamations ce mois",
        "Top 5 produits par revenue",
      ],
    ),
    _SuggestionCategory(
      title: 'Tendances',
      icon: Icons.show_chart_rounded,
      color: Color(0xFFA855F7),
      questions: [
        "Tendance des commandes sur 30 jours",
        "Compare Sfax vs Tunis (taux de retour)",
        "Anomalies dans les livraisons cette semaine",
      ],
    ),
    _SuggestionCategory(
      title: 'Prédictions',
      icon: Icons.psychology_rounded,
      color: Color(0xFF22C55E),
      questions: [
        "Risque de retour : 350 TND à Sfax",
        "Volume prévu sur 7 jours",
        "Taux de livraison 1ère tentative",
      ],
    ),
    _SuggestionCategory(
      title: 'Concepts',
      icon: Icons.menu_book_rounded,
      color: Color(0xFFF59E0B),
      questions: [
        "C'est quoi une réclamation ?",
        "Différence BC et BL ?",
        "Comment fonctionne l'attribution livreur ?",
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
      children: [
        EntryScale(
          child: Center(
            child: Stack(
              alignment: Alignment.center,
              children: [
                Container(
                  width: 96, height: 96,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                    ),
                    borderRadius: BorderRadius.circular(28),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF6366F1).withOpacity(0.40),
                        blurRadius: 28,
                        offset: const Offset(0, 14),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.auto_awesome_rounded,
                      color: Colors.white, size: 48),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 18),
        EntryAnimation(
          delay: const Duration(milliseconds: 160),
          child: Text('Bonjour, comment puis-je aider ?',
              textAlign: TextAlign.center,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w900,
              )),
        ),
        const SizedBox(height: 6),
        EntryAnimation(
          delay: const Duration(milliseconds: 240),
          child: Text(
            'Posez une question en langage naturel — l\'IA route vers la bonne couche métier.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
        ),
        const SizedBox(height: 28),
        StaggeredColumn(
          initialDelay: const Duration(milliseconds: 320),
          step: const Duration(milliseconds: 90),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final c in _categories)
              Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: _CategoryCard(
                    category: c, onSuggestion: onSuggestion),
              ),
          ],
        ),
      ],
    );
  }
}

class _CategoryCard extends StatelessWidget {
  final _SuggestionCategory category;
  final ValueChanged<String> onSuggestion;

  const _CategoryCard({
    required this.category,
    required this.onSuggestion,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: category.color.withOpacity(0.06),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: category.color.withOpacity(0.22)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32, height: 32,
                decoration: BoxDecoration(
                  color: category.color,
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Icon(category.icon, color: Colors.white, size: 18),
              ),
              const SizedBox(width: 10),
              Text(category.title,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w900,
                    color: category.color,
                  )),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6, runSpacing: 6,
            children: [
              for (final q in category.questions)
                _QuestionChip(
                    label: q,
                    color: category.color,
                    surface: scheme.surface,
                    onTap: () => onSuggestion(q)),
            ],
          ),
        ],
      ),
    );
  }
}

class _QuestionChip extends StatefulWidget {
  final String label;
  final Color color;
  final Color surface;
  final VoidCallback onTap;
  const _QuestionChip({
    required this.label,
    required this.color,
    required this.surface,
    required this.onTap,
  });

  @override
  State<_QuestionChip> createState() => _QuestionChipState();
}

class _QuestionChipState extends State<_QuestionChip> {
  bool _hover = false;
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return MouseRegion(
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTapDown: (_) => setState(() => _down = true),
        onTapCancel: () => setState(() => _down = false),
        onTapUp: (_) => setState(() => _down = false),
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 130),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
          decoration: BoxDecoration(
            color: _down
                ? widget.color.withOpacity(0.18)
                : (_hover ? widget.color.withOpacity(0.10) : widget.surface),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: widget.color.withOpacity(_hover ? 0.50 : 0.28),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.bolt_rounded, size: 12, color: widget.color),
              const SizedBox(width: 4),
              Text(widget.label,
                  style: theme.textTheme.labelSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  )),
            ],
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// Bubble + Chart + Row list
// ============================================================================

class _Bubble extends StatelessWidget {
  final ChatMessage message;
  const _Bubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isUser = message.role == ChatMessageRole.user;

    final hasChart = message.chartType != ChatChartType.none
        && message.chartPoints.isNotEmpty;
    final hasRows = message.rows.isNotEmpty;
    final maxWidth = (hasChart || hasRows) ? 600.0 : 480.0;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              width: 32, height: 32,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                ),
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF6366F1).withOpacity(0.30),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: const Icon(Icons.auto_awesome_rounded,
                  color: Colors.white, size: 16),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: maxWidth),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                decoration: BoxDecoration(
                  gradient: isUser
                      ? const LinearGradient(
                          colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        )
                      : null,
                  color: isUser
                      ? null
                      : (message.isError
                          ? const Color(0xFFEF4444).withOpacity(0.10)
                          : scheme.surfaceContainerHighest),
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(16),
                    topRight: const Radius.circular(16),
                    bottomLeft: Radius.circular(isUser ? 16 : 4),
                    bottomRight: Radius.circular(isUser ? 4 : 16),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: (isUser
                              ? const Color(0xFF6366F1)
                              : Colors.black)
                          .withOpacity(isUser ? 0.20 : 0.04),
                      blurRadius: isUser ? 10 : 6,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(message.text,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: isUser
                              ? Colors.white
                              : (message.isError
                                  ? const Color(0xFFB91C1C)
                                  : scheme.onSurface),
                          height: 1.4,
                        )),
                    if (hasChart) ...[
                      const SizedBox(height: 12),
                      _ChartView(
                          type: message.chartType,
                          points: message.chartPoints,
                          color: isUser
                              ? Colors.white
                              : scheme.primary),
                    ],
                    if (hasRows) ...[
                      const SizedBox(height: 8),
                      _RowList(
                          rows: message.rows,
                          fg: isUser ? Colors.white : scheme.onSurface),
                    ],
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

class _ChartView extends StatelessWidget {
  final ChatChartType type;
  final List<ChatChartPoint> points;
  final Color color;
  const _ChartView({
    required this.type,
    required this.points,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    if (points.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      width: double.infinity,
      height: 180,
      child: type == ChatChartType.bar
          ? _buildBarChart(context)
          : _buildLineChart(context),
    );
  }

  Widget _buildBarChart(BuildContext context) {
    final maxVal = points.map((p) => p.value).fold<double>(
        0, (acc, v) => v > acc ? v : acc);

    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: maxVal == 0 ? 1 : maxVal * 1.15,
        barGroups: [
          for (var i = 0; i < points.length; i++)
            BarChartGroupData(
              x: i,
              barRods: [
                BarChartRodData(
                  toY: points[i].value,
                  color: color,
                  width: 14,
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(6)),
                ),
              ],
            ),
        ],
        gridData: const FlGridData(show: false),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          show: true,
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 32,
              interval: 1,
              getTitlesWidget: (v, _) {
                final i = v.toInt();
                if (i < 0 || i >= points.length) return const SizedBox.shrink();
                final label = points[i].bucket;
                final short = label.length > 8 ? '${label.substring(0, 6)}…' : label;
                return Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(short,
                      style: TextStyle(fontSize: 9, color: color.withOpacity(0.85)),
                      overflow: TextOverflow.ellipsis),
                );
              },
            ),
          ),
        ),
        barTouchData: BarTouchData(
          enabled: true,
          touchTooltipData: BarTouchTooltipData(
            getTooltipItem: (group, _, rod, __) {
              final p = points[group.x];
              return BarTooltipItem(
                '${p.bucket}\n${rod.toY.toStringAsFixed(1)}',
                const TextStyle(color: Colors.white, fontSize: 11),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildLineChart(BuildContext context) {
    final spots = [
      for (var i = 0; i < points.length; i++)
        FlSpot(i.toDouble(), points[i].value),
    ];
    final hasBounds = points.any((p) => p.lower != null && p.upper != null);
    final lowerSpots = hasBounds
        ? [for (var i = 0; i < points.length; i++) FlSpot(i.toDouble(), points[i].lower ?? 0)]
        : null;
    final upperSpots = hasBounds
        ? [for (var i = 0; i < points.length; i++) FlSpot(i.toDouble(), points[i].upper ?? 0)]
        : null;

    final maxY = points.map((p) => p.upper ?? p.value).fold<double>(
        0, (acc, v) => v > acc ? v : acc);

    return LineChart(
      LineChartData(
        minY: 0,
        maxY: maxY == 0 ? 1 : maxY * 1.1,
        lineBarsData: [
          if (upperSpots != null)
            LineChartBarData(
              spots: upperSpots,
              isCurved: true,
              barWidth: 0,
              color: color.withOpacity(0.20),
              belowBarData: BarAreaData(show: false),
            ),
          LineChartBarData(
            spots: spots,
            isCurved: true,
            barWidth: 3,
            color: color,
            dotData: FlDotData(
              show: true,
              getDotPainter: (spot, _, __, ___) => FlDotCirclePainter(
                radius: 3,
                color: color,
                strokeWidth: 2,
                strokeColor: Colors.white,
              ),
            ),
            belowBarData: BarAreaData(
                show: true,
                gradient: LinearGradient(
                  colors: [
                    color.withOpacity(0.30),
                    color.withOpacity(0.02),
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                )),
          ),
          if (lowerSpots != null)
            LineChartBarData(
              spots: lowerSpots,
              isCurved: true,
              barWidth: 0,
              color: color.withOpacity(0.20),
              belowBarData: BarAreaData(show: false),
            ),
        ],
        gridData: const FlGridData(show: false),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          show: true,
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 28,
              interval: (points.length / 5).ceilToDouble().clamp(1, 999),
              getTitlesWidget: (v, _) {
                final i = v.toInt();
                if (i < 0 || i >= points.length) return const SizedBox.shrink();
                final label = points[i].bucket;
                final short = label.length > 8 ? '${label.substring(0, 6)}…' : label;
                return Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(short,
                      style: TextStyle(fontSize: 9, color: color.withOpacity(0.85))),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

class _RowList extends StatelessWidget {
  final List<ChatRowItem> rows;
  final Color fg;
  const _RowList({required this.rows, required this.fg});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final r in rows)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Row(
              children: [
                Container(
                  width: 4, height: 4,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(
                    color: fg.withOpacity(0.5),
                    shape: BoxShape.circle,
                  ),
                ),
                Expanded(
                  child: Text(
                    r.subtitle != null ? '${r.label} — ${r.subtitle}' : r.label,
                    style: TextStyle(
                      fontSize: 12,
                      color: fg.withOpacity(0.85),
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (r.value != null)
                  Text(
                    r.value!.toStringAsFixed(r.value! % 1 == 0 ? 0 : 1),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: fg,
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

// ============================================================================
// Composer + typing indicator
// ============================================================================

class _Composer extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final bool enabled;
  final ValueChanged<String?> onSend;
  final bool hasMessages;
  final VoidCallback? onClear;

  const _Composer({
    required this.controller,
    required this.focusNode,
    required this.enabled,
    required this.onSend,
    required this.hasMessages,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 14),
      decoration: BoxDecoration(
        color: scheme.surface,
        border: Border(
          top: BorderSide(color: scheme.outlineVariant.withOpacity(0.5)),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: scheme.surfaceContainerHighest.withOpacity(0.7),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: scheme.outlineVariant.withOpacity(0.4),
                  ),
                ),
                child: TextField(
                  controller: controller,
                  focusNode: focusNode,
                  minLines: 1,
                  maxLines: 4,
                  enabled: enabled,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => onSend(null),
                  decoration: const InputDecoration(
                    hintText: 'Posez votre question…',
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 18, vertical: 13,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 4),
            // Section 3.5 — bouton micro voice input
            VoiceInputButton(
              onResult: (text) {
                controller.text = text;
              },
            ),
            const SizedBox(width: 4),
            _GradientSendButton(
              enabled: enabled,
              onPressed: enabled ? () => onSend(null) : null,
            ),
          ],
        ),
      ),
    );
  }
}

class _GradientSendButton extends StatefulWidget {
  final bool enabled;
  final VoidCallback? onPressed;
  const _GradientSendButton({required this.enabled, required this.onPressed});

  @override
  State<_GradientSendButton> createState() => _GradientSendButtonState();
}

class _GradientSendButtonState extends State<_GradientSendButton> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: widget.enabled ? (_) => setState(() => _down = true) : null,
      onTapCancel: () => setState(() => _down = false),
      onTapUp: (_) => setState(() => _down = false),
      onTap: widget.onPressed,
      child: AnimatedScale(
        scale: _down ? 0.92 : 1.0,
        duration: const Duration(milliseconds: 110),
        child: Container(
          width: 46, height: 46,
          decoration: BoxDecoration(
            gradient: widget.enabled
                ? const LinearGradient(
                    colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  )
                : null,
            color: widget.enabled ? null : Colors.grey.shade300,
            borderRadius: BorderRadius.circular(14),
            boxShadow: widget.enabled
                ? [
                    BoxShadow(
                      color: const Color(0xFF6366F1).withOpacity(0.35),
                      blurRadius: 12,
                      offset: const Offset(0, 5),
                    ),
                  ]
                : null,
          ),
          child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
        ),
      ),
    );
  }
}

class _TypingIndicator extends StatefulWidget {
  final Color color;
  const _TypingIndicator({required this.color});

  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    duration: const Duration(milliseconds: 1100),
    vsync: this,
  )..repeat();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            color: widget.color.withOpacity(0.10),
            borderRadius: BorderRadius.circular(20),
          ),
          child: AnimatedBuilder(
            animation: _ctrl,
            builder: (_, __) {
              final t = _ctrl.value;
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: List.generate(3, (i) {
                  final phase = (t + i * 0.25) % 1.0;
                  final scale = 0.6 + 0.5 * (1 - (phase - 0.5).abs() * 2).clamp(0, 1);
                  return Padding(
                    padding: EdgeInsets.symmetric(horizontal: i == 1 ? 4 : 2),
                    child: Transform.scale(
                      scale: scale,
                      child: Container(
                        width: 7, height: 7,
                        decoration: BoxDecoration(
                          color: widget.color,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  );
                }),
              );
            },
          ),
        ),
      ],
    );
  }
}
