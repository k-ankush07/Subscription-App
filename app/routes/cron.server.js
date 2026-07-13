// import cron from "node-cron";

// let started = false;

// export function startBillingCycleCron() {
//   if (started) return;
//   started = true;

//   cron.schedule("*/15 * * * *", async () => {
//     console.log("[cron] Running process-billing-cycles...");
//     try {
//       const res = await fetch(`${process.env.SHOPIFY_APP_URL}/api/process-billing-cycles`, {
//         method: "POST",
//         headers: { "x-cron-secret": process.env.CRON_SECRET },
//       });

//       if (!res.ok) {
//         const text = await res.text();
//         console.error(`[cron] Non-OK response (${res.status}):`, text);
//         return;
//       }

//       const data = await res.json();
//       console.log("[cron] Done:", JSON.stringify(data));
//     } catch (err) {
//       console.error("[cron] Failed:", err);
//     }
//   });

//   console.log("[cron] Billing cycle scheduler started (every 15 min).");
// }