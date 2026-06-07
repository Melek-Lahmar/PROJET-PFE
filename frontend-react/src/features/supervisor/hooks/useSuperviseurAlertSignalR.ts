import { useEffect, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { useAuthStore } from "../../auth/store/authStore";
import { env } from "../../../core/config/env";

export interface AlertPayload {
  id: string;
  severity: string;
  alertType: string;
  message: string;
}

/**
 * Écoute l'événement SignalR "NouvelleAlerte" depuis le hub /hubs/reclamation.
 * Appelé dans la page superviseur pour recevoir les alertes en temps réel.
 */
export function useSuperviseurAlertSignalR(
  onAlert: (alert: AlertPayload) => void
) {
  const token = useAuthStore((s) => s.token);
  const onAlertRef = useRef(onAlert);

  useEffect(() => {
    onAlertRef.current = onAlert;
  }, [onAlert]);

  useEffect(() => {
    if (!token) return;

    const hubUrl = `${env.apiOrigin}/hubs/reclamation`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect([2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on("NouvelleAlerte", (payload: AlertPayload) => {
      onAlertRef.current(payload);
    });

    connection.start().catch(() => {
      // Connexion échouée — silencieux (dégradé gracieux)
    });

    return () => {
      void connection.stop();
    };
  }, [token]);
}
