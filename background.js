// Configura el comportamiento para que al hacer clic en el icono
// se abra el Panel Lateral directamente.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));