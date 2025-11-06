// backend/src/models/Product.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, default: 0 },
    category: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    image: { type: String, default: null }, // filename or path
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Product", ProductSchema);
