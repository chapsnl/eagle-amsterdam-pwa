declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
  }
}

const APP_ID = "e5e608d0-1fad-4e9a-84ca-9812ac96a3a1";

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
 * Loads the SDK, initialises OneSignal silently, then requests permission.
 * Called ONLY when the user clicks "ENTER" in the custom modal.
 */
export async function activateOneSignalPush() {
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
        promptOptions: {
          slidedown: {
            prompts: [
              {
                type: "push",
                autoPrompt: false,
              },
            ],
          },
          native: {
            enabled: false,
            autoPrompt: false,
          },
        },
      });

      await OneSignal.Notifications.requestPermission();
      resolve();
    });
  });
}
