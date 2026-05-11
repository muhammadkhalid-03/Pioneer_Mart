export type AuthTokenBridgeHandlers = {
  onTokensRefreshed: (access: string, refresh: string) => void;
  onSessionInvalidated: () => void;
};

let handlers: AuthTokenBridgeHandlers | null = null;

export function registerAuthTokenBridge(next: AuthTokenBridgeHandlers | null) {
  handlers = next;
}

export function notifyTokensRefreshed(access: string, refresh: string) {
  handlers?.onTokensRefreshed(access, refresh);
}

export function notifySessionInvalidated() {
  handlers?.onSessionInvalidated();
}
