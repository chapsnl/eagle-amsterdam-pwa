declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
  }
}

export function initOneSignal() {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push((OneSignal: any) => {
    OneSignal.init({
      appId: "e5e608d0-1fad-4e9a-84ca-9812ac96a3a1",
      serviceWorkerParam: { scope: "/" },
      serviceWorkerPath: "/OneSignalSDKWorker.js",
      promptOptions: {
        slidedown: {
          prompts: [
            {
              type: "push",
              autoPrompt: true,
              text: {
                actionMessage: "Would you like to stay updated on the latest events at Eagle Amsterdam?",
                acceptButton: "Yes!",
                cancelButton: "Later",
              },
              delay: {
                pageViews: 1,
                timeDelay: 5,
              },
            },
          ],
        },
      },
    });
  });
}
