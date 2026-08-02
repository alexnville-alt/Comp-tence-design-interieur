/**
 * Constante partagée entre le composant client (`heartbeat-tracker.tsx`) et
 * la Server Action (`heartbeat-actions.ts`) — l'intervalle d'envoi du client
 * et le montant crédité côté serveur doivent toujours correspondre.
 */
export const HEARTBEAT_INTERVAL_MS = 30_000;
