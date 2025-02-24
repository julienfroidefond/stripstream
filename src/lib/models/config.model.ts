import mongoose from "mongoose";

const configSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    url: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    authHeader: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware pour mettre à jour le champ updatedAt avant la sauvegarde
configSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const KomgaConfig =
  mongoose.models.KomgaConfig || mongoose.model("KomgaConfig", configSchema);
