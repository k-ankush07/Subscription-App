import { getData }       from "./api.js";
import { bindAllEvents } from "./events.js";

(async () => {
  const widget = document.getElementById("subscription-widget");
  if (!widget) return;

  const shop    = window.Shopify?.shop;
  const allData = await getData(shop);

  if (!allData) return;

  bindAllEvents(allData);
})();