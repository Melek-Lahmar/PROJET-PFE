import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:flutter_tts/flutter_tts.dart';

/// Section 3.5 — Voice input (micro) + voice output (haut-parleur).
/// Multilingue : fr-FR par défaut, ar-TN si langue détectée.
class VoiceInputButton extends StatefulWidget {
  final void Function(String transcribed) onResult;
  final String localeId;

  const VoiceInputButton({
    super.key,
    required this.onResult,
    this.localeId = 'fr_FR',
  });

  @override
  State<VoiceInputButton> createState() => _VoiceInputButtonState();
}

class _VoiceInputButtonState extends State<VoiceInputButton> {
  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _listening = false;
  bool _initOk = false;

  Future<void> _toggle() async {
    if (!_initOk) {
      _initOk = await _speech.initialize();
    }
    if (!_initOk) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Micro indisponible.')));
      }
      return;
    }
    if (_listening) {
      await _speech.stop();
      setState(() => _listening = false);
      return;
    }
    setState(() => _listening = true);
    await _speech.listen(
      onResult: (r) {
        widget.onResult(r.recognizedWords);
      },
      localeId: widget.localeId,
      listenFor: const Duration(seconds: 30),
    );
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: _listening ? 'Stop' : 'Parler',
      icon: Icon(_listening ? Icons.mic : Icons.mic_none),
      color: _listening ? Colors.red : null,
      onPressed: _toggle,
    );
  }
}

class VoiceOutputButton extends StatefulWidget {
  final String text;
  final String? language; // fr | ar | tounsi

  const VoiceOutputButton({super.key, required this.text, this.language});

  @override
  State<VoiceOutputButton> createState() => _VoiceOutputButtonState();
}

class _VoiceOutputButtonState extends State<VoiceOutputButton> {
  final FlutterTts _tts = FlutterTts();

  Future<void> _speak() async {
    final lang = switch (widget.language) {
      'ar' => 'ar',
      'tounsi' => 'ar-TN',
      _ => 'fr-FR',
    };
    try {
      await _tts.setLanguage(lang);
      await _tts.setSpeechRate(0.5);
      await _tts.speak(widget.text);
    } catch (_) {/* mute */}
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: 'Lire à voix haute',
      icon: const Icon(Icons.volume_up),
      onPressed: _speak,
    );
  }
}
