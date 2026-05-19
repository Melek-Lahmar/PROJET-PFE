import 'package:flutter/material.dart';

class AppSearchField extends StatelessWidget {
  final TextEditingController? controller;
  final String hintText;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onClear;
  final bool autofocus;

  const AppSearchField({
    super.key,
    this.controller,
    this.hintText = 'Rechercher...',
    this.onChanged,
    this.onClear,
    this.autofocus = false,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      autofocus: autofocus,
      onChanged: onChanged,
      decoration: InputDecoration(
        hintText: hintText,
        prefixIcon: const Icon(Icons.search_rounded),
        suffixIcon: (controller != null && controller!.text.isNotEmpty)
            ? IconButton(
          onPressed: () {
            controller!.clear();
            if (onChanged != null) onChanged!('');
            if (onClear != null) onClear!();
          },
          icon: const Icon(Icons.close_rounded),
        )
            : null,
      ),
    );
  }
}