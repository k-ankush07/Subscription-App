import mongoose, { Mongoose } from "mongoose";

const planSchema = new mongoose.Schema(
  {
    shop: {
      type: String,
      required: true,
    },
    planId: {
      type: String,
      required: true,
    },
    shopifyGroupId: { type: String, default: null }, 
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
