import mongoose from "mongoose";

const preferencesSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    showThumbnails: {
      type: Boolean,
      default: true,
    },
    cacheMode: {
      type: String,
      enum: ["memory", "file"],
      default: "memory",
    },
  },
  {
    timestamps: true,
  }
);

export const PreferencesModel =
  mongoose.models.Preferences || mongoose.model("Preferences", preferencesSchema);
