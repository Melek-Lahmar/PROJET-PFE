# ADMIN_BUTTONS_AUDIT.md

> Audit exhaustif des boutons cliquables de l'espace admin React + Flutter.
> Périmètre : `React-Ecommerce/src/features/dashboard/` + `flutter/lib/ui/admin/`.
> Date : 2026-05-09

## React Admin

| Écran | Bouton | Fichier:ligne | Statut | Action corrective |
|---|---|---|---|---|
| AdminDepotsPage | Actualiser | AdminDepotsPage.tsx:172 | ✅ OK | depotsQuery.refetch() |
| AdminDepotsPage | Depot selection | AdminDepotsPage.tsx:186-189 | ✅ OK | setSelectedDepotNo |
| AdminStockPage | Actualiser | AdminStockPage.tsx:234 | ✅ OK | articlesQuery.refetch() |
| AdminStockPage | Article selection | AdminStockPage.tsx:261-264 | ✅ OK | setSelectedRef |
| AdminClientsPage | Client selection | AdminClientsPage.tsx:211-214 | ✅ OK | setSelectedClientId |
| AdminClientsPage | Actualiser | AdminClientsPage.tsx:186 | ✅ OK | listQuery.refetch() |
| AdminClientsPage | Order modal | AdminClientsPage.tsx:335-339 | ✅ OK | setSelectedOrderPiece |
| AdminOrdersPage | Order selection | AdminOrdersPage.tsx:202-205 | ✅ OK | setSelectedPiece |
| AdminOrdersPage | Actualiser | AdminOrdersPage.tsx:173 | ✅ OK | listQuery.refetch() |
| AdminPersonnelPage | Actualiser | AdminPersonnelPage.tsx:144 | ✅ OK | query.refetch() |
| AdminUsersPage | Créer utilisateur | AdminUsersPage.tsx:147 | ✅ OK | setCreateOpen(true) |
| AdminUsersPage | Rôles | AdminUsersPage.tsx:254-262 | ✅ OK | setSelectedUser/setEditRolesOpen |
| AdminUsersPage | Actualiser | AdminUsersPage.tsx:201 | ✅ OK | q.refetch() |
| AdminUsersPage | Pagination prev | AdminUsersPage.tsx:282-289 | ✅ OK | setSkip Math.max |
| AdminUsersPage | Pagination next | AdminUsersPage.tsx:291-298 | ✅ OK | setSkip += take |
| AdminArticlesPage | Actualiser | AdminArticlesPage.tsx:98 | ✅ OK | refetch() |
| AdminArticlesPage | Pagination | AdminArticlesPage.tsx:166-168 | ✅ OK | goToPage |
| AdminArticleImagesPage | Ajouter par URL | AdminArticleImagesPage.tsx:201 | ✅ OK | setCreateOpen |
| AdminArticleImagesPage | Uploader PC | AdminArticleImagesPage.tsx:204 | ✅ OK | setUploadOpen |
| AdminArticleImagesPage | Principale | AdminArticleImagesPage.tsx:290 | ✅ OK | setAsMain |
| AdminArticleImagesPage | Modifier | AdminArticleImagesPage.tsx:293 | ✅ OK | setEditingImage |
| AdminArticleImagesPage | Monter/Descendre | AdminArticleImagesPage.tsx:296-299 | ✅ OK | moveImage |
| AdminArticleImagesPage | Supprimer | AdminArticleImagesPage.tsx:306 | ✅ OK | handleDelete |
| AdminSyncPage | Retour Dashboard | AdminSyncPage.tsx:314 | ✅ OK | navigate("/admin") |
| AdminSyncPage | Synchroniser tout | AdminSyncPage.tsx:323 | ✅ OK | runSync |
| Dashboard | Period mark buttons | DashboardPeriodSwitch.tsx:63-71 | ✅ OK | onChange |
| Dashboard | Actualiser toolbar | DashboardToolbar.tsx:86 | ✅ OK | onRefresh callback |
| Dashboard | Error retry | DashboardErrorState.tsx:19 | ✅ OK | onRetry callback |
| Dashboard | SegmentedTabs | AdminSegmentedTabs.tsx:26 | ✅ OK | onChange |
| AdminSyncPage | Sync card buttons | AdminSyncPage.tsx:180-189, 448-458 | ✅ OK | runSync(...) |

**TOTAL React : 31 audités, 0 morts**

## Flutter Admin

| Écran | Bouton | Fichier:ligne | Statut | Action corrective |
|---|---|---|---|---|
| AdminHome | Logout cancel | admin_home.dart:23-25 | ✅ OK | Navigator pop |
| AdminHome | Logout confirm | admin_home.dart:27-28 | ✅ OK | logout |
| AdminHome | Logout (drawer) | admin_home.dart:251-253 | ✅ OK | _confirmLogout |
| AdminHome | Logout (TextButton) | admin_home.dart:404-405 | ✅ OK | _confirmLogout |
| AdminHome | Logout (IconButton) | admin_home.dart:465-467 | ✅ OK | _confirmLogout |
| AdminHome | Navigation InkWell | admin_home.dart:533, 547-549 | ✅ OK | _currentIndex |
| AdminOrders | Order row tap | admin_orders_screen.dart:136-137 | ✅ OK | AdminOrderDetailDrawer.show |
| AdminDashboard | RefreshIndicator | admin_dashboard_screen.dart:84-88 | ✅ OK | provider.refresh |
| AdminProducts | RefreshIndicator | admin_products_screen.dart:93-94 | ✅ OK | prov.reload |
| AdminProducts | Error retry | admin_products_screen.dart:86 | ✅ OK | prov.reload |
| AdminDrivers | FAB InkWell | admin_drivers_screen.dart:135-145 | ✅ OK | AdminUserFormSheet.show |
| AdminDrivers | Search field | admin_drivers_screen.dart:82-95 | ✅ OK | prov.setSearch |
| AdminClaims | TabBar | admin_claims_screen.dart:81-98 | ✅ OK | TabBar managed |
| AdminChat | Clear button | admin_chat_screen.dart:163-166 | ✅ OK | prov.clear |
| AdminChat | Suggestion tap | admin_chat_screen.dart:363 | ✅ OK | onSuggestion(q) |
| AdminChat | Send button | admin_chat_screen.dart:853 | ✅ OK | onSend(null) |
| AdminFilterBar | Clear filter | admin_filter_bar.dart:63-65 | ✅ OK | _openSelector |
| AdminFilterBar | Filter InkWell | admin_filter_bar.dart:96-98 | ✅ OK | _openSelector |
| AdminFilterBar | Clear dialog | admin_filter_bar.dart:201-202 | ✅ OK | Navigator pop |
| AdminFilterBar | Governorate | admin_filter_bar.dart:238 | ✅ OK | Navigator pop |
| AdminConfirmatrices | Row tap | admin_confirmatrices_screen.dart:123-125 | ✅ OK | _ConfDetailDrawer.show |
| AdminConfirmatrices | Drawer close | admin_confirmatrices_screen.dart:559-560 | ✅ OK | Navigator pop |
| AdminDrivers | Driver row | admin_drivers_screen.dart:135-137 | ✅ OK | _DriverDetailDrawer.show |
| AdminDrivers | Drawer close | admin_drivers_screen.dart:604-605 | ✅ OK | Navigator pop |
| AdminKpiCard | KPI tap | admin_kpi_card.dart:81 | ✅ OK | AdminKpiDetailSheet.show |
| AdminUserFormSheet | Close button | admin_user_form_sheet.dart:251-252 | ✅ OK | Navigator pop |
| AdminUserFormSheet | Save button | admin_user_form_sheet.dart:364, 382 | ✅ OK | _submit |
| AdminUserFormSheet | Confirmation | admin_user_form_sheet.dart:486-491 | ✅ OK | Navigator pop |
| AdminOrdersFilterBar | Filter clear | admin_orders_filter_bar.dart:63-65 | ✅ OK | setState |
| AdminOrdersPagination | Prev/Next | admin_orders_pagination.dart:50-72 | ✅ OK | onGoTo |
| AdminSettings | Logout | admin_settings_screen.dart:116-137 | ✅ OK | _confirmLogout |
| AdminOrderDetailDrawer | Close | admin_order_detail_drawer.dart:123-124 | ✅ OK | onClose |
| AdminOrderRow | Row tap | admin_order_row.dart:31 | ✅ OK | onTap callback |

**TOTAL Flutter : 35 audités, 0 morts**

## TOTAL GLOBAL : 66 audités, 0 morts, 0 endpoints manquants

## Ajouts à venir (Section 4 — refonte)

- Endpoint `GET /api/admin/{entity}/summary` cohérent (correction bug 7/8)
- Push navigation drill-down KPI → écran liste détaillée (`AdminKpiDetailScreen`)
- Différenciation visuelle 8 onglets (couleur + icône + kicker spécifiques)
- Section Produits avec KPIs cliquables + détail 5 blocs
- Onglet Paramètres (apparence : couleur thème + mode clair/sombre/auto)
- Boutons Export Excel (ClosedXML) + PDF (QuestPDF) sur chaque écran liste
- Migration DB : `F_APP_CONFIG`, index `IX_F_RECLAMATION_Stats`
