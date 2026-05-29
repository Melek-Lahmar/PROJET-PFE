"""
Modifie directement Rapport_Binome.docx :
- Supprime le contenu des chapitres 6, 7, 8 (body children 567 à 721 inclus)
- Insère le nouveau contenu enrichi avant l'élément de conclusion (child 722)
"""
import copy, shutil
from docx import Document
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from lxml import etree

SRC  = '/home/user/PROJET-PFE/Rapport/Rapport_Binome.docx'
DEST = '/home/user/PROJET-PFE/Rapport/Rapport_PFE_V1.docx'

shutil.copy(SRC, DEST)
doc = Document(DEST)
body = doc.element.body

# ─── helpers ───────────────────────────────────────────────────────────────

def _set_style(para_elem, style_name, doc):
    pPr = para_elem.find(qn('w:pPr'))
    if pPr is None:
        pPr = OxmlElement('w:pPr')
        para_elem.insert(0, pPr)
    pStyle = pPr.find(qn('w:pStyle'))
    if pStyle is None:
        pStyle = OxmlElement('w:pStyle')
        pPr.insert(0, pStyle)
    # Map friendly name → style id
    sid_map = {
        'Normal':           'Normal',
        'Heading 1':        'Heading1',
        'Heading 2':        'Heading2',
        'Heading 3':        'Heading3',
        'Heading 4':        'Heading4',
        'Caption Figure':   'CaptionFigure',
        'Caption Tableau':  'CaptionTableau',
        'List Paragraph':   'ListParagraph',
    }
    pStyle.set(qn('w:val'), sid_map.get(style_name, style_name))

def make_para(text, style_name, doc):
    p = OxmlElement('w:p')
    pPr = OxmlElement('w:pPr')
    pStyle = OxmlElement('w:pStyle')
    sid_map = {
        'Normal':          'Normal',
        'Heading 1':       'Heading1',
        'Heading 2':       'Heading2',
        'Heading 3':       'Heading3',
        'Heading 4':       'Heading4',
        'Caption Figure':  'CaptionFigure',
        'Caption Tableau': 'CaptionTableau',
        'List Paragraph':  'ListParagraph',
    }
    pStyle.set(qn('w:val'), sid_map.get(style_name, style_name))
    pPr.append(pStyle)
    p.append(pPr)
    r = OxmlElement('w:r')
    t = OxmlElement('w:t')
    t.text = text
    t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    r.append(t)
    p.append(r)
    return p

def ins(anchor, elems):
    """Insert list of elements before anchor in body."""
    for e in elems:
        anchor.addprevious(e)

def N(text):  return make_para(text, 'Normal', doc)
def H1(text): return make_para(text, 'Heading 1', doc)
def H2(text): return make_para(text, 'Heading 2', doc)
def H3(text): return make_para(text, 'Heading 3', doc)
def H4(text): return make_para(text, 'Heading 4', doc)
def CF(text): return make_para(text, 'Caption Figure', doc)
def CT(text): return make_para(text, 'Caption Tableau', doc)
def LP(text): return make_para(text, 'List Paragraph', doc)
def BR():     return make_para('', 'Normal', doc)

def make_table(headers, rows, doc):
    """Create a w:tbl element with style TableGrille."""
    tbl = OxmlElement('w:tbl')
    tblPr = OxmlElement('w:tblPr')
    tblStyle = OxmlElement('w:tblStyle')
    tblStyle.set(qn('w:val'), 'TableGrille5Fonc-Accent1')
    tblPr.append(tblStyle)
    tblW = OxmlElement('w:tblW')
    tblW.set(qn('w:w'), '9350')
    tblW.set(qn('w:type'), 'dxa')
    tblPr.append(tblW)
    tbl.append(tblPr)

    def make_row(cells, bold=False):
        tr = OxmlElement('w:tr')
        for cell_text in cells:
            tc = OxmlElement('w:tc')
            p = OxmlElement('w:p')
            r = OxmlElement('w:r')
            if bold:
                rPr = OxmlElement('w:rPr')
                b = OxmlElement('w:b')
                rPr.append(b)
                r.append(rPr)
            t = OxmlElement('w:t')
            t.text = str(cell_text)
            t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
            r.append(t)
            p.append(r)
            tc.append(p)
            tr.append(tc)
        return tr

    tbl.append(make_row(headers, bold=True))
    for row in rows:
        tbl.append(make_row(row))
    return tbl

# ─── Supprimer les anciens chapitres 6, 7, 8 (body children 567-721) ───────
children = list(body)
to_remove = children[567:722]   # indices 567 to 721 inclusive
for child in to_remove:
    body.remove(child)

print(f"Removed {len(to_remove)} children. Body children now: {len(list(body))}")

# ─── Point d'ancrage = l'élément Conclusion générale ────────────────────────
children = list(body)
anchor = None
for child in children:
    if child.tag.split('}')[-1] == 'p':
        text = ''.join(r.text or '' for r in child.iter(qn('w:t')))
        if 'Conclusion générale' in text:
            anchor = child
            break

assert anchor is not None, "Could not find 'Conclusion générale'"
print("Anchor found: Conclusion générale")

# ════════════════════════════════════════════════════════════════════════════
# CHAPITRE 6 — Sprint 3
# ════════════════════════════════════════════════════════════════════════════
c6 = []

# page-break marker paragraph
pb = OxmlElement('w:p')
pbPr = OxmlElement('w:pPr')
pbr = OxmlElement('w:r')
pbrPr = OxmlElement('w:rPr')
br_el = OxmlElement('w:br')
br_el.set(qn('w:type'), 'page')
pbr.append(pbrPr)
pbr.append(br_el)
pb.append(pbPr)
pb.append(pbr)
c6.append(pb)

c6 += [
    N('Chapitre 6 : Sprint 3 — Administration, confirmateur, réclamations et tableau de bord initial'),
    H1('Chapitre 6 : Sprint 3 — Administration, confirmateur, réclamations et tableau de bord initial'),
    H2('1. Introduction'),
    N("Ce chapitre présente le troisième sprint de notre solution. Après la mise en place du parcours client dans le Sprint 2, ce sprint se concentre sur le backoffice et le workflow métier interne. Deux profils principaux sont concernés : l'administrateur, qui gère les produits, les stocks, les dépôts et les utilisateurs, et le confirmateur, qui traite les bons de commande, déclenche la transformation en bons de livraison et gère l'ensemble des réclamations clients."),
    N("Ce sprint introduit également le module de réclamations avec communication en temps réel via SignalR. Les confirmateurs reçoivent instantanément les nouvelles réclamations et les réassignations de cas sans rechargement de page. Un premier tableau de bord d'indicateurs opérationnels est également mis en place pour l'administrateur."),
    H2('2. Objectif et périmètre du Sprint 3'),
    N("Le Sprint 3 s'est déroulé du 16/03/2026 au 04/04/2026. Son objectif est de fournir aux profils internes les outils nécessaires pour piloter les produits, les stocks, les dépôts, les comptes utilisateurs, les bons de commande et les réclamations. Il couvre également la mise en place de la communication temps réel (SignalR) entre le confirmateur et le client sur les réclamations, ainsi qu'un premier tableau de bord de suivi."),
    H2('3. Backlog du Sprint 3'),
    N('Le tableau suivant présente les principales histoires utilisateurs traitées durant le Sprint 3.'),
    CT('Tableau  : Backlog du Sprint 3'),
]
c6.append(make_table(
    ['ID', 'Rôle', 'User Story', 'Endpoints / Modules', 'Resp.', 'Estim.'],
    [
        ['US1', 'Admin', 'Gérer les produits (CRUD, images, synchronisation Sage)', '/api/admin/articles, /api/articles/sync-sage', 'Melek', '4 j'],
        ['US2', 'Admin', 'Gérer les stocks et les dépôts', '/api/admin/stocks, /api/admin/depots', 'Melek', '3 j'],
        ['US3', 'Admin', 'Gérer les utilisateurs et leurs rôles', '/api/admin/users, /api/admin/users/{id}/roles', 'Tawfik', '3 j'],
        ['US4', 'Confirm.', 'Consulter et filtrer les bons de commande (BC)', '/api/confirmateur/commandes, /api/confirmateur/bc', 'Melek', '3 j'],
        ['US5', 'Confirm.', 'Modifier le statut d\'un BC (0=Annulé, 1=Confirmé, 2=EnLivraison, 3=Livré)', '/api/confirmateur/commandes/{piece}/status', 'Tawfik', '2 j'],
        ['US6', 'Confirm.', 'Transformer un BC en bon de livraison (BL), gérer les doublons', '/api/confirmateur/commandes/{piece}/transform-to-bl', 'Tawfik', '4 j'],
        ['US7', 'Confirm.', 'Consulter les bons de livraison générés', '/api/confirmateur/bl, /api/confirmateur/bl/{piece}', 'Melek', '2 j'],
        ['US8', 'Confirm.', 'Gérer les réclamations : prise en charge, statut, réassignation, échange, note interne', '/api/confirmateur/reclamations/*', 'Melek/Tawfik', '5 j'],
        ['US9', 'Confirm.', 'Chat temps réel avec le client sur une réclamation (SignalR)', 'ReclamationHub, NouveauCas, NouveauMessage', 'Tawfik', '3 j'],
        ['US10', 'Confirm.', 'Envoyer une demande de correction au client', '/api/confirmateur/reclamations/{id}/correction', 'Melek', '2 j'],
        ['US11', 'Confirm.', 'Suivre sa session et ses indicateurs (pause, reprise, stats)', '/api/confirmateur/status/me, /me/stats', 'Tawfik', '2 j'],
        ['US12', 'Admin', 'Consulter le tableau de bord initial (commandes, livreurs, réclamations)', '/api/admin/dashboard, /api/dashboard', 'Melek', '3 j'],
    ],
    doc
))

c6 += [
    H2('4. Analyse fonctionnelle du Sprint 3'),
    N("L'analyse fonctionnelle de ce sprint précise les interactions entre les acteurs, les interfaces React/Flutter et la Web API. Elle couvre deux domaines distincts : la gestion documentaire (BC/BL) et le circuit de réclamation avec communication temps réel."),
    H3('4.1 Diagramme de cas d\'utilisation du Sprint 3'),
    N('[Insérer ici le diagramme de cas d\'utilisation du Sprint 3]'),
    CF("Figure  : Diagramme de cas d'utilisation du Sprint 3"),
    N("Ce diagramme présente les interactions des deux profils principaux. L'administrateur gère les produits, les stocks, les dépôts et les utilisateurs. Le confirmateur consulte et modifie les bons de commande, déclenche la transformation BC→BL, prend en charge les réclamations, échange des messages en temps réel avec le client via SignalR, envoie des demandes de correction et suit ses indicateurs de performance."),
    H3('4.2 Diagrammes de séquence du Sprint 3'),
    H4('4.2.1 Transformation d\'un bon de commande en bon de livraison'),
    N("Ce diagramme illustre la transformation documentaire BC→BL. Le confirmateur envoie une requête POST /api/confirmateur/commandes/{piece}/transform-to-bl. La Web API vérifie l'existence du BC, contrôle qu'aucun BL n'existe déjà pour éviter le doublon, crée le bon de livraison dans F_DOCENTETE (DO_Type = 1), génère les lignes correspondantes dans F_DOCLIGNE et retourne la référence du BL créé. Si un BL existe déjà, la référence existante est retournée directement. En cas d'erreur (BC introuvable, stock insuffisant), la transaction est annulée et un message explicite est retourné."),
    N('[Insérer ici le diagramme de séquence — Transformation BC en BL]'),
    CF("Figure  : Diagramme de séquence — Transformation BC en BL"),
    H4('4.2.2 Gestion des réclamations et communication SignalR'),
    N("Ce diagramme décrit le cycle complet d'une réclamation. Lorsqu'un client crée une réclamation (POST /api/reclamations), la Web API enregistre le cas dans F_RECLAMATION et diffuse l'événement NouveauCas à tous les confirmateurs connectés via le ReclamationHub SignalR. Le confirmateur disponible prend en charge le cas (POST /reprendre) : son identifiant est associé à la réclamation et l'événement CasAssigne est diffusé. Le confirmateur peut ensuite modifier le statut (PUT /status → CLOTUREE ou REFUSEE), envoyer une demande de correction (PUT /correction), créer un bon d'échange (POST /echange) ou réassigner le cas (PUT /assign → événement CasReattribue diffusé). Chaque message échangé dans le chat (POST /messages) est diffusé en temps réel via l'événement NouveauMessage au destinataire concerné."),
    N('[Insérer ici le diagramme de séquence — Réclamation et SignalR]'),
    CF("Figure  : Diagramme de séquence — Réclamation et communication SignalR"),
    N("Mécanisme SignalR — Réclamations : le ReclamationHub maintient deux types de groupes de connexion. Le groupe « confirmateurs » reçoit les événements globaux (NouveauCas, CasReattribue). Le groupe « client-{userId} » reçoit les événements propres au client (StatutCasChange, NouveauMessage). Une période de grâce de 5 secondes est appliquée lors d'une déconnexion, afin d'éviter la libération prématurée d'un cas lors d'un simple changement de réseau Wi-Fi/4G."),
    H2('5. Réalisation du Sprint 3'),
    N("La réalisation traduit les choix fonctionnels en interfaces exploitables. Les composants React consomment les endpoints de la Web API via Axios, tandis que les composants Flutter utilisent le service ApiClient avec injection du jeton JWT. Les traitements métier sont centralisés dans la Web API ASP.NET Core et la persistance est assurée par SQL Server via Entity Framework Core."),
    H3('5.1 Interface administration des produits'),
    N("Cette interface permet à l'administrateur de consulter, filtrer, créer, modifier et désactiver les produits du catalogue. Elle affiche les informations Sage (code article, désignation, prix) ainsi que les images associées. La synchronisation avec Sage X3 peut être déclenchée manuellement depuis cette interface pour mettre à jour les articles, les prix et les stocks."),
    N('[Capture à insérer : Interface administration des produits]'),
    CF("Figure  : Interface administration des produits"),
    H3('5.2 Interface gestion des stocks et des dépôts'),
    N("Cette interface présente les quantités disponibles par article et par dépôt. Elle permet à l'administrateur de surveiller les niveaux de stock, de gérer les dépôts (nom, gouvernorat, délégation, coordonnées GPS) et de vérifier la cohérence entre les données locales et les données Sage X3."),
    N('[Capture à insérer : Interface gestion des stocks et des dépôts]'),
    CF("Figure  : Interface gestion des stocks et des dépôts"),
    H3('5.3 Interface confirmateur — bons de commande'),
    N("Cette interface React affiche la liste des bons de commande avec leurs statuts (EN_ATTENTE, CONFIRME, TENTATIVE, REFUSE). Le confirmateur peut filtrer par statut, consulter le détail d'un BC (lignes, informations client, mode de paiement, montant facturé) et modifier le statut via le sélecteur (0=Annulé, 1=Confirmé, 2=En livraison, 3=Livré). L'interface mobile Flutter (confirmatrice_orders_screen) offre les mêmes fonctionnalités depuis un appareil mobile."),
    N('[Capture à insérer : Interface confirmateur bons de commande]'),
    CF("Figure  : Interface confirmateur — bons de commande"),
    H3('5.4 Interface transformation BC en bon de livraison'),
    N("Cette interface permet au confirmateur de déclencher la transformation d'un bon de commande en bon de livraison d'un seul clic. Le système vérifie l'absence de doublon, génère le BL et affiche sa référence immédiatement. En cas d'erreur (stock insuffisant, BC introuvable), un message explicite est présenté à l'utilisateur. L'interface liste également les bons de livraison déjà générés avec leurs statuts et leurs lignes."),
    N('[Capture à insérer : Interface transformation BC en BL]'),
    CF("Figure  : Interface transformation BC en bon de livraison"),
    H3('5.5 Interface gestion des réclamations (avec chat SignalR)'),
    N("Cette interface est le cœur du module de réclamations côté confirmateur. Elle affiche la liste des cas ouverts avec leurs motifs, statuts, sources (CLIENT ou LIVREUR) et confirmateurs assignés. Les nouvelles réclamations apparaissent automatiquement grâce à l'événement SignalR NouveauCas, sans rechargement de la page. Le confirmateur peut prendre en charge un cas, modifier son statut (ENVOYEE, EN_COURS_DE_TRAITEMENT, CLOTUREE, REFUSEE), envoyer une demande de correction au client, consulter les tentatives de livraison associées avec leurs coordonnées GPS, créer un bon d'échange, ajouter une note interne ou réassigner le cas à un autre confirmateur (événement CasReattribue diffusé en temps réel). Le fil de discussion intégré permet d'échanger des messages avec le client en temps réel via l'événement SignalR NouveauMessage. Les photos jointes à la réclamation (formats JPEG, PNG, HEIC, HEIF) sont affichées dans l'interface."),
    N('[Capture à insérer : Interface gestion des réclamations avec chat]'),
    CF("Figure  : Interface réclamations confirmateur avec chat SignalR"),
    H3('5.6 Interface gestion des utilisateurs'),
    N("Cette interface permet à l'administrateur d'administrer les comptes, les profils et les rôles selon les responsabilités de chaque utilisateur. Elle consomme GET /api/admin/users (avec filtres par rôle) et permet de créer un utilisateur (POST /api/admin/users) ou de modifier ses rôles (PUT /api/admin/users/{id}/roles). Les rôles disponibles sont CLIENT, VENDEUR, CONFIRMATEUR, LIVREUR et ADMIN."),
    N('[Capture à insérer : Interface gestion des utilisateurs]'),
    CF("Figure  : Interface gestion des utilisateurs"),
    H3('5.7 Interface tableau de bord initial'),
    N("Le tableau de bord initial présente les indicateurs essentiels permettant de suivre l'activité commerciale et opérationnelle : nombre de commandes par statut, montants encaissés, réclamations ouvertes, livreurs actifs et taux de livraison. Ces données sont produites par les endpoints /api/admin/dashboard et /api/dashboard."),
    N('[Capture à insérer : Interface tableau de bord initial]'),
    CF("Figure  : Interface tableau de bord initial"),
    H2('6. Tests et validation du Sprint 3'),
    N("Les tests de validation vérifient que les fonctionnalités développées répondent aux besoins définis et que les échanges entre les couches applicatives restent cohérents."),
    CT('Tableau  : Tests fonctionnels du Sprint 3'),
]
c6.append(make_table(
    ['Test', 'Objectif', 'Résultat attendu', 'Statut'],
    [
        ['Accès confirmateur', 'Vérifier que seul le rôle CONFIRMATEUR accède aux BC et aux réclamations.', 'Accès refusé (401/403) pour tout autre rôle.', 'À valider'],
        ['Consultation BC', 'Vérifier l\'affichage du détail et des lignes d\'un BC.', 'Informations cohérentes avec la base SQL Server.', 'À valider'],
        ['Mise à jour statut BC', 'Vérifier les transitions de statut 0, 1, 2, 3.', 'Le statut est mis à jour et visible dans la liste.', 'À valider'],
        ['Transformation BC→BL', 'Vérifier la génération du BL sans doublon.', 'Un BL est créé. La référence est retournée.', 'À valider'],
        ['Gestion doublon BL', 'Vérifier le comportement si BL existant.', 'La référence existante est retournée sans création.', 'À valider'],
        ['Prise en charge réclamation', 'Vérifier l\'assignation d\'un cas à un confirmateur.', 'Le cas est associé et retiré de la liste commune.', 'À valider'],
        ['SignalR NouveauCas', 'Vérifier la réception instantanée d\'une nouvelle réclamation.', 'La réclamation apparaît sans rechargement de page.', 'À valider'],
        ['Chat temps réel', 'Vérifier la réception des messages NouveauMessage.', 'Les messages arrivent instantanément dans le chat.', 'À valider'],
        ['Création bon d\'échange', 'Vérifier la création d\'un BL d\'échange depuis une réclamation.', 'Un bon d\'échange est généré avec les bonnes lignes.', 'À valider'],
        ['Stats confirmateur', 'Vérifier les indicateurs de performance.', 'Cas actifs, clôturés et taux de résolution cohérents.', 'À valider'],
    ],
    doc
))

c6 += [
    H2('7. Conclusion'),
    N("Ce sprint a permis de construire le backoffice complet de la solution. L'administrateur dispose de la gestion des produits, des stocks, des dépôts et des utilisateurs. Le confirmateur bénéficie d'un workflow clair pour traiter les bons de commande, déclencher la transformation en bons de livraison et gérer les réclamations en temps réel grâce à SignalR. Ce sprint constitue la charnière entre le parcours client et la phase logistique qui sera développée dans le Sprint 4."),
    BR(),
]

# ════════════════════════════════════════════════════════════════════════════
# CHAPITRE 7 — Sprint 4
# ════════════════════════════════════════════════════════════════════════════
c7 = []

pb7 = OxmlElement('w:p')
pb7Pr = OxmlElement('w:pPr')
pb7r = OxmlElement('w:r')
pb7rPr = OxmlElement('w:rPr')
br7 = OxmlElement('w:br')
br7.set(qn('w:type'), 'page')
pb7r.append(pb7rPr)
pb7r.append(br7)
pb7.append(pb7Pr)
pb7.append(pb7r)
c7.append(pb7)

c7 += [
    N('Chapitre 7 : Sprint 4 — Suivi mobile des livraisons, GPS temps réel, transit inter-dépôts et réclamations'),
    H1('Chapitre 7 : Sprint 4 — Suivi mobile des livraisons, GPS temps réel, transit inter-dépôts et réclamations'),
    H2('1. Introduction'),
    N("Ce chapitre présente le quatrième sprint, centré sur la partie logistique et le suivi mobile en conditions réelles. Après la génération des bons de livraison dans le Sprint 3, ce sprint équipe le livreur d'outils mobiles pour consulter les livraisons disponibles dans sa zone géographique, en prendre en charge, mettre à jour leur statut et partager sa position GPS en temps réel avec le client via SignalR. Il introduit également le module de transit inter-dépôts avec scan de codes-barres, l'optimisation de tournée via l'algorithme du voisin le plus proche couplé au service OSRM, et le suivi adaptatif côté client mobile (TrackingStateCard)."),
    N("Ce sprint couvre également la gestion des réclamations côté client React et Flutter, avec création, envoi de photos (incluant les formats iPhone HEIC/HEIF) et chat en temps réel avec le confirmateur."),
    H2('2. Objectif et périmètre du Sprint 4'),
    N("Le Sprint 4 s'est déroulé du 06/04/2026 au 25/04/2026. Son objectif est de finaliser le flux logistique côté terrain : livraisons COD, suivi GPS, transit inter-dépôts, optimisation de tournée, gestion de caisse et réclamations mobile."),
    H2('3. Backlog du Sprint 4'),
    N('Le tableau suivant présente les principales histoires utilisateurs traitées durant le Sprint 4.'),
    CT('Tableau  : Backlog du Sprint 4'),
]
c7.append(make_table(
    ['ID', 'Rôle', 'User Story', 'Endpoints / Modules', 'Resp.', 'Estim.'],
    [
        ['US1', 'Livreur', 'Consulter les livraisons disponibles dans ma zone (gouvernorat/délégation)', '/api/livreur/pool/disponibles', 'Tawfik', '3 j'],
        ['US2', 'Livreur', 'Prendre en charge une livraison (gestion des conflits 409)', '/api/livreur/pool/{doPiece}/prendre', 'Melek', '2 j'],
        ['US3', 'Livreur', 'Consulter mes livraisons affectées', '/api/livreur/pool/mes-livraisons', 'Tawfik', '2 j'],
        ['US4', 'Livreur', 'Mettre à jour le statut (LIVRE, REPORTE, RETOUR, DEPOT, TENTATIVE) + encaissement COD', '/api/livreur/orders/{piece}/status + /encaisser', 'Melek', '4 j'],
        ['US5', 'Livreur', 'Démarrer livraison active : diffuser position GPS en temps réel via SignalR au client', '/start-heading + /location/ping + /ping-batch', 'Tawfik', '5 j'],
        ['US6', 'Livreur', 'Optimiser la tournée : voisin le plus proche + Haversine + ETA via OSRM', '/api/livreur/tournee/optimize', 'Melek', '4 j'],
        ['US7', 'Livreur transit', 'Gérer les missions de transit inter-dépôts par scan de codes-barres (mobile_scanner)', '/api/transit/my-missions/* + scan barcode', 'Tawfik', '5 j'],
        ['US8', 'Livreur', 'Consulter ses statistiques (jour/semaine/mois) et gérer la caisse COD', '/api/livreur/stats + /cashbox/remettre', 'Melek', '3 j'],
        ['US9', 'Client', 'Suivre la commande en temps réel : TrackingStateCard (AT_DEPOT/IN_DELIVERY_QUEUE/HEADING_TO_YOU/TERMINAL)', '/api/tracking-state + SignalR LocationUpdate', 'Tawfik', '4 j'],
        ['US10', 'Client', 'Déposer une réclamation avec photos (HEIC/HEIF), suivre le traitement et chatter avec le confirmateur', '/api/reclamations/* + SignalR NouveauMessage', 'Melek', '4 j'],
        ['US11', 'Admin', 'Superviser les livreurs actifs, leurs zones et leurs alertes', '/api/admin/livreurs, /api/livreur/map/heatmap', 'Tawfik', '3 j'],
    ],
    doc
))

c7 += [
    H2('4. Analyse fonctionnelle du Sprint 4'),
    N("L'analyse fonctionnelle de ce sprint précise les interactions entre les acteurs du terrain (livreur, livreur de transit, client) et les modules développés. Elle couvre trois domaines : le suivi des livraisons COD avec GPS temps réel, le transit inter-dépôts par scan, et le suivi client adaptatif."),
    H3('4.1 Diagramme de cas d\'utilisation du Sprint 4'),
    N('[Insérer ici le diagramme de cas d\'utilisation du Sprint 4]'),
    CF("Figure  : Diagramme de cas d'utilisation du Sprint 4"),
    N("Ce diagramme présente les fonctionnalités mobiles des trois profils. Le livreur standard consulte les livraisons disponibles dans sa zone, les prend en charge, met à jour les statuts, démarre une livraison active avec diffusion GPS et optimise sa tournée. Le livreur de transit gère ses missions inter-dépôts par scan de codes-barres. Le client suit sa commande en temps réel et dépose des réclamations. L'administrateur supervise les livreurs actifs et leurs positions sur la carte de chaleur."),
    H3('4.2 Diagrammes de séquence du Sprint 4'),
    H4('4.2.1 Diffusion GPS en temps réel via SignalR'),
    N("Ce diagramme illustre le fonctionnement complet du suivi GPS en temps réel. Lorsque le livreur démarre une livraison active (POST /api/livreur/orders/{piece}/start-heading), la Web API enregistre le début de diffusion dans F_LIVREUR_POSITION. Le service LivreurLocationService (plugin Geolocator, Flutter) capture la position GPS de l'appareil toutes les 10 secondes et l'envoie via POST /api/livreur/location/ping. La Web API effectue un UPSERT dans F_LIVREUR_POSITION (latitude, longitude, timestamp) et dans F_LIVREUR_POSITION_HISTORY pour l'audit, puis diffuse les coordonnées au client concerné via l'événement SignalR LocationUpdate (groupe client-{userId}). Côté client Flutter, la carte live LiveDeliveryMapSheet reçoit ces coordonnées et repositionne le marqueur du livreur en temps réel. En cas de perte de réseau, les positions sont stockées dans une file d'attente locale et envoyées en lot via POST /api/livreur/location/ping-batch à la reconnexion. Le livreur arrête la diffusion via POST /stop-heading."),
    N('[Insérer ici le diagramme de séquence — Diffusion GPS et SignalR]'),
    CF("Figure  : Diagramme de séquence — Diffusion GPS en temps réel via SignalR"),
    H4('4.2.2 Mise à jour du statut d\'une livraison COD'),
    N("Ce diagramme illustre la mise à jour du statut d'une livraison depuis l'application Flutter du livreur. Le livreur sélectionne le nouveau statut (LIVRE, REPORTE, RETOUR, DEPOT, TENTATIVE) et valide. La Web API vérifie le rôle, contrôle l'affectation de la livraison au livreur connecté, normalise le statut et met à jour F_LIVRAISON. Pour le statut LIVRE, la date de livraison est enregistrée et le montant COD est encaissé automatiquement dans F_LIVRAISON (Encaisse = true, MontantEncaisse). Pour REPORTE, une date de replanification doit être fournie. La mise à jour par lot (PUT /api/livreur/orders/batch-status) permet de traiter plusieurs commandes simultanément."),
    N('[Insérer ici le diagramme de séquence — Mise à jour livraison COD]'),
    CF("Figure  : Diagramme de séquence — Mise à jour d'une livraison COD"),
    H4('4.2.3 Scan de codes-barres pour le transit inter-dépôts'),
    N("Ce diagramme présente le workflow de validation d'un article dans une mission de transit inter-dépôts. Le livreur de transit ouvre la mission dans transit_mission_details_screen et active le scanner via transit_barcode_scanner_screen (plugin mobile_scanner avec retour sonore). Chaque scan envoie le code-barres à la Web API (PUT /api/transit/my-missions/{id}/scan). La Web API vérifie que l'article appartient à la mission, marque la ligne correspondante comme reçue dans F_TRANSFERTS et retourne une confirmation. Un retour sonore est émis à chaque scan réussi. La mission est marquée comme terminée lorsque tous les articles ont été validés."),
    N('[Insérer ici le diagramme de séquence — Scan transit inter-dépôts]'),
    CF("Figure  : Diagramme de séquence — Scan de codes-barres transit inter-dépôts"),
    H4('4.2.4 Suivi commande client (TrackingStateCard)'),
    N("Ce diagramme décrit la logique adaptative de l'écran de suivi client. La carte TrackingStateCard interroge GET /api/tracking-state toutes les 15 secondes (ou via SignalR en temps réel). Le backend retourne l'état courant de la commande parmi quatre valeurs : AT_DEPOT (commande en dépôt, aucun livreur assigné), IN_DELIVERY_QUEUE (bon de livraison créé, livreur assigné mais pas encore en route), HEADING_TO_YOU (livreur en route, F_LIVREUR_POSITION disponible), TERMINAL (livré, retourné ou annulé). En état HEADING_TO_YOU, la carte affiche en plus la position GPS du livreur (mise à jour via SignalR LocationUpdate), l'ETA en minutes, la distance restante et l'indicateur de fraîcheur de la position (vert < 30s, orange < 2 min, rouge sinon). Le client peut appeler ou envoyer un SMS au livreur directement depuis cet écran."),
    N('[Insérer ici le diagramme de séquence — TrackingStateCard]'),
    CF("Figure  : Diagramme de séquence — Suivi commande client (TrackingStateCard)"),
    H2('5. Réalisation du Sprint 4'),
    N("La réalisation traduit les choix fonctionnels en interfaces exploitables. Les composants React et Flutter consomment les endpoints de la Web API. Les traitements métier sont centralisés dans la Web API ASP.NET Core et la persistance est assurée par SQL Server via Entity Framework Core."),
    H3('5.1 Interface mobile — livraisons disponibles'),
    N("L'écran new_orders_screen permet au livreur de consulter les bons de livraison disponibles dans son gouvernorat et sa délégation. Les livraisons sont affichées sous forme de cartes avec l'adresse du destinataire, le montant COD, le mode de paiement et les informations de contact. Le livreur peut prendre en charge une livraison d'un simple appui. Si la livraison a déjà été prise par un autre livreur, un message de conflit est affiché."),
    N('[Capture à insérer : Interface mobile livraisons disponibles]'),
    CF("Figure  : Interface mobile — livraisons disponibles"),
    H3('5.2 Interface mobile — mes livraisons et mise à jour du statut'),
    N("L'écran my_orders_screen affiche les livraisons affectées au livreur, organisées par statut. L'écran delivery_details_screen permet de modifier le statut (LIVRE, REPORTE, RETOUR, DEPOT, TENTATIVE). Pour REPORTE, un sélecteur de date de replanification est présenté. Le montant COD est encaissé automatiquement lors du passage au statut LIVRE. Le livreur peut également démarrer la diffusion GPS depuis cet écran (bouton « Démarrer la livraison »)."),
    N('[Capture à insérer : Interface mobile mes livraisons et mise à jour statut]'),
    CF("Figure  : Interface mobile — mes livraisons et mise à jour du statut"),
    H3('5.3 Interface mobile — carte et optimisation de tournée'),
    N("Cette interface affiche sur une carte interactive toutes les livraisons du livreur avec leur position. L'algorithme d'optimisation (voisin le plus proche + distance Haversine) calcule l'ordre optimal des arrêts. Le service OSRM fournit les ETA (temps estimé d'arrivée) pour chaque segment de la tournée. En état HEADING_TO_YOU, la carte live LiveDeliveryMapSheet affiche la position GPS du livreur mise à jour en temps réel via SignalR et est visible par le client sur son application mobile."),
    N('[Capture à insérer : Interface mobile carte et optimisation de tournée]'),
    CF("Figure  : Interface mobile — carte et optimisation de tournée (OSRM)"),
    H3('5.4 Interface mobile — transit inter-dépôts et scan codes-barres'),
    N("L'écran transit_home_screen liste les missions de transit inter-dépôts assignées au livreur de transit. L'écran transit_mission_details_screen présente les articles attendus avec leur état de réception (reçu / en attente). L'écran transit_barcode_scanner_screen active la caméra du téléphone via le plugin mobile_scanner. Chaque scan déclenche une vibration et un son de confirmation. Les articles scannés sont immédiatement marqués comme reçus dans F_TRANSFERTS. La mission est clôturée lorsque tous les articles ont été validés."),
    N('[Capture à insérer : Interface mobile transit et scan codes-barres]'),
    CF("Figure  : Interface mobile — transit inter-dépôts et scan codes-barres"),
    H3('5.5 Interface mobile — statistiques livreur et caisse COD'),
    N("L'écran livreur_stats_screen affiche les indicateurs de performance : livraisons du jour, taux de réussite, montant total encaissé, tendance des 7 derniers jours (sparkline), répartition par statut (livré, retour, reporté, dépôt). Le livreur peut soumettre sa caisse au dépôt (POST /api/livreur/cashbox/remettre) et consulter l'historique de ses remises. L'onglet Profil permet d'accéder aux informations personnelles et de se déconnecter."),
    N('[Capture à insérer : Interface mobile statistiques livreur et caisse]'),
    CF("Figure  : Interface mobile — statistiques livreur et caisse COD"),
    H3('5.6 Interface suivi commande client (TrackingStateCard)'),
    N("La carte adaptative TrackingStateCard affiche l'état de la commande en fonction des données retournées par /api/tracking-state. L'état AT_DEPOT affiche un message informatif avec le numéro de passage au dépôt si applicable. L'état IN_DELIVERY_QUEUE affiche le nom du livreur et un bouton d'appel. L'état HEADING_TO_YOU affiche la carte live avec la position GPS du livreur, l'ETA en minutes, la distance restante et un indicateur de fraîcheur de la position (vert, orange, rouge selon l'âge des données). L'état TERMINAL affiche le message final (livré, retourné, annulé). Le client peut appeler ou envoyer un SMS au livreur directement depuis l'écran."),
    N('[Capture à insérer : Interface suivi commande client TrackingStateCard]'),
    CF("Figure  : Interface suivi commande client — TrackingStateCard adaptative"),
    H3('5.7 Interface réclamations client (React et Flutter)'),
    N("L'interface React de réclamations permet au client de déposer une réclamation (POST /api/reclamations), de sélectionner le motif (COLIS_ENDOMMAGE, NON_LIVRE, MAUVAIS_ARTICLE, etc.), de joindre des photos et de suivre le traitement. L'interface Flutter (client_create_claim_screen, client_claim_details_screen) offre les mêmes fonctionnalités depuis le mobile avec support des formats photo HEIC et HEIF (iPhone). Le chat intégré permet d'échanger des messages avec le confirmateur en temps réel via SignalR (événement NouveauMessage). L'historique complet des messages est affiché dans le fil de discussion."),
    N('[Capture à insérer : Interface réclamations client React et Flutter]'),
    CF("Figure  : Interface réclamations client — React et Flutter avec chat SignalR"),
    H3('5.8 Interface supervision livreurs (admin React)'),
    N("Cette interface React donne à l'administrateur une vision des livreurs actifs, de leurs zones géographiques et de leurs indicateurs de performance. La carte de chaleur (heatmap) des livraisons échouées (90 jours glissants, cellules de 500 m) permet d'identifier les zones à problèmes et d'optimiser l'affectation des livreurs."),
    N('[Capture à insérer : Interface supervision livreurs et heatmap]'),
    CF("Figure  : Interface supervision livreurs — heatmap des zones à risque"),
    H2('6. Tests et validation du Sprint 4'),
    N("Les tests de validation vérifient le bon fonctionnement des modules développés dans les différents contextes d'usage terrain."),
    CT('Tableau  : Tests fonctionnels du Sprint 4'),
]
c7.append(make_table(
    ['Test', 'Objectif', 'Résultat attendu', 'Statut'],
    [
        ['Livraisons disponibles', 'Vérifier le filtrage par zone géographique.', 'Seules les livraisons du gouvernorat/délégation du livreur apparaissent.', 'À valider'],
        ['Prise en charge', 'Vérifier la création d\'une entrée F_LIVRAISON.', 'La livraison est associée au livreur et disparaît de la liste des disponibles.', 'À valider'],
        ['Conflit d\'affectation', 'Vérifier le cas d\'une livraison déjà prise.', 'Le système retourne 409. La livraison n\'est pas doublée.', 'À valider'],
        ['Statut LIVRE + COD', 'Vérifier l\'encaissement automatique.', 'MontantEncaisse et Encaisse=true sont sauvegardés dans F_LIVRAISON.', 'À valider'],
        ['Statut REPORTE', 'Vérifier l\'exigence de la date de replanification.', 'L\'opération est refusée si la date est absente.', 'À valider'],
        ['Diffusion GPS SignalR', 'Vérifier la réception de la position par le client.', 'La carte live affiche la position avec fraîcheur < 30 secondes.', 'À valider'],
        ['File d\'attente offline', 'Vérifier l\'envoi différé des positions.', 'Les positions sont envoyées via /ping-batch à la reconnexion réseau.', 'À valider'],
        ['Optimisation tournée OSRM', 'Vérifier l\'ordre optimal calculé.', 'L\'ordre minimise la distance totale. Les ETA sont cohérents.', 'À valider'],
        ['Scan barcode transit', 'Vérifier la validation d\'un article par scan.', 'L\'article est marqué reçu dans F_TRANSFERTS. Retour sonore émis.', 'À valider'],
        ['TrackingStateCard — 4 états', 'Vérifier l\'affichage adaptatif.', 'Chaque état affiche les bonnes informations et boutons d\'action.', 'À valider'],
        ['Réclamation + photo HEIC', 'Vérifier l\'envoi d\'une réclamation avec photo iPhone.', 'La photo est acceptée et stockée. La réclamation apparaît côté confirmateur.', 'À valider'],
        ['Chat SignalR NouveauMessage', 'Vérifier la réception instantanée des messages.', 'Les messages arrivent sans rechargement via SignalR.', 'À valider'],
    ],
    doc
))

c7 += [
    H2('7. Conclusion'),
    N("Ce sprint a complété la dimension logistique et terrain de la solution. Le livreur dispose d'outils mobiles complets pour gérer ses livraisons COD, diffuser sa position GPS en temps réel via SignalR, optimiser sa tournée et gérer les missions de transit inter-dépôts par scan de codes-barres. Le client bénéficie d'un suivi adaptatif en temps réel (TrackingStateCard) et d'un module de réclamations avec chat. L'administrateur peut superviser les livreurs actifs et analyser les zones à risque via la carte de chaleur. Ce sprint prépare le Sprint 5, consacré à la finalisation, aux tableaux de bord avancés et au chatbot administrateur."),
    BR(),
]

# ════════════════════════════════════════════════════════════════════════════
# CHAPITRE 8 — Sprint 5
# ════════════════════════════════════════════════════════════════════════════
c8 = []

pb8 = OxmlElement('w:p')
pb8Pr = OxmlElement('w:pPr')
pb8r = OxmlElement('w:r')
pb8rPr = OxmlElement('w:rPr')
br8 = OxmlElement('w:br')
br8.set(qn('w:type'), 'page')
pb8r.append(pb8rPr)
pb8r.append(br8)
pb8.append(pb8Pr)
pb8.append(pb8r)
c8.append(pb8)

c8 += [
    N('Chapitre 8 : Sprint 5 — Finalisation, tableau de bord avancé, chatbot et qualité'),
    H1('Chapitre 8 : Sprint 5 — Finalisation, tableau de bord avancé, chatbot et qualité'),
    H2('1. Introduction'),
    N("Ce chapitre présente le cinquième et dernier sprint de notre projet. À ce stade, l'ensemble des fonctionnalités métier a été développé : parcours client, backoffice, confirmation des commandes, réclamations, livraisons mobiles et transit. Ce sprint concentre les efforts sur la stabilisation de la solution, la construction des tableaux de bord avancés, l'intégration du chatbot administrateur basé sur n8n, la génération des exports PDF et Excel, le renforcement de la sécurité et la préparation des livrables finaux pour la soutenance."),
    N("Ce sprint marque également la finalisation des fonctionnalités de suivi client avancées et la mise en place des notifications automatiques par email et par push mobile pour les événements critiques (changement de statut, nouvelle réclamation, livraison imminente)."),
    H2('2. Objectif et périmètre du Sprint 5'),
    N("Le Sprint 5 s'est déroulé du 27/04/2026 au 23/05/2026. Son objectif est de transformer la solution en une version finale stable, démontrable et documentée. Ce sprint regroupe la consolidation des tableaux de bord, l'intégration du chatbot, la finalisation des interfaces mobile et web, les tests de non-régression et la préparation de la soutenance."),
    H2('3. Backlog du Sprint 5'),
    N('Le tableau suivant présente les principales histoires utilisateurs traitées durant le Sprint 5.'),
    CT('Tableau  : Backlog du Sprint 5'),
]
c8.append(make_table(
    ['ID', 'Rôle', 'User Story', 'Endpoints / Modules', 'Resp.', 'Estim.'],
    [
        ['US1', 'Admin', 'Consulter le tableau de bord avancé (KPI globaux, sparklines, top livreurs, top zones)', '/api/admin/dashboard, /api/dashboard/advanced', 'Melek', '4 j'],
        ['US2', 'Admin', 'Générer des exports PDF et Excel (commandes, livraisons, réclamations)', '/api/admin/exports/pdf, /api/admin/exports/excel', 'Tawfik', '3 j'],
        ['US3', 'Admin', 'Interagir avec le chatbot pour interroger les données métier (n8n + LLM)', '/api/chatbot/ask, workflow n8n', 'Melek', '4 j'],
        ['US4', 'Admin', 'Gérer les paramètres de la plateforme et les configurations de sécurité', '/api/admin/settings, /api/admin/security', 'Tawfik', '2 j'],
        ['US5', 'Livreur', 'Recevoir des notifications push pour les nouvelles livraisons dans sa zone', 'FCM / APNs + /api/notifications', 'Melek', '3 j'],
        ['US6', 'Client', 'Recevoir des notifications push pour les changements de statut de sa commande', 'FCM / APNs + SignalR StatutCommandeChange', 'Tawfik', '2 j'],
        ['US7', 'Client', 'Consulter l\'historique complet de sa commande (OrderHistoryScreen)', '/api/tracking, timeline événements', 'Melek', '2 j'],
        ['US8', 'Tous', 'Tests de non-régression, correction des anomalies identifiées', 'Ensemble des endpoints', 'Melek/Tawfik', '4 j'],
        ['US9', 'Tous', 'Documentation technique et préparation des livrables de soutenance', 'README, Swagger, rapport', 'Melek/Tawfik', '3 j'],
    ],
    doc
))

c8 += [
    H2('4. Analyse fonctionnelle du Sprint 5'),
    N("L'analyse fonctionnelle de ce sprint porte principalement sur les fonctionnalités transverses : tableaux de bord agrégés, chatbot conversationnel et notifications automatiques. Ces modules consomment les données produites par les sprints précédents et les présentent sous forme synthétique à l'administrateur."),
    H3('4.1 Diagramme de cas d\'utilisation du Sprint 5'),
    N('[Insérer ici le diagramme de cas d\'utilisation du Sprint 5]'),
    CF("Figure  : Diagramme de cas d'utilisation du Sprint 5"),
    N("Ce diagramme met en évidence les fonctionnalités finalisées du projet. L'administrateur accède au tableau de bord avancé, génère des exports, interagit avec le chatbot et configure les paramètres de la plateforme. Les livreurs et les clients reçoivent des notifications automatiques pour les événements critiques. Le client consulte l'historique complet de ses commandes."),
    H3('4.2 Diagramme de séquence du chatbot administrateur'),
    N("Ce diagramme illustre le fonctionnement du chatbot administrateur. L'administrateur saisit une question en langage naturel dans l'interface React (ex. : « Quels sont les livreurs avec le plus de retours ce mois ? »). La Web API transmet la requête au workflow n8n via une requête HTTP. Le workflow n8n exécute la logique métier : interrogation de la base SQL Server (via les endpoints de la Web API), traitement par un modèle de langage (LLM) si configuré, et retour de la réponse structurée. La réponse est affichée dans l'interface conversationnelle du chatbot. L'historique des échanges est conservé en session pour permettre des questions de suivi contextuelles."),
    N('[Insérer ici le diagramme de séquence — Chatbot administrateur]'),
    CF("Figure  : Diagramme de séquence — Chatbot administrateur (n8n)"),
    H2('5. Réalisation du Sprint 5'),
    N("La réalisation de ce sprint finalise toutes les interfaces et stabilise l'ensemble de la solution. Les composants React consomment les endpoints de la Web API via Axios, tandis que les traitements métier sont centralisés dans la Web API ASP.NET Core."),
    H3('5.1 Interface tableau de bord avancé'),
    N("Le tableau de bord avancé présente une vue synthétique et interactive de l'activité de la plateforme. Il regroupe les indicateurs clés de performance (KPI) : nombre de commandes par statut, chiffre d'affaires du jour/semaine/mois, taux de livraison global, nombre de réclamations ouvertes, livreurs actifs en temps réel. Des graphiques sparkline affichent l'évolution sur 7 jours. Un classement des meilleurs livreurs (taux de réussite, volume) et une analyse des zones à forte activité complètent le tableau de bord. Les données sont actualisées toutes les 5 minutes."),
    N('[Capture à insérer : Interface tableau de bord avancé]'),
    CF("Figure  : Interface tableau de bord avancé"),
    H3('5.2 Interface statistiques livreur avancées'),
    N("L'écran de statistiques livreur (livreur_stats_screen) présente les indicateurs de performance individuels sur trois périodes (jour, semaine, mois) : nombre de livraisons effectuées, taux de réussite, montant total encaissé, répartition par statut (livré, retourné, reporté, dépôt), tendance 7 jours (sparkline) et rang parmi les livreurs actifs. Le livreur peut également soumettre sa caisse quotidienne au dépôt directement depuis cet écran."),
    N('[Capture à insérer : Interface statistiques livreur avancées]'),
    CF("Figure  : Interface statistiques livreur avancées"),
    H3('5.3 Interface exports PDF et Excel'),
    N("Cette interface permet à l'administrateur de générer des fichiers exportables pour l'analyse des données métier. Les exports disponibles couvrent les commandes (par statut, par période, par livreur), les livraisons (COD, retours, reports), les réclamations (par motif, par statut, par confirmateur) et les performances globales. Les fichiers PDF sont générés côté backend et téléchargés directement. Les exports Excel permettent des analyses complémentaires dans des outils tiers."),
    N('[Capture à insérer : Interface exports PDF et Excel]'),
    CF("Figure  : Interface exports PDF et Excel"),
    H3('5.4 Interface chatbot administrateur'),
    N("Le chatbot aide l'administrateur à interroger les données de la plateforme en langage naturel. Il est accessible depuis un panneau latéral dans l'interface React. Exemples de questions traitées : « Quelles réclamations sont ouvertes depuis plus de 3 jours ? », « Quel est le taux de livraison de la semaine ? », « Quels articles sont les plus retournés ? ». Le chatbot utilise le workflow n8n qui interroge les endpoints de la Web API et structure la réponse. Si un modèle de langage est configuré, les réponses sont formulées en français naturel."),
    N('[Capture à insérer : Interface chatbot administrateur]'),
    CF("Figure  : Interface chatbot administrateur (n8n)"),
    H3('5.5 Interface historique commande client (OrderHistoryScreen)'),
    N("L'écran OrderHistoryScreen permet au client de consulter la timeline complète de sa commande : tous les événements horodatés (création, confirmation, affectation livreur, tentatives, livraison, retour), les informations du livreur, le montant facturé et les coordonnées GPS de la livraison si disponibles. Cette interface est accessible depuis l'écran de suivi client en cliquant sur « Voir l'historique complet »."),
    N('[Capture à insérer : Interface historique commande client]'),
    CF("Figure  : Interface historique commande client — OrderHistoryScreen"),
    H3('5.6 Interface paramètres et sécurité'),
    N("Cette interface regroupe les paramètres de configuration de la plateforme : gestion des délais de session JWT, paramétrage des zones de livraison par gouvernorat, configuration des notifications push (FCM/APNs), gestion des clés d'API externes (Konnect, OSRM, n8n) et contrôle des fonctionnalités actives par rôle. Elle permet également de déclencher des synchronisations manuelles avec Sage X3."),
    N('[Capture à insérer : Interface paramètres et sécurité]'),
    CF("Figure  : Interface paramètres et sécurité"),
    H3('5.7 Scénario final de démonstration'),
    N("Ce scénario présente la continuité entre les trois composantes de la solution afin de valider l'intégration globale. Le parcours complet démontré est le suivant : un visiteur consulte le catalogue et passe une commande avec paiement Konnect (React). Le confirmateur reçoit la réclamation en temps réel via SignalR, confirme le BC et le transforme en BL (React/Flutter). Le livreur prend en charge la livraison, démarre la diffusion GPS et livre la commande (Flutter). Le client suit la progression en temps réel sur la carte live et reçoit la notification de livraison (Flutter). L'administrateur consulte les KPI mis à jour sur le tableau de bord avancé et interroge le chatbot (React)."),
    N('[Capture à insérer : Scénario final de démonstration]'),
    CF("Figure  : Scénario final de démonstration — intégration bout en bout"),
    H2('6. Tests et validation du Sprint 5'),
    N("Les tests de validation du Sprint 5 couvrent les fonctionnalités finalisées et vérifient la non-régression de l'ensemble de la solution."),
    CT('Tableau  : Tests fonctionnels du Sprint 5'),
]
c8.append(make_table(
    ['Test', 'Objectif', 'Résultat attendu', 'Statut'],
    [
        ['KPI tableau de bord', 'Vérifier la cohérence des indicateurs affichés.', 'Les KPI correspondent aux données de la base SQL Server.', 'À valider'],
        ['Export PDF commandes', 'Vérifier la génération du fichier PDF.', 'Le fichier est téléchargé avec les données correctes.', 'À valider'],
        ['Export Excel livraisons', 'Vérifier la génération du fichier Excel.', 'Le fichier contient toutes les colonnes et données attendues.', 'À valider'],
        ['Chatbot — question métier', 'Vérifier la réponse du chatbot à une question structurée.', 'La réponse est cohérente avec les données de la base.', 'À valider'],
        ['Notification push livreur', 'Vérifier la réception d\'une notification pour une nouvelle livraison.', 'La notification est reçue sur l\'appareil mobile du livreur.', 'À valider'],
        ['Notification push client', 'Vérifier la notification de changement de statut.', 'Le client reçoit la notification avec le bon statut.', 'À valider'],
        ['OrderHistoryScreen', 'Vérifier l\'affichage de la timeline complète.', 'Tous les événements sont affichés dans l\'ordre chronologique.', 'À valider'],
        ['Non-régression global', 'Vérifier que les fonctionnalités des sprints précédents restent opérationnelles.', 'Aucune régression détectée sur les flux critiques.', 'À valider'],
        ['Scénario de démonstration', 'Valider l\'intégration bout en bout de la solution.', 'Le parcours complet fonctionne sans erreur entre les trois composantes.', 'À valider'],
    ],
    doc
))

c8 += [
    H2('7. Conclusion'),
    N("Ce dernier sprint a permis de stabiliser la solution, de renforcer la qualité globale et de préparer les livrables finaux. Le tableau de bord avancé fournit à l'administrateur une vision complète et synthétique de l'activité de la plateforme. Le chatbot n8n apporte une interface conversationnelle pour interroger les données métier. Les exports PDF et Excel facilitent l'exploitation des données en dehors de la plateforme. Les notifications automatiques renforcent la réactivité des utilisateurs aux événements critiques. L'ensemble de la solution est désormais stable, testée et prête pour la démonstration finale."),
    BR(),
]

# ─── Insert all content before anchor ────────────────────────────────────────
all_new = c6 + c7 + c8
ins(anchor, all_new)

doc.save(DEST)
print(f"\nDone! Saved to: {DEST}")
print(f"Total body children after: {len(list(doc.element.body))}")
EOF
