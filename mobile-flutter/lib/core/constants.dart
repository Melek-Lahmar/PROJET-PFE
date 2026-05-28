class Statut {
  static const int confirme = 1;
  static const int enLivraison = 2;
  static const int livre = 3;
  static const int reporte = 4;
  static const int retourne = 5;
  static const int depot = 6;
}
const String apiBaseUrl = "http://192.168.1.165:5123";
const String osrmBaseUrl ="https://router.project-osrm.org";

/// URL du webhook n8n du chatbot admin (étape 10).
const String n8nChatbotWebhookUrl = ""; // n8n optionnel : chatbot principal via backend /api/admin/chat/ask

/// Mapbox public token (pk.*) — utilisé par MapboxRoutingService pour
/// l'API Directions Traffic. Quota gratuit 100k req/mois. Si vide ou
/// invalide, le routing tombe en cascade sur OSRM puis polyline directe.
const String mapboxAccessToken = String.fromEnvironment('MAPBOX_ACCESS_TOKEN', defaultValue: 'pk.eyJ1IjoidGF3ZmlrMTIzIiwiYSI6ImNtcDMwdDFwZjA2bjkydHNjM2Fuc2cwZTUifQ.Yv7v5-SaVClG-h_iMAguAA');

