// backend/src/models/Order.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const OrderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: false },
    name: { type: String, required: true },
    qty: { type: Number, required: true, default: 1 },
    price: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    items: { type: [OrderItemSchema], default: [] },
    total: { type: Number, required: true, default: 0 },
    status: { type: String, default: "paid" }, // gunakan enum sesuai kebutuhan
    orderType: { type: String, default: "dine in" },
    // --- tambahan untuk analytics per-kasir ---
    cashier: { type: Schema.Types.ObjectId, ref: "User", required: false },
    cashierName: { type: String, required: false },
  },
  {
    timestamps: true,
  }
);

export default model("Order", OrderSchema);
