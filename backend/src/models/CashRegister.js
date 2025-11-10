// backend/src/models/CashRegister.js
import mongoose from "mongoose";

const CashRegisterSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    openingAmount: { type: Number, required: true, default: 0 },
    closingAmount: { type: Number, default: null },
    date: { type: String, required: true }, // YYYY-MM-DD
    note: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    closedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CashRegisterSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.models.CashRegister ||
  mongoose.model("CashRegister", CashRegisterSchema);
