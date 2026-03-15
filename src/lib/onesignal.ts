declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
  }
}

const APP_ID = "e5e608d0-1fad-4e9a-84ca-9812ac96a3a1";
const INIT_FLAG = "eagle-onesignal-initialized";

let sdkLoaded = false;
let sdkLoadPromise: Promise<void> | null = null;

async function loadOneSignalSDK(): Promise<void> {
  if (sdkLoaded) return;
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    script.onload = () => {
      sdkLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load OneSignal SDK"));
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

async function withOneSignal<T>(handler: (OneSignal: any) => Promise<T>): Promise<T> {
  await loadOneSignalSDK();

  return new Promise<T>((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        const result = await handler(OneSignal);
        resolve(result);
      } catch (error) {
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
      autoPrompt: false,
      autoRegister: false,
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
    const optedIn = OneSignal.User?.PushSubscription?.optedIn === true;

    return {
      permission: Notification.permission,
      subscriptionId,
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
      if (granted) {
        localStorage.setItem(INIT_FLAG, "true");
        console.log("[OneSignal] Permission granted via user interaction");
      }

      return granted;
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
    console.log("[OneSignal] External ID + email set to:", email);
  });
}

export async function waitForValidSubscriptionId(
  timeoutMs = 12000,
  intervalMs = 250
): Promise<{ subscriptionId: string; optedIn: true }> {
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const state = await getOneSignalPushState();
    if (state.subscriptionId && state.optedIn) {
      return { subscriptionId: state.subscriptionId, optedIn: true };
    }
    await sleep(intervalMs);
  }

  throw new Error("Push subscription not ready yet. Please enable notifications and try again.");
}
