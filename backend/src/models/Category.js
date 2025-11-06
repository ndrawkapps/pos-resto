// backend/src/models/Category.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const CategorySchema = new Schema(
  {
    name: { type: String, required: true },
  },
  { timestamps: true }
);

const Category =
  mongoose.models?.Category || mongoose.model("Category", CategorySchema);
export default Category;
