import 'dart:async';

import '../state/notification_preferences.dart';
import 'notification_service.dart';
import 'realtime_service.dart';

/// Phase 10 — Orchestrateur qui traduit les événements SignalR en
/// notifications locales + sons système.
///
/// Deux variantes :
///   - [NotificationCoordinator.confirmatrice] : cible la confirmatrice.
///     Respecte le mute automatique pendant la pause (callback `isInPause`).
///   - [NotificationCoordinator.client] : cible le client. Pas de logique
///     pause.
///
/// Règles V1 :
///   Confirmatrice
///     - NouveauCas motif urgent (colis endommagé / non correspondant /
///       refus client / autre incident) → son urgent + notif
///     - NouveauCas motif normal                            → son standard + notif
///     - SeuilTentativesAtteint                             → son urgent + notif
///     - ClientARepondu                                     → son standard + notif
///     - CasReattribue (nouveau destinataire)               → son standard + notif
///     - Autres                                             → rien
///   Client
///     - NouveauCas (Demande visible client)                → son standard + notif
///     - StatutCasChange                                    → notif silencieuse
///     - CorrectionAppliquee                                → notif silencieuse
///     - StatutCommandeChange                               → notif silencieuse
///     - Autres                                             → rien
class NotificationCoordinator {
  final RealtimeService realtime;
  final NotificationService notifications;
  final NotificationPreferences prefs;

  /// Identifiant courant de l'utilisateur. Utilisé pour filtrer les événements
  /// qui ne concernent pas le bon destinataire (p. ex. CasReattribue où on ne
  /// veut notifier que la nouvelle confirmatrice, pas l'ancienne).
  final String? selfUserId;

  /// Callback qui rend `true` si les notifications doivent être muettes
  /// (ex. confirmatrice en pause). Null si pas de contexte de mute.
  final bool Function()? muteWhen;

  /// Cible fonctionnelle : `'CONFIRMATRICE'` ou `'CLIENT'`.
  final _Target _target;

  final List<StreamSubscription<dynamic>> _subs = [];
  bool _started = false;

  NotificationCoordinator.confirmatrice({
    required this.realtime,
    required this.notifications,
    required this.prefs,
    required this.selfUserId,
    required this.muteWhen,
  }) : _target = _Target.confirmatrice;

  NotificationCoordinator.client({
    required this.realtime,
    required this.notifications,
    required this.prefs,
    required this.selfUserId,
  })  : _target = _Target.client,
        muteWhen = null;

  void start() {
    if (_started) return;
    _started = true;

    // Le hub doit être démarré (ensureConnected appelé côté main.dart).
    realtime.ensureConnected();

    _subs.add(realtime.nouveauCas.listen(_onNouveauCas));
    _subs.add(realtime.statutCasChange.listen(_onStatutCasChange));
    _subs.add(realtime.clientARepondu.listen(_onClientARepondu));
    _subs.add(realtime.seuilTentativesAtteint.listen(_onSeuilTentatives));
    _subs.add(realtime.correctionAppliquee.listen(_onCorrectionAppliquee));
    _subs.add(realtime.statutCommandeChange.listen(_onStatutCommandeChange));
    _subs.add(realtime.casReattribue.listen(_onCasReattribue));
  }

  void stop() {
    for (final s in _subs) {
      s.cancel();
    }
    _subs.clear();
    _started = false;
  }

  bool get _isSoundOn => prefs.soundEnabled;
  bool get _isMuted => muteWhen?.call() ?? false;

  static const _urgentMotifs = {
    'COLIS_ENDOMMAGE',
    'COLIS_NON_CORRESPONDANT',
    'CLIENT_REFUSE',
    'AUTRE',
  };

  // ==========================================================================
  // Handlers
  // ==========================================================================

  void _onNouveauCas(CasEvent ev) {
    if (_isMuted || !_isSoundOn) return;

    if (_target == _Target.confirmatrice) {
      final urgent =
          _urgentMotifs.contains((ev.motif ?? '').toUpperCase());
      final title = urgent ? 'Nouveau cas prioritaire' : 'Nouveau cas';
      final body = _buildCasBody(ev, fallback: 'Un cas vient de t\'être attribué.');
      final payload = ev.id > 0 ? 'CAS|${ev.id}' : null;
      if (urgent) {
        notifications.showUrgent(
          id: ev.id,
          title: title,
          body: body,
          payload: payload,
        );
      } else {
        notifications.showStandard(
          id: ev.id,
          title: title,
          body: body,
          payload: payload,
        );
      }
    } else {
      // Client : notif seulement si c'est une Demande visible client (motif
      // A). Le backend n'envoie l'événement au client que dans ce cas.
      notifications.showStandard(
        id: ev.id,
        title: 'Le livreur t\'a envoyé une demande',
        body: _buildCasBody(ev, fallback: 'Ouvre tes demandes pour répondre.'),
        payload: ev.id > 0 ? 'CAS|${ev.id}' : null,
      );
    }
  }

  void _onStatutCasChange(CasEvent ev) {
    if (_isMuted || !_isSoundOn) return;
    // Uniquement pour le client — côté conf on reste sur la liste.
    if (_target != _Target.client) return;
    notifications.showSilent(
      id: ev.id,
      title: 'Mise à jour de ton dossier',
      body: _buildCasBody(ev, fallback: 'Le statut vient de changer.'),
      payload: ev.id > 0 ? 'CAS|${ev.id}' : null,
    );
  }

  void _onClientARepondu(CasEvent ev) {
    if (_isMuted || !_isSoundOn) return;
    if (_target != _Target.confirmatrice) return;
    notifications.showStandard(
      id: ev.id,
      title: 'Le client a répondu',
      body: _buildCasBody(ev, fallback: 'Une demande vient de passer en attente de validation.'),
      payload: ev.id > 0 ? 'CAS|${ev.id}' : null,
    );
  }

  void _onSeuilTentatives(CasEvent ev) {
    if (_isMuted || !_isSoundOn) return;
    if (_target != _Target.confirmatrice) return;
    notifications.showUrgent(
      id: ev.id,
      title: 'Seuil de 3 tentatives atteint',
      body: _buildCasBody(
        ev,
        fallback: 'Un dossier est escaladé après 3 tentatives.',
      ),
      payload: ev.id > 0 ? 'CAS|${ev.id}' : null,
    );
  }

  void _onCorrectionAppliquee(CasEvent ev) {
    if (_isMuted || !_isSoundOn) return;
    if (_target != _Target.client) return;
    notifications.showSilent(
      id: ev.id,
      title: 'Correction appliquée',
      body: 'La correction que tu as proposée a été enregistrée.',
      payload: ev.id > 0 ? 'CAS|${ev.id}' : null,
    );
  }

  void _onStatutCommandeChange(StatutCommandeEvent ev) {
    if (_isMuted || !_isSoundOn) return;
    if (_target != _Target.client) return;
    final piece = ev.doPiece;
    if (piece.isEmpty) return;
    notifications.showSilent(
      id: piece.hashCode,
      title: 'Statut de ta commande mis à jour',
      body: 'Commande $piece : ${ev.newStatut ?? "statut modifié"}.',
      payload: 'ORDER|$piece',
    );
  }

  void _onCasReattribue(CasReattribueEvent ev) {
    if (_isMuted || !_isSoundOn) return;
    if (_target != _Target.confirmatrice) return;

    // On ne notifie que si c'est MOI la nouvelle destinataire. L'ancienne
    // destinataire reçoit aussi l'événement mais n'a rien à être alertée
    // de bruyamment — la liste se met à jour toute seule.
    if (selfUserId == null || ev.newUserId == null) return;
    if (selfUserId!.toLowerCase() != ev.newUserId!.toLowerCase()) return;

    notifications.showStandard(
      id: ev.id,
      title: 'Un cas vient de t\'être réattribué',
      body: 'Un dossier a été redistribué par le système.',
      payload: ev.id > 0 ? 'CAS|${ev.id}' : null,
    );
  }

  String _buildCasBody(CasEvent ev, {required String fallback}) {
    final motif = (ev.motif ?? '').trim();
    if (motif.isEmpty) return fallback;
    return 'Motif : $motif.';
  }
}

enum _Target { confirmatrice, client }
