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
  },
  {
    timestamps: true,
  }
);

export const PreferencesModel =
  mongoose.models.Preferences || mongoose.model("Preferences", preferencesSchema);
