import Subscription from "../model/Subscription.js"; 
const subscription =async (req, res) => {
  try {
    const { subscriptionId, contractId, contract } = req.body;

    const updated = await Subscription.findOneAndUpdate(
      { subscriptionId },
      {
        subscriptionId,
        contractId,
        contract,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
export {subscription}