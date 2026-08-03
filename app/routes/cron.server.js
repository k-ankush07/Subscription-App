import cron from "node-cron";
export function startBillingCycleCron() {
  if (globalThis.__billingCronStarted) {
    console.log("[cron] Already started, skipping duplicate init.");
    return;
  }
  globalThis.__billingCronStarted = true;
  cron.schedule("* * * * *", async () => {
    console.log("[cron] Running process-billing-cycles...");
    console.log("process.env https://telecharger-gain-technique-accepting.trycloudflare.com")
    try {
      const res = await fetch(`https://telecharger-gain-technique-accepting.trycloudflare.com/api/process-billing-cycles`, {
        method: "POST",
        headers: { "x-cron-secret": process.env.CRON_SECRET },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`[cron] Non-OK response (${res.status}):`, text);
        return;
      }

      const data = await res.json();
      console.log("[cron] Done:", JSON.stringify(data));
    } catch (err) {
      console.error("[cron] Failed:", err);
    }
  });

  console.log("[cron] Billing cycle scheduler started (every 5 min).");
}