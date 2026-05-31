class Statut {
  static const int confirme = 1;
  static const int enLivraison = 2;
  static const int livre = 3;
  static const int reporte = 4;
  static const int retourne = 5;
  static const int depot = 6;
}
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://192.168.1.165:5123',
);
const String osrmBaseUrl ="https://router.project-osrm.org";

/// URL du webhook n8n du chatbot admin (étape 10).
const String n8nChatbotWebhookUrl = ""; // n8n optionnel : chatbot principal via backend /api/admin/chat/ask

/// Mapbox public token (pk.*) — utilisé par MapboxRoutingService pour
/// l'API Directions Traffic. Quota gratuit 100k req/mois. Si vide ou
/// invalide, le routing tombe en cascade sur OSRM puis polyline directe.
const String mapboxAccessToken = String.fromEnvironment('MAPBOX_ACCESS_TOKEN', defaultValue: '');
// TODO: when mapboxAccessToken.isEmpty, Mapbox features (e.g. MapboxRoutingService)
// should degrade gracefully by falling back to OSRM / direct polyline. Add isNotEmpty
// guards at call sites if not already present.

