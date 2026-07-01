import Subscription from "../model/Subscription.js"; 
const subscription =async (req, res) => {
  try {
    const { subscriptionId, contractId, contract,upcomingCycles,internalNotes,customerNotes} = req.body;

    const updated = await Subscription.findOneAndUpdate(
      { subscriptionId },
      {
        subscriptionId,
        contractId,
        contract,
        upcomingCycles,
        internalNotes,
        customerNotes
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
const getSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const data = await Subscription.findOne({ subscriptionId });

    if (!data) {
      return res.status(404).json({ success: false, error: "Not found" });
    }

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Get error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
export {subscription,getSubscription}