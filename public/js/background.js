let talentaConfig = {
  authCookie: '',
  latitude: '',
  longitude: '',
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ talentaConfig });
});
