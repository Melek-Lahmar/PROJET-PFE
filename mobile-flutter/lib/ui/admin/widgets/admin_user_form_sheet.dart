import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api_client.dart';
import '../../../data/services/admin_users_service.dart';

/// Liste minimale des 24 gouvernorats — alignée avec l'enum backend
/// `GouvernoratTunisie` (cf. Geo/TunisieDecoupage.cs). Le serveur valide
/// la cohérence Gouvernorat ↔ Délégation, on accepte ici une saisie libre.
const List<String> kGouvernorats = [
  'Ariana', 'Beja', 'BenArous', 'Bizerte', 'Gabes', 'Gafsa', 'Jendouba',
  'Kairouan', 'Kasserine', 'Kebili', 'Kef', 'Mahdia', 'Manouba', 'Medenine',
  'Monastir', 'Nabeul', 'Sfax', 'SidiBouzid', 'Siliana', 'Sousse',
  'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
];

/// Bottom-sheet d'édition d'un compte (LIVREUR ou CONFIRMATEUR).
/// `userId == null` ⇒ création (mot de passe requis).
/// `userId != null` ⇒ édition profile (mot de passe désactivé).
class AdminUserFormSheet extends StatefulWidget {
  final String role; // LIVREUR | CONFIRMATEUR
  final String? userId;
  final String? initialEmail;
  final String? initialNomComplet;
  final String? initialTelephone;
  final String? initialCin;
  final String? initialGouvernorat;
  final String? initialDelegation;
  final Color accent;

  const AdminUserFormSheet({
    super.key,
    required this.role,
    required this.accent,
    this.userId,
    this.initialEmail,
    this.initialNomComplet,
    this.initialTelephone,
    this.initialCin,
    this.initialGouvernorat,
    this.initialDelegation,
  });

  static Future<bool?> show(
    BuildContext context, {
    required String role,
    required Color accent,
    String? userId,
    String? initialEmail,
    String? initialNomComplet,
    String? initialTelephone,
    String? initialCin,
    String? initialGouvernorat,
    String? initialDelegation,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AdminUserFormSheet(
        role: role,
        accent: accent,
        userId: userId,
        initialEmail: initialEmail,
        initialNomComplet: initialNomComplet,
        initialTelephone: initialTelephone,
        initialCin: initialCin,
        initialGouvernorat: initialGouvernorat,
        initialDelegation: initialDelegation,
      ),
    );
  }

  @override
  State<AdminUserFormSheet> createState() => _AdminUserFormSheetState();
}

class _AdminUserFormSheetState extends State<AdminUserFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _email;
  late final TextEditingController _password;
  late final TextEditingController _nom;
  late final TextEditingController _phone;
  late final TextEditingController _cin;
  late final TextEditingController _delegation;
  String? _gouvernorat;

  bool _saving = false;
  String? _error;

  bool get _isEdit => widget.userId != null;

  @override
  void initState() {
    super.initState();
    _email = TextEditingController(text: widget.initialEmail ?? '');
    _password = TextEditingController();
    _nom = TextEditingController(text: widget.initialNomComplet ?? '');
    _phone = TextEditingController(text: widget.initialTelephone ?? '');
    _cin = TextEditingController(text: widget.initialCin ?? '');
    _delegation = TextEditingController(text: widget.initialDelegation ?? '');
    _gouvernorat = (widget.initialGouvernorat != null &&
            kGouvernorats.contains(widget.initialGouvernorat))
        ? widget.initialGouvernorat
        : null;
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _nom.dispose();
    _phone.dispose();
    _cin.dispose();
    _delegation.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final api = context.read<ApiClient>();
      final svc = AdminUsersService(api);
      if (_isEdit) {
        await svc.updateProfile(
          userId: widget.userId!,
          email: _email.text,
          gouvernorat: _gouvernorat!,
          nomComplet: _nom.text,
          telephone: _phone.text,
          cin: _cin.text,
          delegation: _delegation.text,
        );
      } else {
        await svc.createUser(
          email: _email.text,
          password: _password.text,
          role: widget.role,
          gouvernorat: _gouvernorat!,
          delegation: _delegation.text,
          nomComplet: _nom.text,
          telephone: _phone.text,
          cin: _cin.text,
        );
      }
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final media = MediaQuery.of(context);
    final maxH = media.size.height * 0.92;

    return AnimatedPadding(
      duration: const Duration(milliseconds: 180),
      padding: EdgeInsets.only(bottom: media.viewInsets.bottom),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: maxH),
        child: Container(
          decoration: BoxDecoration(
            color: scheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SafeArea(
            top: false,
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _Handle(),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            widget.accent,
                            Color.lerp(widget.accent, Colors.black, 0.30) ??
                                widget.accent,
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(
                            color: widget.accent.withOpacity(0.35),
                            blurRadius: 18,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.18),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              widget.role == 'LIVREUR'
                                  ? Icons.delivery_dining_rounded
                                  : Icons.support_agent_rounded,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _isEdit
                                      ? 'Modifier le compte'
                                      : (widget.role == 'LIVREUR'
                                          ? 'Nouveau livreur'
                                          : 'Nouvelle confirmatrice'),
                                  style: theme.textTheme.titleMedium?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                                Text(
                                  _isEdit
                                      ? 'Mise à jour des informations'
                                      : 'Création d\'un compte ${widget.role}',
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: Colors.white.withOpacity(0.85),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: () => Navigator.of(context).pop(false),
                            icon: const Icon(Icons.close_rounded,
                                color: Colors.white),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (_error != null)
                      Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444).withOpacity(0.10),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: const Color(0xFFEF4444).withOpacity(0.40),
                          ),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline_rounded,
                                color: Color(0xFFB91C1C)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(_error!,
                                  style: const TextStyle(
                                    color: Color(0xFFB91C1C),
                                    fontWeight: FontWeight.w700,
                                  )),
                            ),
                          ],
                        ),
                      ),
                    _Field(
                      controller: _nom,
                      label: 'Nom complet',
                      icon: Icons.badge_outlined,
                    ),
                    const SizedBox(height: 12),
                    _Field(
                      controller: _email,
                      label: 'Email',
                      icon: Icons.email_outlined,
                      keyboardType: TextInputType.emailAddress,
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) return 'Requis';
                        if (!v.contains('@')) return 'Email invalide';
                        return null;
                      },
                    ),
                    if (!_isEdit) ...[
                      const SizedBox(height: 12),
                      _Field(
                        controller: _password,
                        label: 'Mot de passe',
                        icon: Icons.lock_outline_rounded,
                        obscure: true,
                        validator: (v) {
                          if (v == null || v.length < 6) return 'Min. 6 caractères';
                          return null;
                        },
                      ),
                    ],
                    const SizedBox(height: 12),
                    _Field(
                      controller: _phone,
                      label: 'Téléphone',
                      icon: Icons.phone_rounded,
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 12),
                    _Field(
                      controller: _cin,
                      label: 'CIN',
                      icon: Icons.credit_card_rounded,
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: _gouvernorat,
                      decoration: InputDecoration(
                        labelText: 'Gouvernorat',
                        prefixIcon: const Icon(Icons.location_city_rounded),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      items: [
                        for (final g in kGouvernorats)
                          DropdownMenuItem(value: g, child: Text(g)),
                      ],
                      validator: (v) =>
                          v == null ? 'Sélectionnez un gouvernorat' : null,
                      onChanged: (v) => setState(() => _gouvernorat = v),
                    ),
                    const SizedBox(height: 12),
                    _Field(
                      controller: _delegation,
                      label: 'Délégation',
                      icon: Icons.map_rounded,
                      validator: (v) {
                        if (!_isEdit && (v == null || v.trim().isEmpty)) {
                          return 'Requis';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _saving
                                ? null
                                : () => Navigator.of(context).pop(false),
                            icon: const Icon(Icons.close_rounded),
                            label: const Text('Annuler'),
                            style: OutlinedButton.styleFrom(
                              padding:
                                  const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          flex: 2,
                          child: ElevatedButton.icon(
                            onPressed: _saving ? null : _submit,
                            icon: _saving
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white),
                                  )
                                : Icon(_isEdit
                                    ? Icons.save_rounded
                                    : Icons.add_rounded),
                            label: Text(_isEdit ? 'Enregistrer' : 'Créer'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: widget.accent,
                              foregroundColor: Colors.white,
                              padding:
                                  const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Handle extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 44,
        height: 5,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.outlineVariant,
          borderRadius: BorderRadius.circular(3),
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final bool obscure;
  final TextInputType? keyboardType;
  final String? Function(String?)? validator;
  const _Field({
    required this.controller,
    required this.label,
    required this.icon,
    this.obscure = false,
    this.keyboardType,
    this.validator,
  });
  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      obscureText: obscure,
      keyboardType: keyboardType,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}

/// Boîte de dialogue de confirmation de suppression.
Future<bool> showDeleteUserDialog(
  BuildContext context, {
  required String name,
  required String role,
}) async {
  return await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
          icon: const Icon(Icons.warning_rounded,
              color: Color(0xFFEF4444), size: 36),
          title: const Text('Supprimer ce compte ?'),
          content: Text(
              'Cette action supprimera définitivement le compte ${role.toLowerCase()} :\n\n$name'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Annuler'),
            ),
            ElevatedButton.icon(
              onPressed: () => Navigator.of(ctx).pop(true),
              icon: const Icon(Icons.delete_outline_rounded),
              label: const Text('Supprimer'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF4444),
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ) ??
      false;
}
