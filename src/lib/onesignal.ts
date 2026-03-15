declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
  }
}

const APP_ID = "e5e608d0-1fad-4e9a-84ca-9812ac96a3a1";
const INIT_FLAG = "eagle-onesignal-initialized";

let sdkLoaded = false;

function loadOneSignalSDK(): Promise<void> {
  if (sdkLoaded) return Promise.resolve();
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    script.onload = () => {
      sdkLoaded = true;
      resolve();
    };
    document.head.appendChild(script);
  });
}

/**
 * Silently initialises OneSignal without requesting permissions.
 * No custom UI at all — just background SDK setup.
 */
export async function initOneSignalSilently() {
  await loadOneSignalSDK();

  return new Promise<void>((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      await OneSignal.init({
        appId: APP_ID,
        serviceWorkerParam: { scope: "/" },
        serviceWorkerPath: "/OneSignalSDKWorker.js",
        autoPrompt: false,
        autoRegister: false,
        notifyButton: { enable: false },
      });

      // Tag device type: PWA (standalone) vs browser
      const isStandalone =
        (navigator as any).standalone === true ||
        window.matchMedia("(display-mode: standalone)").matches;
      await OneSignal.User.addTag("device_type", isStandalone ? "pwa" : "browser");

      resolve();
    });
  });
}

/**
 * Requests the native system push permission prompt.
 * Must be called from a user interaction (click/tap) for browser compliance.
 */
export async function requestPushPermission() {
  await loadOneSignalSDK();

  return new Promise<void>((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.Notifications.requestPermission();
        localStorage.setItem(INIT_FLAG, "true");
        console.log("[OneSignal] Permission requested via user interaction");
      } catch (err) {
        console.warn("[OneSignal] Permission request failed:", err);
      }
      resolve();
    });
  });
}

/**
 * Sets the OneSignal External User ID so the backend can target push
 * notifications to a specific user by their email address.
 */
export async function setOneSignalExternalId(email: string) {
  await loadOneSignalSDK();

  return new Promise<void>((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.login(email);
        console.log("[OneSignal] External ID set to:", email);
      } catch (err) {
        console.warn("[OneSignal] Failed to set external ID:", err);
      }
      resolve();
    });
  });
}
