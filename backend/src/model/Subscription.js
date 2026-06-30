import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    subscriptionId: { type: String, required: true, unique: true },
    contractId: { type: String },
    contract: { type: Object },
  },
  { timestamps: true }
);

export default mongoose.model("Subscription", subscriptionSchema);