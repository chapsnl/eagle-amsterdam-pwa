declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
  }
}

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

export function initOneSignal() {
  // Only prepare the deferred queue — SDK is NOT loaded yet.
  // The SDK will be loaded on-demand when the user accepts the push prompt.
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal: any) => {
    await OneSignal.init({
      appId: "e5e608d0-1fad-4e9a-84ca-9812ac96a3a1",
      serviceWorkerParam: { scope: "/" },
      serviceWorkerPath: "/OneSignalSDKWorker.js",
      autoPrompt: false,
      autoRegister: false,
      notifyButton: { enable: false },
      promptOptions: {
        slidedown: {
          prompts: [],
          autoPrompt: false,
        },
        native: {
          enabled: false,
          autoPrompt: false,
        },
      },
    });
  });
}

export async function activateOneSignalPush() {
  await loadOneSignalSDK();
  // Wait for SDK to be ready
  return new Promise<void>((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      await OneSignal.Notifications.requestPermission();
      resolve();
    });
  });
}
