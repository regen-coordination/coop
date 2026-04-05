// Keep the API package pointed at the same sync defaults used by the browser
// runtimes without making @coop/shared depend on @coop/api.
export {
  buildIceServers,
  defaultIceServers,
  defaultSignalingUrls,
  defaultWebsocketSyncUrl,
  filterUsableSignalingUrls,
  parseSignalingUrls,
} from '@coop/shared/sync-config';
