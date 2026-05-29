#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_final.py — Génère le Rapport PFE Final en modifiant le document source.
"""

import shutil
import copy
import lxml.etree as etree
from docx import Document
from docx.oxml.ns import qn, nsmap
from docx.oxml import OxmlElement

# ─────────────────────────────────────────────
# CHEMINS
# ─────────────────────────────────────────────
SRC  = '/root/.claude/uploads/4e52a938-3f7a-42c4-b32b-fe863aa6aef6/69983a6d-Rapport_PFE_V1_1_1.docx'
DEST = '/home/user/PROJET-PFE/Rapport/Rapport_PFE_Final_Modifie.docx'

# ─────────────────────────────────────────────
# HELPERS — XML
# ─────────────────────────────────────────────
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

def w(tag):
    return '{%s}%s' % (W, tag)

def make_el(tag, **attrs):
    el = OxmlElement(tag)
    for k, v in attrs.items():
        el.set(qn(k), str(v))
    return el

def get_text(para_el):
    return ''.join(t.text or '' for t in para_el.findall('.//' + qn('w:t')))

# ─────────────────────────────────────────────
# HELPER — changer le texte d'un paragraphe
# ─────────────────────────────────────────────
def set_para_text(para_el, new_text):
    """Efface tous les runs et met new_text dans le premier run."""
    runs = para_el.findall('.//' + qn('w:r'))
    if not runs:
        # Créer un run
        r = OxmlElement('w:r')
        t = OxmlElement('w:t')
        t.text = new_text
        r.append(t)
        para_el.append(r)
        return
    # Mettre le texte dans le premier run
    first_run = runs[0]
    t_el = first_run.find(qn('w:t'))
    if t_el is None:
        t_el = OxmlElement('w:t')
        first_run.append(t_el)
    t_el.text = new_text
    if new_text and (' ' == new_text[0] or ' ' == new_text[-1]):
        t_el.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    # Effacer les autres runs
    for r in runs[1:]:
        para_el.remove(r)

# ─────────────────────────────────────────────
# HELPER — créer un paragraphe avec style donné
# ─────────────────────────────────────────────
def make_para(style_id, text, bold=False, sz=None):
    """Crée un w:p avec style et texte."""
    p = OxmlElement('w:p')
    pPr = OxmlElement('w:pPr')
    pStyle = OxmlElement('w:pStyle')
    pStyle.set(qn('w:val'), style_id)
    pPr.append(pStyle)
    p.append(pPr)

    if text:
        r = OxmlElement('w:r')
        rPr = OxmlElement('w:rPr')
        if bold:
            rPr.append(OxmlElement('w:b'))
            rPr.append(OxmlElement('w:bCs'))
        if sz:
            sz_el = OxmlElement('w:sz')
            sz_el.set(qn('w:val'), str(sz))
            szCs_el = OxmlElement('w:szCs')
            szCs_el.set(qn('w:val'), str(sz))
            rPr.append(sz_el)
            rPr.append(szCs_el)
        if len(rPr):
            r.append(rPr)
        t = OxmlElement('w:t')
        t.text = text
        if text and (' ' == text[0] or ' ' == text[-1]):
            t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
        r.append(t)
        p.append(r)
    return p

def make_normal(text):
    return make_para('Normal', text)

def make_h1(text):
    return make_para('Titre1', text)

def make_h2(text):
    return make_para('Titre2', text)

def make_h3(text):
    return make_para('Titre3', text)

def make_h4(text):
    return make_para('Titre4', text)

def make_caption_figure(text):
    return make_para('CaptionFigure', text)

def make_caption_tableau(text):
    return make_para('CaptionTableau', text)

def make_page_break():
    """Crée un paragraphe avec saut de page."""
    p = OxmlElement('w:p')
    pPr = OxmlElement('w:pPr')
    p.append(pPr)
    r = OxmlElement('w:r')
    br = OxmlElement('w:br')
    br.set(qn('w:type'), 'page')
    r.append(br)
    p.append(r)
    return p

# ─────────────────────────────────────────────
# HELPER — créer un tableau style Sprint 1
# ─────────────────────────────────────────────
def make_table(headers, rows):
    """Crée un w:tbl avec le style exact du Sprint 1."""
    tbl = OxmlElement('w:tbl')

    # tblPr
    tblPr = OxmlElement('w:tblPr')
    # tblW
    tblW = OxmlElement('w:tblW')
    tblW.set(qn('w:w'), '9360')
    tblW.set(qn('w:type'), 'dxa')
    tblPr.append(tblW)
    # tblBorders
    tblBorders = OxmlElement('w:tblBorders')
    for side in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
        el = OxmlElement('w:' + side)
        el.set(qn('w:val'), 'single')
        el.set(qn('w:sz'), '4')
        el.set(qn('w:space'), '0')
        el.set(qn('w:color'), 'auto')
        tblBorders.append(el)
    tblPr.append(tblBorders)
    # tblCellMar
    tblCellMar = OxmlElement('w:tblCellMar')
    left_m = OxmlElement('w:left')
    left_m.set(qn('w:w'), '10')
    left_m.set(qn('w:type'), 'dxa')
    right_m = OxmlElement('w:right')
    right_m.set(qn('w:w'), '10')
    right_m.set(qn('w:type'), 'dxa')
    tblCellMar.append(left_m)
    tblCellMar.append(right_m)
    tblPr.append(tblCellMar)
    # tblLook
    tblLook = OxmlElement('w:tblLook')
    tblLook.set(qn('w:val'), '04A0')
    tblLook.set(qn('w:firstRow'), '1')
    tblLook.set(qn('w:lastRow'), '0')
    tblLook.set(qn('w:firstColumn'), '1')
    tblLook.set(qn('w:lastColumn'), '0')
    tblLook.set(qn('w:noHBand'), '0')
    tblLook.set(qn('w:noVBand'), '1')
    tblPr.append(tblLook)
    tbl.append(tblPr)

    def make_cell(text, is_header=False):
        tc = OxmlElement('w:tc')
        tcPr = OxmlElement('w:tcPr')
        # tcBorders
        tcBorders = OxmlElement('w:tcBorders')
        for side in ['top', 'left', 'bottom', 'right']:
            el = OxmlElement('w:' + side)
            el.set(qn('w:val'), 'single')
            el.set(qn('w:sz'), '4')
            el.set(qn('w:space'), '0')
            el.set(qn('w:color'), '808080')
            tcBorders.append(el)
        tcPr.append(tcBorders)
        # tcMar
        tcMar = OxmlElement('w:tcMar')
        for side, val in [('top', '80'), ('left', '120'), ('bottom', '80'), ('right', '120')]:
            el = OxmlElement('w:' + side)
            el.set(qn('w:w'), val)
            el.set(qn('w:type'), 'dxa')
            tcMar.append(el)
        tcPr.append(tcMar)
        # vAlign
        vAlign = OxmlElement('w:vAlign')
        vAlign.set(qn('w:val'), 'center')
        tcPr.append(vAlign)
        tc.append(tcPr)

        # Paragraph in cell
        p = OxmlElement('w:p')
        r = OxmlElement('w:r')
        rPr = OxmlElement('w:rPr')
        if is_header:
            rPr.append(OxmlElement('w:b'))
            rPr.append(OxmlElement('w:bCs'))
        sz_el = OxmlElement('w:sz')
        sz_el.set(qn('w:val'), '22')
        szCs_el = OxmlElement('w:szCs')
        szCs_el.set(qn('w:val'), '22')
        rPr.append(sz_el)
        rPr.append(szCs_el)
        r.append(rPr)
        t = OxmlElement('w:t')
        t.text = text
        if text and (' ' == text[0] or ' ' == text[-1]):
            t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
        r.append(t)
        p.append(r)
        tc.append(p)
        return tc

    def make_row(cells_text, is_header=False):
        tr = OxmlElement('w:tr')
        for text in cells_text:
            tr.append(make_cell(text, is_header))
        return tr

    # Header row
    tbl.append(make_row(headers, is_header=True))
    # Data rows
    for row in rows:
        tbl.append(make_row(row, is_header=False))

    return tbl

# ─────────────────────────────────────────────
# ÉTAPE 1 — Copie source → destination
# ─────────────────────────────────────────────
print("Étape 1: Copie du fichier source...")
shutil.copy2(SRC, DEST)
print(f"  Copié vers {DEST}")

# ─────────────────────────────────────────────
# Ouvrir le document copié
# ─────────────────────────────────────────────
doc = Document(DEST)
body = doc.element.body

# ─────────────────────────────────────────────
# ÉTAPE 2 — Changer les titres des chapitres
# ─────────────────────────────────────────────
print("Étape 2: Changement des titres des chapitres...")

TITLE_MAP = {
    'Chapitre 5 : Sprint 2': 'Chapitre 5 : Sprint 2 — Parcours client, catalogue, panier et commande en ligne',
    'Chapitre 6 : Sprint 3': 'Chapitre 6 : Sprint 3 — Gestion commerciale, espace vendeur, B2B, devis et intégration Sage X3',
    'Chapitre 7 : Sprint 4': 'Chapitre 7 : Sprint 4 — Logistique COD, confirmation, livraison, réclamations et transit inter-dépôts',
    'Chapitre 8 : Sprint 5': 'Chapitre 8 : Sprint 5 — Pilotage, tableaux de bord, chatbot et aide à la décision',
}

for child in list(body):
    if child.tag != qn('w:p'):
        continue
    text = get_text(child)
    for prefix, new_title in TITLE_MAP.items():
        if text.startswith(prefix) and text != new_title:
            set_para_text(child, new_title)
            print(f"  Remplacé: {text[:60]} → {new_title[:60]}")
            break

# ─────────────────────────────────────────────
# ÉTAPE 3 — Ajouter AJAX, StarUML, Mapbox avant 5.10
# ─────────────────────────────────────────────
print("Étape 3: Ajout AJAX, StarUML, Mapbox...")

AJAX_TEXT = (
    "AJAX : mécanisme d'échange asynchrone utilisé dans l'interface web React pour communiquer "
    "avec la Web API sans rechargement complet de la page. Il permet d'envoyer des requêtes HTTP "
    "en arrière-plan et de mettre à jour dynamiquement les données affichées à l'utilisateur."
)
STARUML_TEXT = (
    "StarUML : outil de conception UML utilisé pour modéliser les diagrammes de cas d'utilisation, "
    "de classes, de séquences et d'activités du projet. Il a permis de formaliser l'architecture "
    "fonctionnelle de la solution avant l'implémentation."
)
MAPBOX_TEXT = (
    "Mapbox : plateforme de cartographie utilisée pour l'affichage des cartes interactives et la "
    "géolocalisation dans l'application mobile. Elle fournit les tuiles cartographiques et les "
    "services de navigation utilisés pour le suivi des livraisons et la couverture des dépôts."
)

# Trouver l'ancre 5.10 Automatisation et chatbot
anchor_510 = None
children_list = list(body)
for i, child in enumerate(children_list):
    if child.tag != qn('w:p'):
        continue
    style = child.find('.//' + qn('w:pStyle'))
    style_val = style.get(qn('w:val'), '') if style is not None else ''
    text = get_text(child)
    if style_val == 'Titre3' and '5.10' in text and 'Automatisation' in text:
        anchor_510 = child
        print(f"  Ancre 5.10 trouvée: {text[:60]}")
        break

if anchor_510 is not None:
    # Insérer les 3 paragraphes AVANT 5.10
    for para_text in [AJAX_TEXT, STARUML_TEXT, MAPBOX_TEXT]:
        p = make_normal(para_text)
        anchor_510.addprevious(p)
    print("  AJAX, StarUML, Mapbox insérés.")
else:
    print("  ATTENTION: Ancre 5.10 non trouvée!")

# ─────────────────────────────────────────────
# ÉTAPE 4 — Reconstruire Ch6, Ch7, Ch8
# ─────────────────────────────────────────────
print("Étape 4: Suppression et reconstruction Ch6/7/8...")

# Re-lire la liste des children (modifiée par les insertions étape 3)
children_list = list(body)

# Trouver index du premier enfant du Ch6 (Titre1 contenant "Chapitre 6")
idx_ch6 = None
for i, child in enumerate(children_list):
    if child.tag != qn('w:p'):
        continue
    style = child.find('.//' + qn('w:pStyle'))
    style_val = style.get(qn('w:val'), '') if style is not None else ''
    text = get_text(child)
    if style_val == 'Titre1' and 'Chapitre 6' in text:
        idx_ch6 = i
        print(f"  Ch6 Titre1 trouvé à l'index {i}: {text[:60]}")
        break

# Trouver index de "Conclusion générale"
idx_conclusion = None
for i, child in enumerate(children_list):
    if child.tag != qn('w:p'):
        continue
    style = child.find('.//' + qn('w:pStyle'))
    style_val = style.get(qn('w:val'), '') if style is not None else ''
    text = get_text(child)
    if style_val == 'Titre1' and 'Conclusion générale' in text:
        idx_conclusion = i
        print(f"  Conclusion générale trouvée à l'index {i}")
        break

if idx_ch6 is None or idx_conclusion is None:
    raise RuntimeError("Impossible de trouver les ancres Ch6 ou Conclusion générale!")

# Supprimer tout entre Ch6 (inclus) et Conclusion (non inclus)
# Aussi les paragraphes 'page de chapitre' avant Ch6 (le br para)
# Le para avec br est juste avant Ch6: children_list[idx_ch6 - 1]
# On va aussi le supprimer si c'est un Normal vide avec br
start_del = idx_ch6
para_before = children_list[idx_ch6 - 1]
if para_before.tag == qn('w:p'):
    br_found = para_before.find('.//' + qn('w:br'))
    text_before = get_text(para_before)
    if br_found is not None and not text_before.strip():
        start_del = idx_ch6 - 1
        print(f"  Inclusion du para break avant Ch6 à l'index {idx_ch6 - 1}")

# Éléments à supprimer
to_delete = children_list[start_del:idx_conclusion]
print(f"  Suppression de {len(to_delete)} éléments (index {start_del} à {idx_conclusion - 1})")

# Ancre = children_list[idx_conclusion] — on insère avant elle
anchor_conclusion = children_list[idx_conclusion]

for el in to_delete:
    body.remove(el)

# ─────────────────────────────────────────────
# Fonctions pour construire les éléments de contenu
# ─────────────────────────────────────────────
def insert_before(anchor, *elements):
    """Insère les éléments avant l'ancre."""
    for el in elements:
        anchor.addprevious(el)

def build_chapter_intro(anchor, page_text, h1_text, intro_h2, intro_n):
    """Insère la page de chapitre + H1 + Introduction."""
    # Page break + page de chapitre
    insert_before(anchor,
        make_page_break(),
        make_normal(page_text),
        make_h1(h1_text),
        make_h2(intro_h2),
        make_normal(intro_n),
    )

# ─────────────────────────────────────────────
# CHAPITRE 6
# ─────────────────────────────────────────────
print("  Construction Chapitre 6...")

CH6_PAGE = "Chapitre 6 : Sprint 3 — Gestion commerciale, espace vendeur, B2B, devis et intégration Sage X3"
CH6_H1 = CH6_PAGE

def build_ch6(anchor):
    def ins(*els):
        for el in els:
            anchor.addprevious(el)

    # Page + H1
    ins(
        make_page_break(),
        make_normal(CH6_PAGE),
        make_h1(CH6_H1),
    )

    # H2 1. Introduction
    ins(
        make_h2("1. Introduction"),
        make_normal("Ce chapitre présente le troisième sprint de notre solution. Il se concentre sur la gestion commerciale avancée de la plateforme. Il couvre la gestion des produits, des images avec Cloudinary, des stocks et des dépôts, ainsi que la synchronisation bidirectionnelle avec Sage X3 pour les articles, les catalogues, les dépôts et les stocks. Il inclut également la gestion des clients B2C et B2B, les remises B2B, l'espace vendeur avec création de commande, le module de devis B2B complet, la carte de couverture des dépôts, la homepage administrable et les indicateurs commerciaux initiaux."),
    )

    # H2 2. Objectif
    ins(
        make_h2("2. Objectif et périmètre du Sprint 3"),
        make_normal("Le Sprint 3 s'est déroulé du 16/03/2026 au 04/04/2026. Son objectif est de construire toute la couche de gestion commerciale de la solution : administration des articles et des stocks, synchronisation avec Sage X3, gestion des clients B2B et de leurs remises, espace vendeur, module de devis B2B avec workflow de validation, et paramétrage général de la plateforme."),
    )

    # H2 3. Backlog
    ins(
        make_h2("3. Backlog du Sprint 3"),
        make_normal("Le tableau suivant présente les histoires utilisateurs traitées durant ce sprint."),
        make_caption_tableau("Tableau  : Backlog du Sprint 3"),
        make_table(
            ['ID', 'User Story', 'Rôle', 'Endpoints / Modules', 'Resp.', 'Estim.'],
            [
                ['US3.1', 'Gérer les produits (CRUD, images Cloudinary, activation/désactivation)', 'Admin', '/api/admin/articles', 'Melek', '4 j'],
                ['US3.2', 'Gérer les images produits via Cloudinary', 'Admin', '/api/admin/articles/{id}/images, Cloudinary API', 'Melek', '2 j'],
                ['US3.3', 'Synchroniser les articles depuis Sage X3', 'Admin', '/api/articles/sync-sage', 'Tawfik', '3 j'],
                ['US3.4', 'Synchroniser les catalogues depuis Sage X3', 'Admin', '/api/articles/sync-catalogues', 'Tawfik', '2 j'],
                ['US3.5', 'Synchroniser les dépôts depuis Sage X3', 'Admin', '/api/admin/depots/sync-sage', 'Melek', '2 j'],
                ['US3.6', 'Synchroniser les stocks depuis Sage X3', 'Admin', '/api/admin/stocks/sync-sage', 'Tawfik', '2 j'],
                ['US3.7', 'Gérer les clients B2C et B2B (CRUD, type de compte)', 'Admin', '/api/admin/clients', 'Melek', '3 j'],
                ['US3.8', 'Gérer les remises B2B par client et par article', 'Admin', '/api/admin/b2b/remises', 'Tawfik', '3 j'],
                ['US3.9', 'Accéder au catalogue vendeur et consulter les commandes', 'Vendeur', '/api/vendeur/catalogue, /api/vendeur/commandes', 'Melek', '3 j'],
                ['US3.10', "Créer une commande pour un client depuis l'espace vendeur", 'Vendeur', '/api/vendeur/commandes', 'Tawfik', '3 j'],
                ['US3.11', 'Créer et soumettre un devis B2B depuis le panier', 'Client B2B', '/api/devis', 'Melek', '4 j'],
                ['US3.12', 'Gérer les devis (admin, vendeur, confirmateur) : accepter, refuser, négocier', 'Admin/Confirm.', '/api/admin/devis, /api/confirmateur/devis', 'Tawfik', '4 j'],
                ['US3.13', 'Gérer les zones de dépôt et la carte de couverture', 'Admin', '/api/admin/depots, /api/zones', 'Melek', '2 j'],
                ['US3.14', 'Configurer la homepage administrable', 'Admin', '/api/admin/homepage', 'Tawfik', '2 j'],
                ['US3.15', 'Gérer les paramètres de la plateforme et le thème', 'Admin', '/api/admin/settings', 'Melek', '2 j'],
                ['US3.16', 'Consulter les indicateurs commerciaux initiaux', 'Admin', '/api/admin/dashboard', 'Tawfik', '2 j'],
            ]
        ),
    )

    # H2 4. Analyse
    ins(
        make_h2("4. Analyse et conception du Sprint 3"),
        make_normal("L'analyse de ce sprint précise les interactions entre les acteurs et les modules de gestion commerciale. Elle couvre la synchronisation Sage X3, le workflow devis B2B et la structure des entités produits, stocks et dépôts."),
        make_h3("4.1 Diagramme de cas d'utilisation du Sprint 3"),
        make_normal("[Insérer ici le diagramme de cas d'utilisation du Sprint 3]"),
        make_caption_figure("Figure  : Diagramme de cas d'utilisation du Sprint 3"),
        make_normal("Ce diagramme présente les interactions de l'administrateur (gestion produits, stocks, dépôts, Sage X3, clients, remises, homepage, paramètres), du vendeur (catalogue, commande client) et du client B2B (devis, négociation)."),
        make_h3("4.2 Diagrammes de séquence du Sprint 3"),
        make_h4("4.2.1 Synchronisation Sage X3"),
        make_normal("Ce diagramme illustre la synchronisation des articles depuis Sage X3. L'administrateur déclenche la synchronisation (POST /api/articles/sync-sage). La Web API interroge l'API Sage X3, récupère les articles, les prix et les stocks, effectue un UPSERT dans les tables F_ARTICLE, F_TARIF et F_STOCK, puis retourne un rapport de synchronisation. Le même mécanisme s'applique aux catalogues, aux dépôts et aux stocks."),
        make_normal("[Insérer ici le diagramme de séquence — Synchronisation Sage X3]"),
        make_caption_figure("Figure  : Diagramme de séquence — Synchronisation Sage X3"),
        make_h4("4.2.2 Création et validation d'un devis B2B"),
        make_normal("Ce diagramme décrit le workflow complet du devis B2B. Le client professionnel soumet une demande de devis depuis son panier (POST /api/devis). La Web API enregistre le devis dans F_DEVIS_ENTETE et F_DEVIS_LIGNE, notifie l'équipe commerciale. L'administrateur ou le confirmateur consulte le devis, peut négocier (PUT /api/admin/devis/{id}/negocier), accepter (PUT /accepter) ou refuser (PUT /refuser). Si accepté, le client peut convertir le devis en commande (POST /api/devis/{id}/convertir). Un bon d'échange peut être généré si nécessaire."),
        make_normal("[Insérer ici le diagramme de séquence — Devis B2B]"),
        make_caption_figure("Figure  : Diagramme de séquence — Création et validation d'un devis B2B"),
        make_h4("4.2.3 Création de commande vendeur"),
        make_normal("Ce diagramme présente la création d'une commande par le vendeur pour le compte d'un client. Le vendeur sélectionne le client depuis l'espace vendeur, ajoute les articles du catalogue, applique les remises B2B si applicable, et valide la commande (POST /api/vendeur/commandes). La Web API crée le bon de commande dans F_DOCENTETE et F_DOCLIGNE, associe le client et retourne la référence du BC créé."),
        make_normal("[Insérer ici le diagramme de séquence — Commande vendeur]"),
        make_caption_figure("Figure  : Diagramme de séquence — Création de commande vendeur"),
    )

    # H2 5. Réalisation
    ins(
        make_h2("5. Réalisation du Sprint 3"),
        make_normal("La réalisation du Sprint 3 concrétise la gestion commerciale avancée de la plateforme. Les interfaces React consomment les endpoints de la Web API via Axios. La synchronisation Sage X3 est assurée par des services dédiés côté ASP.NET Core."),
        make_h3("5.1 Interface de gestion des produits"),
        make_normal("Cette interface permet à l'administrateur de consulter, créer, modifier et désactiver les produits du catalogue. Elle affiche les informations Sage (code article, désignation, prix, stock) ainsi que les images associées hébergées sur Cloudinary. L'administrateur peut déclencher la synchronisation manuelle avec Sage X3 depuis cette interface."),
        make_normal("[Insérer ici la capture de l'interface de gestion des produits]"),
        make_caption_figure("Figure  : Interface de gestion des produits"),
        make_h3("5.2 Interface de gestion des images produits"),
        make_normal("Cette interface permet d'associer des images aux produits via le service Cloudinary. L'administrateur peut télécharger une ou plusieurs images par produit, définir l'image principale et supprimer les images existantes. Les images sont stockées sur Cloudinary et référencées dans la base de données locale."),
        make_normal("[Insérer ici la capture de l'interface de gestion des images produits]"),
        make_caption_figure("Figure  : Interface de gestion des images produits"),
        make_h3("5.3 Interface de synchronisation Sage X3"),
        make_normal("Cette interface permet à l'administrateur de déclencher et de suivre les synchronisations avec Sage X3. Elle affiche le statut de chaque synchronisation (articles, catalogues, dépôts, stocks), la date de la dernière exécution, le nombre d'enregistrements traités et les éventuelles erreurs. Les synchronisations peuvent être déclenchées manuellement ou programmées via Hangfire."),
        make_normal("[Insérer ici la capture de l'interface de synchronisation Sage X3]"),
        make_caption_figure("Figure  : Interface de synchronisation Sage X3"),
        make_h3("5.4 Interface de gestion des stocks et des dépôts"),
        make_normal("Cette interface présente les quantités disponibles par article et par dépôt. Elle permet de surveiller les niveaux de stock, de gérer les dépôts (nom, gouvernorat, délégation, coordonnées GPS) et d'afficher la carte de couverture des zones de livraison. Les stocks sont synchronisés avec Sage X3."),
        make_normal("[Insérer ici la capture de l'interface de gestion des stocks et des dépôts]"),
        make_caption_figure("Figure  : Interface de gestion des stocks et des dépôts"),
        make_h3("5.5 Interface de gestion des clients B2B"),
        make_normal("Cette interface permet à l'administrateur de gérer les comptes clients professionnels, de définir leur type (B2C/B2B), d'attribuer des remises personnalisées par article ou par famille d'articles et de consulter leur historique de commandes et de devis."),
        make_normal("[Insérer ici la capture de l'interface de gestion des clients B2B]"),
        make_caption_figure("Figure  : Interface de gestion des clients B2B"),
        make_h3("5.6 Interface de l'espace vendeur"),
        make_normal("L'espace vendeur permet au vendeur de consulter le catalogue des produits, de rechercher des clients, de créer des commandes pour leur compte et de suivre les commandes en cours. La création de commande applique automatiquement les remises B2B si le client est de type professionnel."),
        make_normal("[Insérer ici la capture de l'interface de l'espace vendeur]"),
        make_caption_figure("Figure  : Interface de l'espace vendeur"),
        make_h3("5.7 Interface de gestion des devis B2B"),
        make_normal("Cette interface permet au client professionnel de soumettre une demande de devis depuis son panier, de suivre son statut (EN_ATTENTE, EN_NEGOCIATION, ACCEPTE, REFUSE, CONVERTI) et de le convertir en commande si accepté. Côté administration et confirmateur, l'interface permet de consulter les devis, de négocier les prix, d'accepter ou de refuser."),
        make_normal("[Insérer ici la capture de l'interface de gestion des devis B2B]"),
        make_caption_figure("Figure  : Interface de gestion des devis B2B"),
        make_h3("5.8 Interface de la carte de couverture des dépôts"),
        make_normal("Cette interface affiche une carte interactive des dépôts avec leurs zones de couverture géographiques. Elle permet à l'administrateur de visualiser la répartition des dépôts par gouvernorat, de définir les zones de livraison et d'identifier les zones non couvertes."),
        make_normal("[Insérer ici la capture de la carte de couverture des dépôts]"),
        make_caption_figure("Figure  : Interface de la carte de couverture des dépôts"),
        make_h3("5.9 Interface des paramètres et du thème"),
        make_normal("Cette interface regroupe les paramètres généraux de la plateforme : configuration des délais de session JWT, thème visuel (couleurs, logo), paramètres des notifications, clés d'API externes (Cloudinary, Konnect, Sage X3) et gestion des fonctionnalités actives par rôle."),
        make_normal("[Insérer ici la capture de l'interface des paramètres]"),
        make_caption_figure("Figure  : Interface des paramètres et du thème"),
        make_h3("5.10 Interface des indicateurs commerciaux initiaux"),
        make_normal("Le tableau de bord initial présente les indicateurs commerciaux essentiels : nombre de commandes par statut, chiffre d'affaires du jour et de la semaine, top produits vendus, top clients, répartition B2C/B2B et activité des vendeurs."),
        make_normal("[Insérer ici la capture des indicateurs commerciaux initiaux]"),
        make_caption_figure("Figure  : Interface des indicateurs commerciaux initiaux"),
    )

    # H2 6. Tests
    ins(
        make_h2("6. Tests et validation du Sprint 3"),
        make_normal("Les activités de test et de validation ont été réalisées progressivement au cours du sprint. À la fin de chaque fonctionnalité développée, des scénarios fonctionnels et techniques ont été exécutés pour garantir la cohérence des traitements, la fiabilité des échanges entre les couches et la stabilité globale du module commercial."),
        make_caption_tableau("Tableau  : Tests fonctionnels du Sprint 3"),
        make_table(
            ['Test', 'Objectif', 'Résultat attendu', 'Statut'],
            [
                ['Synchronisation articles Sage X3', "Vérifier l'importation des articles depuis Sage X3.", 'Les articles sont créés ou mis à jour dans la base locale.', 'À valider'],
                ['Synchronisation stocks', 'Vérifier la mise à jour des niveaux de stock.', 'Les quantités correspondent aux données Sage X3.', 'À valider'],
                ['Upload image Cloudinary', "Vérifier le téléchargement et la référence de l'image.", "L'image est stockée sur Cloudinary et liée au produit.", 'À valider'],
                ['Remise B2B', "Vérifier l'application de la remise au panier B2B.", 'Le montant remisé est calculé correctement.', 'À valider'],
                ['Commande vendeur', "Vérifier la création d'une commande depuis l'espace vendeur.", 'Un BC est créé avec les bonnes lignes et le bon client.', 'À valider'],
                ['Soumission devis B2B', 'Vérifier la création du devis depuis le panier.', 'Le devis est enregistré dans F_DEVIS_ENTETE avec le statut EN_ATTENTE.', 'À valider'],
                ['Workflow devis', 'Vérifier les transitions de statut du devis.', 'Le devis passe correctement par EN_NEGOCIATION, ACCEPTE, CONVERTI.', 'À valider'],
                ["Conversion devis en commande", "Vérifier la création d'un BC depuis un devis accepté.", 'Un BC est créé avec les lignes du devis.', 'À valider'],
            ]
        ),
    )

    # H2 7. Conclusion
    ins(
        make_h2("7. Conclusion"),
        make_normal("Ce sprint a permis de construire toute la couche de gestion commerciale de la solution. L'administrateur dispose de la gestion complète des produits, des images Cloudinary, des stocks, des dépôts et des synchronisations Sage X3. Le vendeur bénéficie d'un espace dédié pour créer des commandes pour les clients. Le module de devis B2B offre un workflow complet de négociation et de conversion. Ce sprint constitue la couche commerciale fondamentale sur laquelle s'appuient les sprints suivants."),
    )

build_ch6(anchor_conclusion)

# ─────────────────────────────────────────────
# CHAPITRE 7
# ─────────────────────────────────────────────
print("  Construction Chapitre 7...")

CH7_PAGE = "Chapitre 7 : Sprint 4 — Logistique COD, confirmation, livraison, réclamations et transit inter-dépôts"
CH7_H1 = CH7_PAGE

def build_ch7(anchor):
    def ins(*els):
        for el in els:
            anchor.addprevious(el)

    ins(
        make_page_break(),
        make_normal(CH7_PAGE),
        make_h1(CH7_H1),
        make_h2("1. Introduction"),
        make_normal("Ce chapitre présente le quatrième sprint, centré sur le workflow logistique complet de la plateforme. Il couvre le rôle de la confirmatrice dans le traitement des bons de commande (consultation, confirmation, transformation BC→BL, export vers Sage X3), le rôle du livreur (pool de livraisons, prise en charge, suivi GPS temps réel via SignalR, statuts COD, caisse), la gestion des réclamations (client et livreur) avec communication temps réel, le rôle du superviseur, et le module de transit inter-dépôts avec scan de codes-barres."),
        make_h2("2. Objectif et périmètre du Sprint 4"),
        make_normal("Le Sprint 4 s'est déroulé du 06/04/2026 au 25/04/2026. Son objectif est de finaliser le flux logistique de bout en bout : de la confirmation du bon de commande jusqu'à la livraison ou le retour, en passant par la gestion des réclamations et le transit inter-dépôts."),
        make_h2("3. Backlog du Sprint 4"),
        make_normal("Le tableau suivant présente les histoires utilisateurs traitées durant ce sprint."),
        make_caption_tableau("Tableau  : Backlog du Sprint 4"),
        make_table(
            ['ID', 'User Story', 'Rôle', 'Endpoints / Modules', 'Resp.', 'Estim.'],
            [
                ['US4.1', 'Consulter les commandes en attente de confirmation', 'Confirmatrice', '/api/confirmateur/commandes', 'Melek', '2 j'],
                ['US4.2', "Consulter le détail d'une commande et ses lignes", 'Confirmatrice', '/api/confirmateur/commandes/{piece}', 'Melek', '2 j'],
                ['US4.3', "Modifier le statut d'un bon de commande (0→3)", 'Confirmatrice', '/api/confirmateur/commandes/{piece}/status', 'Tawfik', '2 j'],
                ['US4.4', 'Transformer un BC en bon de livraison (sans doublon)', 'Confirmatrice', '/api/confirmateur/commandes/{piece}/transform-to-bl', 'Tawfik', '3 j'],
                ['US4.5', 'Exporter un BL vers Sage X3', 'Confirmatrice', '/api/confirmateur/bl/{piece}/export-sage', 'Melek', '3 j'],
                ['US4.6', 'Consulter et traiter les devis côté confirmateur', 'Confirmatrice', '/api/confirmateur/devis', 'Tawfik', '2 j'],
                ['US4.7', 'Consulter les livraisons disponibles dans sa zone', 'Livreur', '/api/livreur/pool/disponibles', 'Melek', '2 j'],
                ['US4.8', 'Prendre en charge une livraison (gestion des conflits 409)', 'Livreur', '/api/livreur/pool/{doPiece}/prendre', 'Tawfik', '2 j'],
                ['US4.9', 'Démarrer et arrêter la diffusion GPS via SignalR', 'Livreur', '/start-heading, /stop-heading, /ping, /ping-batch', 'Melek', '4 j'],
                ['US4.10', "Mettre à jour le statut d'une livraison (LIVRE, REPORTE, RETOUR, DEPOT, TENTATIVE)", 'Livreur', '/api/livreur/orders/{piece}/status', 'Tawfik', '3 j'],
                ['US4.11', 'Gérer la caisse COD et remettre au dépôt', 'Livreur', '/api/livreur/cashbox/remettre', 'Melek', '2 j'],
                ['US4.12', 'Créer et suivre une réclamation avec photos (HEIC/HEIF)', 'Client', '/api/reclamations', 'Tawfik', '3 j'],
                ['US4.13', 'Prendre en charge et traiter une réclamation (SignalR)', 'Confirmatrice', '/api/confirmateur/reclamations/*, ReclamationHub', 'Melek', '4 j'],
                ['US4.14', 'Demander correction adresse ou téléphone', 'Livreur', '/api/livreur/requests', 'Tawfik', '2 j'],
                ['US4.15', 'Superviser les livreurs actifs et les alertes', 'Superviseur', '/api/superviseur/livreurs, /alertes', 'Melek', '3 j'],
                ['US4.16', 'Gérer les missions de transit inter-dépôts avec scan', 'Livreur transit', '/api/transit/my-missions/*, mobile_scanner', 'Tawfik', '4 j'],
                ['US4.17', 'Optimiser la tournée (voisin le plus proche + OSRM)', 'Livreur', '/api/livreur/tournee/optimize', 'Melek', '3 j'],
            ]
        ),
        make_h2("4. Analyse et conception du Sprint 4"),
        make_normal("L'analyse de ce sprint précise les interactions entre les acteurs du terrain (confirmatrice, livreur, livreur de transit, client, superviseur) et les modules développés. Elle couvre trois domaines principaux : le workflow de confirmation documentaire, la logistique COD avec GPS temps réel, et la gestion des réclamations."),
        make_h3("4.1 Diagramme de cas d'utilisation du Sprint 4"),
        make_normal("[Insérer ici le diagramme de cas d'utilisation du Sprint 4]"),
        make_caption_figure("Figure  : Diagramme de cas d'utilisation du Sprint 4"),
        make_normal("Ce diagramme présente les fonctionnalités des cinq profils du sprint. La confirmatrice traite les bons de commande, déclenche la transformation BC→BL, exporte vers Sage X3 et gère les réclamations. Le livreur consulte le pool, prend en charge les livraisons, diffuse sa position GPS et gère sa caisse COD. Le livreur de transit gère ses missions par scan. Le client suit sa commande et crée des réclamations. Le superviseur supervise les livreurs actifs et leurs alertes."),
        make_h3("4.2 Diagrammes de séquence du Sprint 4"),
        make_h4("4.2.1 Transformation BC en bon de livraison"),
        make_normal("La confirmatrice envoie POST /api/confirmateur/commandes/{piece}/transform-to-bl. La Web API vérifie l'existence du BC dans F_DOCENTETE, contrôle l'absence de doublon BL, crée le bon de livraison (DO_Type=1) et ses lignes dans F_DOCLIGNE, puis retourne la référence du BL. Si un BL existe déjà, la référence existante est retournée. En cas d'erreur, la transaction est annulée."),
        make_normal("[Insérer ici le diagramme de séquence — Transformation BC en BL]"),
        make_caption_figure("Figure  : Diagramme de séquence — Transformation BC en BL"),
        make_h4("4.2.2 Livraison COD et diffusion GPS via SignalR"),
        make_normal("Lorsque le livreur démarre une livraison active (POST /start-heading), la Web API enregistre le début dans F_LIVREUR_POSITION. Le service Geolocator Flutter capture la position toutes les 10 secondes et l'envoie via POST /ping. La Web API effectue un UPSERT dans F_LIVREUR_POSITION et diffuse les coordonnées via l'événement SignalR LocationUpdate au client concerné (groupe client-{userId}). En cas de perte réseau, les positions sont envoyées en lot via /ping-batch à la reconnexion."),
        make_normal("[Insérer ici le diagramme de séquence — Livraison COD et GPS SignalR]"),
        make_caption_figure("Figure  : Diagramme de séquence — Livraison COD et diffusion GPS"),
        make_h4("4.2.3 Réclamation client avec SignalR"),
        make_normal("Lorsqu'un client crée une réclamation, la Web API enregistre le cas et diffuse l'événement NouveauCas à tous les confirmateurs (groupe 'confirmateurs'). La confirmatrice prend en charge le cas (CasAssigne diffusé). Chaque message échangé dans le chat est diffusé en temps réel via NouveauMessage (groupe client-{userId}). Une période de grâce de 5 secondes évite la libération prématurée en cas de changement de réseau."),
        make_normal("[Insérer ici le diagramme de séquence — Réclamation et SignalR]"),
        make_caption_figure("Figure  : Diagramme de séquence — Réclamation client avec SignalR"),
        make_h4("4.2.4 Scan de codes-barres pour le transit inter-dépôts"),
        make_normal("Le livreur de transit ouvre la mission dans transit_mission_details_screen et active le scanner via transit_barcode_scanner_screen (plugin mobile_scanner). Chaque scan envoie le code-barres à la Web API (PUT /api/transit/my-missions/{id}/scan). La Web API vérifie que l'article appartient à la mission, marque la ligne comme reçue dans F_TRANSFERTS et retourne une confirmation sonore. La mission est clôturée lorsque tous les articles sont validés."),
        make_normal("[Insérer ici le diagramme de séquence — Scan transit inter-dépôts]"),
        make_caption_figure("Figure  : Diagramme de séquence — Scan de codes-barres transit inter-dépôts"),
    )

    ins(
        make_h2("5. Réalisation du Sprint 4"),
        make_normal("La réalisation du Sprint 4 concrétise le flux logistique complet de la plateforme. Les interfaces React (confirmatrice, superviseur) consomment les endpoints via Axios. Les interfaces Flutter (livreur, client) utilisent ApiClient avec injection JWT. Les traitements métier sont centralisés dans la Web API ASP.NET Core."),
        make_h3("5.1 Interface confirmatrice — liste des commandes"),
        make_normal("Cette interface affiche les bons de commande en attente avec leur statut, leur référence, le client, le montant et le mode de paiement. La confirmatrice peut filtrer par statut (EN_ATTENTE, CONFIRME, EN_LIVRAISON, LIVRE) et accéder au détail pour modifier le statut ou déclencher la transformation en BL."),
        make_normal("[Insérer ici la capture de la liste des commandes confirmatrice]"),
        make_caption_figure("Figure  : Interface confirmatrice — liste des commandes"),
        make_h3("5.2 Interface confirmatrice — transformation BC en BL"),
        make_normal("Cette interface permet à la confirmatrice de déclencher la transformation d'un bon de commande en bon de livraison. Le système vérifie l'absence de doublon, crée le BL et affiche sa référence. En cas d'erreur (stock insuffisant, BC introuvable), un message explicite est affiché."),
        make_normal("[Insérer ici la capture de l'interface de transformation BC en BL]"),
        make_caption_figure("Figure  : Interface confirmatrice — transformation BC en BL"),
        make_h3("5.3 Interface confirmatrice — gestion des réclamations"),
        make_normal("Cette interface affiche les réclamations clients avec leur motif, statut et source. Les nouvelles réclamations apparaissent automatiquement via SignalR (NouveauCas). La confirmatrice peut prendre en charge un cas, modifier son statut, envoyer une demande de correction, créer un bon d'échange, ajouter une note interne, réassigner le cas ou chatter en temps réel avec le client (NouveauMessage)."),
        make_normal("[Insérer ici la capture de l'interface de gestion des réclamations]"),
        make_caption_figure("Figure  : Interface confirmatrice — gestion des réclamations avec chat SignalR"),
        make_h3("5.4 Interface livreur — livraisons disponibles"),
        make_normal("L'écran new_orders_screen permet au livreur de consulter les bons de livraison disponibles dans son gouvernorat et sa délégation. Les livraisons sont affichées avec l'adresse, le montant COD et les contacts. Le livreur peut prendre en charge une livraison d'un simple appui (conflit 409 géré)."),
        make_normal("[Insérer ici la capture de l'interface des livraisons disponibles]"),
        make_caption_figure("Figure  : Interface livreur — livraisons disponibles"),
        make_h3("5.5 Interface livreur — suivi GPS et carte de livraison"),
        make_normal("Cette interface affiche sur une carte interactive les livraisons du livreur avec leur position. En état HEADING_TO_YOU, la carte live LiveDeliveryMapSheet affiche la position GPS du livreur mise à jour en temps réel via SignalR LocationUpdate et est visible par le client. L'algorithme OSRM fournit les ETA pour chaque segment de la tournée. L'algorithme du voisin le plus proche (Haversine) optimise l'ordre des arrêts."),
        make_normal("[Insérer ici la capture de l'interface de suivi GPS]"),
        make_caption_figure("Figure  : Interface livreur — suivi GPS et carte de livraison"),
        make_h3("5.6 Interface livreur — caisse COD"),
        make_normal("L'écran livreur_stats_screen affiche le montant total encaissé, les livraisons du jour, le taux de réussite et la répartition par statut. Le livreur peut soumettre sa caisse au dépôt (POST /api/livreur/cashbox/remettre) et consulter l'historique de ses remises."),
        make_normal("[Insérer ici la capture de l'interface caisse COD]"),
        make_caption_figure("Figure  : Interface livreur — gestion de la caisse COD"),
        make_h3("5.7 Interface suivi commande client (TrackingStateCard)"),
        make_normal("La carte adaptative TrackingStateCard affiche l'état de la commande parmi quatre états : AT_DEPOT, IN_DELIVERY_QUEUE, HEADING_TO_YOU (avec position GPS, ETA, distance et indicateur de fraîcheur vert/orange/rouge), TERMINAL. Le client peut appeler ou envoyer un SMS au livreur directement depuis cet écran."),
        make_normal("[Insérer ici la capture du suivi commande client]"),
        make_caption_figure("Figure  : Interface client — TrackingStateCard adaptative"),
        make_h3("5.8 Interface de transit inter-dépôts et scan codes-barres"),
        make_normal("L'écran transit_home_screen liste les missions de transit. L'écran transit_mission_details_screen présente les articles attendus. Le scanner transit_barcode_scanner_screen valide chaque article par scan (vibration + son). Les articles scannés sont marqués reçus dans F_TRANSFERTS. La mission est clôturée quand tous les articles sont validés."),
        make_normal("[Insérer ici la capture de l'interface de transit et scan]"),
        make_caption_figure("Figure  : Interface transit inter-dépôts et scan codes-barres"),
        make_h3("5.9 Interface superviseur"),
        make_normal("Cette interface donne au superviseur une vision des livreurs actifs, de leurs positions sur la carte, de leurs statistiques et de leurs alertes (retard, zone non couverte, taux d'échec élevé). La carte de chaleur (heatmap) des livraisons échouées sur 90 jours glissants permet d'identifier les zones à problèmes."),
        make_normal("[Insérer ici la capture de l'interface superviseur]"),
        make_caption_figure("Figure  : Interface superviseur — livreurs actifs et heatmap"),
    )

    ins(
        make_h2("6. Tests et validation du Sprint 4"),
        make_normal("Les activités de test et de validation ont été réalisées progressivement au cours du sprint, en vérifiant chaque flux logistique dans les conditions réelles d'utilisation terrain."),
        make_caption_tableau("Tableau  : Tests fonctionnels du Sprint 4"),
        make_table(
            ['Test', 'Objectif', 'Résultat attendu', 'Statut'],
            [
                ['Consultation commandes confirmatrice', "Vérifier l'affichage des BC en attente.", 'Les BC sont affichés avec les bons statuts et informations.', 'À valider'],
                ['Transformation BC→BL sans doublon', 'Vérifier la création du BL et la gestion du doublon.', 'Un BL est créé. Si BL existant, la référence est retournée.', 'À valider'],
                ['Export BL vers Sage X3', 'Vérifier la transmission du BL vers Sage X3.', 'Le BL est créé dans Sage X3 avec les bonnes lignes.', 'À valider'],
                ['Pool livraisons', 'Vérifier le filtrage par zone géographique.', "Seules les livraisons du gouvernorat/délégation apparaissent.", 'À valider'],
                ['Prise en charge conflits', "Vérifier le cas d'une livraison déjà prise.", "Le système retourne 409. Pas de doublon.", 'À valider'],
                ['Diffusion GPS SignalR', 'Vérifier la réception de la position par le client.', 'La carte live affiche la position avec fraîcheur < 30 secondes.', 'À valider'],
                ['Statut LIVRE + encaissement COD', "Vérifier l'encaissement automatique.", 'MontantEncaisse et Encaisse=true dans F_LIVRAISON.', 'À valider'],
                ['SignalR NouveauCas réclamation', "Vérifier la réception instantanée d'une réclamation.", "La réclamation apparaît sans rechargement de page.", 'À valider'],
                ['Scan barcode transit', "Vérifier la validation d'un article par scan.", "L'article est marqué reçu dans F_TRANSFERTS. Son émis.", 'À valider'],
                ['Optimisation tournée OSRM', "Vérifier l'ordre optimal et les ETA.", "L'ordre minimise la distance totale. Les ETA sont cohérents.", 'À valider'],
            ]
        ),
        make_h2("7. Conclusion"),
        make_normal("Ce sprint a finalisé le flux logistique complet de la solution. La confirmatrice dispose d'outils pour traiter les bons de commande, déclencher la transformation BC→BL et exporter vers Sage X3. Le livreur bénéficie d'un suivi GPS temps réel via SignalR, d'une optimisation de tournée et d'une gestion de caisse COD. Les réclamations sont traitées en temps réel avec SignalR. Le module de transit inter-dépôts par scan de codes-barres complète la logistique. Le superviseur supervise l'ensemble des activités terrain. Ce sprint prépare le Sprint 5 dédié au pilotage et à l'aide à la décision."),
    )

build_ch7(anchor_conclusion)

# ─────────────────────────────────────────────
# CHAPITRE 8
# ─────────────────────────────────────────────
print("  Construction Chapitre 8...")

CH8_PAGE = "Chapitre 8 : Sprint 5 — Pilotage, tableaux de bord, chatbot et aide à la décision"
CH8_H1 = CH8_PAGE

def build_ch8(anchor):
    def ins(*els):
        for el in els:
            anchor.addprevious(el)

    ins(
        make_page_break(),
        make_normal(CH8_PAGE),
        make_h1(CH8_H1),
        make_h2("1. Introduction"),
        make_normal("Ce chapitre présente le cinquième et dernier sprint du projet. À ce stade, l'ensemble des fonctionnalités métier a été développé. Ce sprint se concentre sur la couche de pilotage et d'aide à la décision : tableaux de bord avancés multi-dimensionnels, exports PDF et Excel, chatbot administrateur basé sur n8n, insights stratégiques et préparation de la démonstration finale."),
        make_h2("2. Objectif et périmètre du Sprint 5"),
        make_normal("Le Sprint 5 s'est déroulé du 27/04/2026 au 23/05/2026. Son objectif est de transformer la solution en une plateforme pilotable, offrant à l'administrateur une vision complète et synthétique de l'activité, des outils d'analyse avancés et un assistant conversationnel pour interroger les données métier."),
        make_h2("3. Backlog du Sprint 5"),
        make_normal("Le tableau suivant présente les histoires utilisateurs traitées durant ce sprint."),
        make_caption_tableau("Tableau  : Backlog du Sprint 5"),
        make_table(
            ['ID', 'User Story', 'Rôle', 'Endpoints / Modules', 'Resp.', 'Estim.'],
            [
                ['US5.1', 'Consulter le tableau de bord global (KPI, tendances, alertes)', 'Admin', '/api/admin/dashboard, /api/dashboard/advanced', 'Melek', '3 j'],
                ['US5.2', "Analyser les ventes (CA, top produits, évolution)", 'Admin', '/api/dashboard/ventes', 'Tawfik', '3 j'],
                ['US5.3', 'Analyser les commandes (par statut, par période, par livreur)', 'Admin', '/api/dashboard/commandes', 'Melek', '2 j'],
                ['US5.4', 'Analyser les produits (top ventes, ruptures de stock)', 'Admin', '/api/dashboard/produits', 'Tawfik', '2 j'],
                ['US5.5', 'Analyser les stocks et les dépôts', 'Admin', '/api/dashboard/stocks, /depots', 'Melek', '2 j'],
                ['US5.6', 'Analyser la logistique (taux livraison, zones, délais)', 'Admin', '/api/dashboard/logistique', 'Tawfik', '2 j'],
                ['US5.7', 'Analyser les livreurs (performance, classement, caisse COD)', 'Admin', '/api/dashboard/livreurs', 'Melek', '2 j'],
                ['US5.8', 'Analyser les clients (fidélité, panier moyen, B2B/B2C)', 'Admin', '/api/dashboard/clients', 'Tawfik', '2 j'],
                ['US5.9', 'Suivre les réclamations (par motif, par confirmateur)', 'Admin', '/api/dashboard/reclamations', 'Melek', '2 j'],
                ['US5.10', 'Suivre les performances des confirmateurs', 'Admin', '/api/dashboard/confirmateurs', 'Tawfik', '2 j'],
                ['US5.11', 'Suivre les synchronisations Sage X3', 'Admin', '/api/dashboard/sage-sync', 'Melek', '2 j'],
                ['US5.12', 'Consulter les insights stratégiques automatiques', 'Admin', '/api/dashboard/insights', 'Tawfik', '2 j'],
                ['US5.13', "Générer des exports Excel et PDF", 'Admin', '/api/admin/exports/pdf, /excel', 'Melek', '3 j'],
                ['US5.14', 'Interagir avec le chatbot administrateur (n8n + LLM)', 'Admin', '/api/chatbot/ask, workflow n8n', 'Tawfik', '4 j'],
                ['US5.15', 'Gérer les conversations et insights du chatbot', 'Admin', '/api/chatbot/conversations, /insights', 'Melek', '2 j'],
                ['US5.16', 'Préparer et documenter les livrables de démonstration', 'Tous', 'README, Swagger, rapport', 'Melek/Tawfik', '3 j'],
            ]
        ),
        make_h2("4. Analyse et conception du Sprint 5"),
        make_normal("L'analyse de ce sprint porte principalement sur les fonctionnalités transverses de pilotage. Les tableaux de bord agrégent les données de tous les modules précédents et les présentent sous forme synthétique. Le chatbot utilise le workflow n8n pour interroger la base et fournir des réponses en langage naturel."),
        make_h3("4.1 Diagramme de cas d'utilisation du Sprint 5"),
        make_normal("[Insérer ici le diagramme de cas d'utilisation du Sprint 5]"),
        make_caption_figure("Figure  : Diagramme de cas d'utilisation du Sprint 5"),
        make_normal("Ce diagramme présente les fonctionnalités de pilotage de l'administrateur. Il accède aux tableaux de bord multi-dimensionnels, génère des exports, interroge le chatbot et consulte les insights stratégiques automatiques."),
        make_h3("4.2 Diagramme de séquence du chatbot administrateur"),
        make_normal("L'administrateur saisit une question en langage naturel dans l'interface React. La Web API transmet la requête au workflow n8n via HTTP. Le workflow interroge les endpoints de la Web API, traite la réponse avec un modèle LLM (Groq si configuré), et retourne la réponse structurée. L'historique est conservé en session pour les questions de suivi."),
        make_normal("[Insérer ici le diagramme de séquence — Chatbot administrateur]"),
        make_caption_figure("Figure  : Diagramme de séquence — Chatbot administrateur (n8n)"),
        make_h3("4.3 Diagramme de séquence d'export Excel/PDF"),
        make_normal("L'administrateur sélectionne le type d'export (commandes, livraisons, réclamations) et la période. La Web API agrège les données, génère le fichier (PDF via librairie de rendu, Excel via EPPlus ou similaire) et retourne le flux en téléchargement direct. L'export est disponible immédiatement sans rechargement de page."),
        make_normal("[Insérer ici le diagramme de séquence — Export Excel/PDF]"),
        make_caption_figure("Figure  : Diagramme de séquence — Export Excel/PDF"),
    )

    ins(
        make_h2("5. Réalisation du Sprint 5"),
        make_normal("La réalisation de ce sprint finalise l'ensemble de la plateforme. Les tableaux de bord React consomment les endpoints d'agrégation via Axios. Le chatbot est accessible depuis un panneau latéral. Les exports sont générés côté backend et téléchargés directement."),
        make_h3("5.1 Interface du tableau de bord global"),
        make_normal("Le tableau de bord global présente les indicateurs clés de performance (KPI) : nombre de commandes par statut, chiffre d'affaires du jour/semaine/mois, taux de livraison global, réclamations ouvertes, livreurs actifs et insights automatiques. Des graphiques sparkline affichent l'évolution sur 7 jours. Les données sont actualisées toutes les 5 minutes."),
        make_normal("[Insérer ici la capture du tableau de bord global]"),
        make_caption_figure("Figure  : Interface du tableau de bord global"),
        make_h3("5.2 Interface du dashboard ventes et commandes"),
        make_normal("Ces tableaux de bord présentent l'analyse détaillée des ventes (CA par période, top produits, répartition B2C/B2B) et des commandes (répartition par statut, par livreur, par zone géographique, délai moyen de traitement). Ils permettent d'identifier les tendances et les anomalies commerciales."),
        make_normal("[Insérer ici la capture du dashboard ventes et commandes]"),
        make_caption_figure("Figure  : Interface du dashboard ventes et commandes"),
        make_h3("5.3 Interface du dashboard logistique et livreurs"),
        make_normal("Ce tableau de bord présente les indicateurs logistiques : taux de livraison réussi par zone, délai moyen de livraison, classement des livreurs (taux de réussite, volume), analyse des zones à problèmes (heatmap 90 jours glissants), suivi de la caisse COD globale et analyse des statuts (livré, retourné, reporté, dépôt)."),
        make_normal("[Insérer ici la capture du dashboard logistique et livreurs]"),
        make_caption_figure("Figure  : Interface du dashboard logistique et livreurs"),
        make_h3("5.4 Interface du dashboard réclamations et confirmatrices"),
        make_normal("Ce tableau de bord suit les réclamations par motif (COLIS_ENDOMMAGE, NON_LIVRE, MAUVAIS_ARTICLE), par statut, par confirmatrice assignée et par délai de résolution. Il présente également les performances des confirmateurs : cas actifs, taux de résolution, temps moyen de traitement."),
        make_normal("[Insérer ici la capture du dashboard réclamations]"),
        make_caption_figure("Figure  : Interface du dashboard réclamations et confirmatrices"),
        make_h3("5.5 Interface du dashboard synchronisation Sage X3"),
        make_normal("Ce tableau de bord présente l'état des synchronisations Sage X3 : dernière exécution, nombre d'articles/stocks/dépôts synchronisés, erreurs détectées et historique des exécutions. Il permet de vérifier en permanence la cohérence entre la plateforme et Sage X3."),
        make_normal("[Insérer ici la capture du dashboard synchronisation Sage X3]"),
        make_caption_figure("Figure  : Interface du dashboard synchronisation Sage X3"),
        make_h3("5.6 Interface des exports Excel et PDF"),
        make_normal("Cette interface permet à l'administrateur de générer des fichiers exportables pour l'analyse externe. Les exports couvrent les commandes, les livraisons, les réclamations et les performances. Les fichiers PDF sont générés côté backend et téléchargés directement. Les exports Excel permettent des analyses complémentaires dans des outils tiers."),
        make_normal("[Insérer ici la capture de l'interface des exports]"),
        make_caption_figure("Figure  : Interface des exports Excel et PDF"),
        make_h3("5.7 Interface du chatbot administrateur"),
        make_normal("Le chatbot aide l'administrateur à interroger les données en langage naturel. Il est accessible depuis un panneau latéral React. Exemples : « Quelles réclamations sont ouvertes depuis plus de 3 jours ? », « Quel est le taux de livraison de la semaine ? ». Le workflow n8n interroge les endpoints et structure la réponse. L'historique des conversations est conservé."),
        make_normal("[Insérer ici la capture de l'interface chatbot]"),
        make_caption_figure("Figure  : Interface du chatbot administrateur (n8n)"),
        make_h3("5.8 Interface des conversations et insights chatbot"),
        make_normal("Cette interface permet à l'administrateur de consulter l'historique de ses conversations avec le chatbot, de retrouver des analyses précédentes et d'accéder aux insights automatiques générés par le système (tendances détectées, anomalies, recommandations). Les insights sont calculés quotidiennement et présentés sous forme de cards."),
        make_normal("[Insérer ici la capture des conversations et insights chatbot]"),
        make_caption_figure("Figure  : Interface des conversations et insights chatbot"),
    )

    ins(
        make_h2("6. Tests et validation du Sprint 5"),
        make_normal("Les activités de test et de validation du Sprint 5 couvrent les fonctionnalités de pilotage et vérifient la cohérence des données agrégées avec les données sources de chaque module."),
        make_caption_tableau("Tableau  : Tests fonctionnels du Sprint 5"),
        make_table(
            ['Test', 'Objectif', 'Résultat attendu', 'Statut'],
            [
                ['KPI tableau de bord global', 'Vérifier la cohérence des indicateurs.', 'Les KPI correspondent aux données de la base SQL Server.', 'À valider'],
                ['Dashboard ventes', "Vérifier le calcul du chiffre d'affaires.", 'Les montants correspondent aux commandes livrées.', 'À valider'],
                ['Dashboard logistique', 'Vérifier le taux de livraison calculé.', 'Le taux est cohérent avec les statuts en base.', 'À valider'],
                ['Export PDF', 'Vérifier la génération et le téléchargement du PDF.', 'Le fichier est complet et téléchargeable.', 'À valider'],
                ['Export Excel', "Vérifier les colonnes et les données de l'export.", 'Toutes les données attendues sont présentes.', 'À valider'],
                ['Chatbot — question simple', 'Vérifier la réponse à une question structurée.', 'La réponse est cohérente avec les données de la base.', 'À valider'],
                ['Chatbot — question contextuelle', 'Vérifier la continuité de la conversation.', 'Le chatbot utilise le contexte de la question précédente.', 'À valider'],
                ['Insights automatiques', 'Vérifier la génération des insights quotidiens.', 'Les insights reflètent les tendances réelles des données.', 'À valider'],
                ['Synchronisation Sage X3 dashboard', "Vérifier l'affichage de l'état de synchronisation.", "Le statut et l'historique sont corrects.", 'À valider'],
            ]
        ),
        make_h2("7. Conclusion"),
        make_normal("Ce dernier sprint a complété la vision de pilotage de la plateforme. L'administrateur dispose d'un tableau de bord multi-dimensionnel couvrant l'ensemble des modules : ventes, commandes, logistique, livreurs, clients, réclamations, confirmateurs et synchronisation Sage X3. Le chatbot n8n offre une interface conversationnelle pour interroger les données métier en langage naturel. Les exports PDF et Excel permettent l'exploitation des données en dehors de la plateforme. L'ensemble de la solution est désormais complet, stable et prêt pour la démonstration finale."),
    )

build_ch8(anchor_conclusion)

# ─────────────────────────────────────────────
# SAUVEGARDE
# ─────────────────────────────────────────────
print("Sauvegarde du document...")
doc.save(DEST)
print(f"Document sauvegardé: {DEST}")

# ─────────────────────────────────────────────
# VÉRIFICATION FINALE
# ─────────────────────────────────────────────
print("\n=== VÉRIFICATION FINALE ===")
doc2 = Document(DEST)
body2 = doc2.element.body
children2 = list(body2)
print(f"Total body children: {len(children2)}")

h1_list = []
for i, child in enumerate(children2):
    if child.tag != qn('w:p'):
        continue
    style = child.find('.//' + qn('w:pStyle'))
    if style is not None and style.get(qn('w:val'), '') == 'Titre1':
        text = get_text(child)
        if text.strip():
            h1_list.append(f"  [{i}] {text[:80]}")

print(f"Paragraphes Heading 1 ({len(h1_list)}):")
for h in h1_list:
    print(h)

# Vérifier les technologies
tech_new = []
for child in children2:
    if child.tag != qn('w:p'):
        continue
    text = get_text(child)
    if 'AJAX' in text or 'StarUML' in text or 'Mapbox' in text:
        tech_new.append(text[:60])

print(f"\nTechnologies insérées ({len(tech_new)}):")
for t in tech_new:
    print(f"  - {t}")

# Compter les tableaux
tables = [c for c in children2 if c.tag == qn('w:tbl')]
print(f"\nNombre de tableaux: {len(tables)}")

print("\nScript terminé avec succès!")
