export async function registerPwa({onUpdate, onOfflineReady} = {}) {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return null;
  const registration = await navigator.serviceWorker.register("service-worker.js", {scope:"./", updateViaCache:"none"});
  let reloadRequested = false;
  const notifyWaiting = () => registration.waiting && onUpdate?.(() => {
    reloadRequested = true;
    registration.waiting.postMessage({type:"SKIP_WAITING"});
  });
  notifyWaiting();
  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    worker?.addEventListener("statechange", () => {
      if (worker.state === "installed") {
        if (navigator.serviceWorker.controller) notifyWaiting();
        else onOfflineReady?.();
      }
    });
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadRequested) { reloadRequested = false; location.reload(); }
  });
  return registration;
}
