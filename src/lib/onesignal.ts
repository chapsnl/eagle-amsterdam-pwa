declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
  }
}

export function initOneSignal() {
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
