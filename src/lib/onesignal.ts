declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
  }
}

const APP_ID = "e5e608d0-1fad-4e9a-84ca-9812ac96a3a1";
const INIT_FLAG = "eagle-onesignal-initialized";

let sdkLoaded = false;
let sdkLoadPromise: Promise<void> | null = null;
let initDone = false;

const SDK_LOAD_TIMEOUT_MS = 10000;
const SDK_READY_TIMEOUT_MS = 8000;

async function loadOneSignalSDK(): Promise<void> {
  if (sdkLoaded) return;

  if (!sdkLoadPromise) {
    sdkLoadPromise = new Promise((resolve, reject) => {
      // Check if script already exists
      const existing = document.querySelector('script[src*="OneSignalSDK"]');
      if (existing) {
        sdkLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
      script.defer = true;

      const timeoutId = window.setTimeout(() => {
        reject(new Error("OneSignal SDK load timed out"));
      }, SDK_LOAD_TIMEOUT_MS);

      script.onload = () => {
        window.clearTimeout(timeoutId);
        sdkLoaded = true;
        resolve();
      };

      script.onerror = () => {
        window.clearTimeout(timeoutId);
        reject(new Error("Failed to load OneSignal SDK"));
      };

      document.head.appendChild(script);
    });
  }

  try {
    await sdkLoadPromise;
  } catch (error) {
    sdkLoadPromise = null;
    throw error;
  }
}

async function withOneSignal<T>(handler: (OneSignal: any) => Promise<T>): Promise<T> {
  await loadOneSignalSDK();

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("OneSignal init timed out. Please retry."));
    }, SDK_READY_TIMEOUT_MS);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      if (settled) return;

      try {
        const result = await handler(OneSignal);
        settled = true;
        window.clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        settled = true;
        window.clearTimeout(timeoutId);
        reject(error);
      }
    });
  });
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export interface OneSignalPushState {
  permission: NotificationPermission;
  subscriptionId: string | null;
  token: string | null;
  optedIn: boolean;
}

/**
 * Silently initialises OneSignal without requesting permissions.
 */
export async function initOneSignalSilently() {
  if (initDone) return;

  await withOneSignal(async (OneSignal) => {
    if (initDone) return;

    await OneSignal.init({
      appId: APP_ID,
      serviceWorkerParam: { scope: "/" },
      serviceWorkerPath: "/OneSignalSDKWorker.js",
      notifyButton: { enable: false },
    });

    initDone = true;

    const isStandalone =
      (navigator as any).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    // Fire-and-forget tag
    OneSignal.User.addTag("device_type", isStandalone ? "pwa" : "browser").catch(() => {});
  });
}

export async function getOneSignalPushState(): Promise<OneSignalPushState> {
  return withOneSignal(async (OneSignal) => {
    const subscriptionId = OneSignal.User?.PushSubscription?.id ?? null;
    const token = OneSignal.User?.PushSubscription?.token ?? null;
    const optedIn = OneSignal.User?.PushSubscription?.optedIn === true;

    return {
      permission: Notification.permission,
      subscriptionId,
      token,
      optedIn,
    };
  });
}

/**
 * Requests the native system push permission prompt.
 */
export async function requestPushPermission(): Promise<boolean> {
  return withOneSignal(async (OneSignal) => {
    try {
      if (Notification.permission !== "granted") {
        await OneSignal.Notifications.requestPermission();
      }

      const granted = Notification.permission === "granted";
      if (!granted) return false;

      await OneSignal.User?.PushSubscription?.optIn?.();
      localStorage.setItem(INIT_FLAG, "true");

      return true;
    } catch {
      return false;
    }
  });
}

export async function setOneSignalExternalId(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  await withOneSignal(async (OneSignal) => {
    // optIn first so the subscription is active
    await OneSignal.User?.PushSubscription?.optIn?.();

    // Login links this device to the external_id (email)
    await OneSignal.login(normalizedEmail);
    await OneSignal.User.addEmail(normalizedEmail);
  });
}

export async function waitForValidSubscriptionId(
  timeoutMs = 18000,
  intervalMs = 250
): Promise<{ subscriptionId: string; optedIn: true }> {
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const state = await getOneSignalPushState();
    if (state.subscriptionId && state.token && state.optedIn && state.permission === "granted") {
      return { subscriptionId: state.subscriptionId, optedIn: true };
    }
    await sleep(intervalMs);
  }

  throw new Error("Push subscription not ready yet. Please enable notifications and try again.");
}
