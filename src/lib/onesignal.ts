declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
  }
}

const APP_ID = "e5e608d0-1fad-4e9a-84ca-9812ac96a3a1";
const INIT_FLAG = "eagle-onesignal-initialized";

let sdkLoaded = false;
let sdkLoadPromise: Promise<void> | null = null;

const SDK_LOAD_TIMEOUT_MS = 8000;
const SDK_READY_TIMEOUT_MS = 7000;

async function loadOneSignalSDK(): Promise<void> {
  if (sdkLoaded) return;

  if (!sdkLoadPromise) {
    sdkLoadPromise = new Promise((resolve, reject) => {
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
 * No custom UI at all — just background SDK setup.
 */
export async function initOneSignalSilently() {
  await withOneSignal(async (OneSignal) => {
    await OneSignal.init({
      appId: APP_ID,
      serviceWorkerParam: { scope: "/" },
      serviceWorkerPath: "/OneSignalSDKWorker.js",
      serviceWorkerUpdaterPath: "/OneSignalSDKUpdaterWorker.js",
      autoPrompt: false,
      autoRegister: true,
      notifyButton: { enable: false },
    });

    const isStandalone =
      (navigator as any).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    await OneSignal.User.addTag("device_type", isStandalone ? "pwa" : "browser");
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
 * Must be called from a user interaction (click/tap) for browser compliance.
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
      console.log("[OneSignal] Permission granted + optIn forced via user interaction");

      return true;
    } catch (err) {
      console.warn("[OneSignal] Permission request failed:", err);
      return false;
    }
  });
}

export async function setOneSignalExternalId(email: string) {
  await withOneSignal(async (OneSignal) => {
    await OneSignal.login(email);
    await OneSignal.User.addEmail(email);
    await OneSignal.User?.PushSubscription?.optIn?.();
    console.log("[OneSignal] External ID + email set and push optIn forced:", email);
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
