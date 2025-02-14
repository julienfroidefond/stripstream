import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    seriesId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index composé pour s'assurer qu'un utilisateur ne peut pas avoir deux fois le même favori
favoriteSchema.index({ userId: 1, seriesId: 1 }, { unique: true });

export const FavoriteModel = mongoose.models.Favorite || mongoose.model("Favorite", favoriteSchema);
