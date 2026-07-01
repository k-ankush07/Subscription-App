import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    subscriptionId: { type: String, required: true, unique: true },
    contractId: { type: String },
    contract: { type: Object },
    upcomingCycles: { type: Array },
    internalNotes: { type: String, default: "" },
customerNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Subscription", subscriptionSchema);