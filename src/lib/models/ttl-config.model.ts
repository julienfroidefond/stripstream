import mongoose from "mongoose";

const ttlConfigSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    defaultTTL: {
      type: Number,
      default: 5,
    },
    homeTTL: {
      type: Number,
      default: 5,
    },
    librariesTTL: {
      type: Number,
      default: 1440,
    },
    seriesTTL: {
      type: Number,
      default: 5,
    },
    booksTTL: {
      type: Number,
      default: 5,
    },
    imagesTTL: {
      type: Number,
      default: 1440,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware pour mettre à jour le champ updatedAt avant la sauvegarde
ttlConfigSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const TTLConfig = mongoose.models.TTLConfig || mongoose.model("TTLConfig", ttlConfigSchema);
