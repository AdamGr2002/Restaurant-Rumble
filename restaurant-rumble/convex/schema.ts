import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  games: defineTable({
    creatorId: v.string(),
    players: v.array(
      v.object({
        id: v.string(),
        restaurantName: v.string(),
        score: v.number(),
        isReady: v.boolean(),
      })
    ),
    status: v.union(v.literal("joining"), v.literal("playing"), v.literal("finished")),
    winner: v.optional(v.string()),
  }),
});