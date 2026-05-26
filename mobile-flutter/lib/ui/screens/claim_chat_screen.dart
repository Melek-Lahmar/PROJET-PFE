import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../data/services/claim_chat_service.dart';
import '../../models/claim_message.dart';
import '../../state/auth_provider.dart';
import '../../state/claim_chat_provider.dart';

/// Écran de chat pour un cas (réclamation ou demande).
/// Utilisé côté client ET côté confirmatrice — [isStaff] détermine l'endpoint.
class ClaimChatScreen extends StatefulWidget {
  final int reclamationId;
  final String codeReclamation;
  final bool isStaff;
  final bool isClosed;

  const ClaimChatScreen({
    super.key,
    required this.reclamationId,
    required this.codeReclamation,
    this.isStaff = false,
    this.isClosed = false,
  });

  @override
  State<ClaimChatScreen> createState() => _ClaimChatScreenState();
}

class _ClaimChatScreenState extends State<ClaimChatScreen> {
  final _ctrl = TextEditingController();
  final _scroll = ScrollController();
  bool _isInternal = false;
  late final ClaimChatProvider _provider;

  @override
  void initState() {
    super.initState();
    final api = context.read<ApiClient>();
    _provider = ClaimChatProvider(
      ClaimChatService(api, isStaff: widget.isStaff),
    );
    _provider.loadMessages(widget.reclamationId).then((_) => _scrollToBottom());
  }

  @override
  void dispose() {
    _ctrl.dispose();
    _scroll.dispose();
    _provider.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty) return;
    _ctrl.clear();
    final ok = await _provider.sendMessage(text, isInternal: _isInternal);
    if (ok) _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: _provider,
      child: Scaffold(
        appBar: AppBar(
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Messagerie', style: TextStyle(fontSize: 16)),
              Text(widget.codeReclamation,
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: Colors.white70)),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh_rounded),
              onPressed: () => _provider
                  .loadMessages(widget.reclamationId)
                  .then((_) => _scrollToBottom()),
            ),
          ],
        ),
        body: Column(
          children: [
            Expanded(child: _MessageList(scroll: _scroll)),
            if (!widget.isClosed) _InputBar(
              ctrl: _ctrl,
              isStaff: widget.isStaff,
              isInternal: _isInternal,
              onInternalChanged: (v) => setState(() => _isInternal = v),
              onSend: _send,
            ),
          ],
        ),
      ),
    );
  }
}

// ── Liste des messages ────────────────────────────────────────────────────────

class _MessageList extends StatelessWidget {
  final ScrollController scroll;
  const _MessageList({required this.scroll});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ClaimChatProvider>();
    if (provider.loading) return const Center(child: CircularProgressIndicator());
    if (provider.error != null && provider.messages.isEmpty)
      return Center(child: Text(provider.error!));
    if (provider.messages.isEmpty)
      return const Center(child: Text('Aucun message pour l\'instant.'));

    final myUserId = context.read<AuthProvider>().session?.userId ?? '';

    return ListView.builder(
      controller: scroll,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
      itemCount: provider.messages.length,
      itemBuilder: (ctx, i) {
        final msg = provider.messages[i];
        final isMe = msg.senderUserId == myUserId;
        return _Bubble(message: msg, isMe: isMe);
      },
    );
  }
}

class _Bubble extends StatelessWidget {
  final ClaimMessage message;
  final bool isMe;
  const _Bubble({required this.message, required this.isMe});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bg = message.isInternal
        ? Colors.amber.shade50
        : isMe
            ? scheme.primary
            : scheme.surfaceContainerHighest;
    final fg = isMe && !message.isInternal ? Colors.white : scheme.onSurface;

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(16).copyWith(
            bottomRight: isMe ? const Radius.circular(4) : null,
            bottomLeft: !isMe ? const Radius.circular(4) : null,
          ),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Column(
          crossAxisAlignment:
              isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (!isMe)
              Text(
                message.senderDisplay,
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: scheme.primary),
              ),
            if (message.isInternal)
              const Text('🔒 Note interne',
                  style: TextStyle(
                      fontSize: 10,
                      color: Colors.orange,
                      fontWeight: FontWeight.bold)),
            const SizedBox(height: 2),
            Text(message.messageText, style: TextStyle(color: fg)),
            const SizedBox(height: 4),
            Text(
              _fmt(message.createdAt),
              style: TextStyle(
                  fontSize: 10, color: fg.withOpacity(0.6)),
            ),
          ],
        ),
      ),
    );
  }

  String _fmt(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')} '
      '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
}

// ── Barre de saisie ───────────────────────────────────────────────────────────

class _InputBar extends StatelessWidget {
  final TextEditingController ctrl;
  final bool isStaff;
  final bool isInternal;
  final ValueChanged<bool> onInternalChanged;
  final VoidCallback onSend;

  const _InputBar({
    required this.ctrl,
    required this.isStaff,
    required this.isInternal,
    required this.onInternalChanged,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    final sending = context.watch<ClaimChatProvider>().sending;
    final scheme = Theme.of(context).colorScheme;
    return SafeArea(
      child: Container(
        decoration: BoxDecoration(
          color: scheme.surface,
          border: Border(top: BorderSide(color: scheme.outlineVariant)),
        ),
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isStaff)
              Row(
                children: [
                  Switch(value: isInternal, onChanged: onInternalChanged),
                  Text('Note interne',
                      style: TextStyle(
                          fontSize: 12,
                          color: isInternal
                              ? Colors.orange
                              : scheme.onSurfaceVariant)),
                ],
              ),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: ctrl,
                    maxLines: null,
                    textInputAction: TextInputAction.newline,
                    decoration: InputDecoration(
                      hintText: 'Votre message…',
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24)),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: sending ? null : onSend,
                  style: FilledButton.styleFrom(
                    shape: const CircleBorder(),
                    padding: const EdgeInsets.all(14),
                  ),
                  child: sending
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.send_rounded, size: 20),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
