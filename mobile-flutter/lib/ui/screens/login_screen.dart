import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_spacing.dart';
import '../../core/utils/snackbars.dart';
import '../../core/utils/validators.dart';
import '../../state/auth_provider.dart';
import '../widgets/premium/animated_entry.dart';
import 'client/public_tracking_screen.dart';

/// Écran de connexion premium.
///
/// - Bandeau haut gradient primary → noir, logo circle blanc semi-transparent
/// - Carte formulaire en overlap élégant sur le gradient
/// - Champs qui héritent automatiquement du thème (InputDecorationTheme)
/// - Bouton principal FilledButton (style global), spinner inline
/// - Feedback erreur dans bloc rouge doux
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();

  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();

  bool _hidePassword = true;
  bool _submittedOnce = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    setState(() => _submittedOnce = true);

    final form = _formKey.currentState;
    if (form == null || !form.validate()) {
      AppSnackbars.showWarning(
        context,
        'Vérifie les champs du formulaire',
      );
      return;
    }

    final auth = context.read<AuthProvider>();
    await auth.login(_emailCtrl.text.trim(), _passCtrl.text);

    if (!mounted) return;

    if (auth.session != null) {
      AppSnackbars.showSuccess(context, 'Connexion réussie');
      return;
    }
    AppSnackbars.showError(
      context,
      auth.error?.trim().isNotEmpty == true
          ? auth.error!
          : 'Échec de connexion',
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Scaffold(
      body: Stack(
        children: [
          // Bandeau dégradé en fond (vers le haut)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              height: 360,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    scheme.primary,
                    Color.lerp(scheme.primary, Colors.black, 0.35) ??
                        scheme.primary,
                  ],
                ),
              ),
            ),
          ),
          // Particules subtiles dans la zone gradient
          const Positioned(
            top: 0, left: 0, right: 0,
            height: 360,
            child: FloatingParticles(count: 10, maxRadius: 22),
          ),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    const SizedBox(height: 48),
                    // Logo circulaire premium — entrée scale + bounce
                    EntryScale(
                      duration: const Duration(milliseconds: 700),
                      child: Container(
                        width: 96,
                        height: 96,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.18),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Colors.white.withOpacity(0.35),
                            width: 2,
                          ),
                        ),
                        child: const Icon(
                          Icons.local_shipping_rounded,
                          color: Colors.white,
                          size: 46,
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    EntryAnimation(
                      delay: const Duration(milliseconds: 220),
                      child: const Text(
                        'Delivery',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    EntryAnimation(
                      delay: const Duration(milliseconds: 320),
                      child: const Text(
                        'Connecte-toi à ton espace',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(height: 36),
                    // Carte formulaire — entrée slide-up depuis bas
                    EntryAnimation(
                      delay: const Duration(milliseconds: 420),
                      duration: const Duration(milliseconds: 620),
                      slide: 32,
                      child: _LoginCard(
                        formKey: _formKey,
                        emailCtrl: _emailCtrl,
                        passCtrl: _passCtrl,
                        hidePassword: _hidePassword,
                        onTogglePassword: () {
                          setState(() => _hidePassword = !_hidePassword);
                        },
                        submittedOnce: _submittedOnce,
                        authError: auth.error,
                        loading: auth.loading,
                        onSubmit: _submit,
                        onChanged: () {
                          if (_submittedOnce) setState(() {});
                        },
                      ),
                    ),
                    const SizedBox(height: 20),
                    EntryAnimation(
                      delay: const Duration(milliseconds: 580),
                      child: Text(
                        'Accès sécurisé selon ton rôle.',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(height: 40),
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

class _LoginCard extends StatelessWidget {
  final GlobalKey<FormState> formKey;
  final TextEditingController emailCtrl;
  final TextEditingController passCtrl;
  final bool hidePassword;
  final VoidCallback onTogglePassword;
  final bool submittedOnce;
  final String? authError;
  final bool loading;
  final VoidCallback onSubmit;
  final VoidCallback onChanged;

  const _LoginCard({
    required this.formKey,
    required this.emailCtrl,
    required this.passCtrl,
    required this.hidePassword,
    required this.onTogglePassword,
    required this.submittedOnce,
    required this.authError,
    required this.loading,
    required this.onSubmit,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.10),
            blurRadius: 30,
            offset: const Offset(0, 14),
          ),
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Form(
        key: formKey,
        autovalidateMode: submittedOnce
            ? AutovalidateMode.onUserInteraction
            : AutovalidateMode.disabled,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Bienvenue 👋',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Entre ton email et ton mot de passe pour continuer.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 20),
            TextFormField(
              controller: emailCtrl,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Email',
                hintText: 'exemple@email.com',
                prefixIcon: Icon(Icons.mail_outline_rounded),
              ),
              validator: AppValidators.email,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: passCtrl,
              obscureText: hidePassword,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => loading ? null : onSubmit(),
              decoration: InputDecoration(
                labelText: 'Mot de passe',
                prefixIcon: const Icon(Icons.lock_outline_rounded),
                suffixIcon: IconButton(
                  onPressed: onTogglePassword,
                  icon: Icon(
                    hidePassword
                        ? Icons.visibility_rounded
                        : Icons.visibility_off_rounded,
                  ),
                ),
              ),
              validator: (value) =>
                  AppValidators.password(value, minLength: 4),
              onChanged: (_) => onChanged(),
            ),
            if ((authError ?? '').trim().isNotEmpty) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: scheme.error.withOpacity(0.10),
                  borderRadius: BorderRadius.circular(12),
                  border:
                      Border.all(color: scheme.error.withOpacity(0.25)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.error_outline_rounded, color: scheme.error),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        authError!,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: scheme.error,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 22),
            FilledButton.icon(
              onPressed: loading ? null : onSubmit,
              icon: loading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.4,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.login_rounded),
              label: Text(loading ? 'Connexion…' : 'Se connecter'),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                textStyle: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            const SizedBox(height: 12),
            // Section 2.12 — accès au tracking public sans compte.
            Center(
              child: TextButton.icon(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => const PublicTrackingScreen()),
                ),
                icon: const Icon(Icons.search, size: 18),
                label: const Text('Suivre un colis sans compte'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
