import mongoose, { Mongoose } from "mongoose";

const planSchema = new mongoose.Schema(
  {
    shop: {
      type: String,
      required: true,
    },
    PlandId: {
      type: String,
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },
    widget: {
      type: String,
      required: true,
    },
    products: {
      type: mongoose.Schema.Types.Mixed,
    },
    customerProductChanges: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Plan", planSchema);
