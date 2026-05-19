import 'package:flutter/material.dart';

import 'admin_chat_screen.dart';

/// Onglet Chat Bot — affiche directement le chat plein-écran.
/// Le nom de la classe est conservé pour ne pas casser l'import dans
/// `admin_home.dart`. L'onglet est rebrandé "Chat Bot" côté tabs.
class AdminWorkflowScreen extends StatelessWidget {
  const AdminWorkflowScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AdminChatScreen(embedded: true);
  }
}
