import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function generateShortId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const createGame = mutation({
  args: { creatorId: v.string() },
  handler: async (ctx, args) => {
    const shortId = generateShortId();
    const gameId = await ctx.db.insert("games", {
      creatorId: args.creatorId,
      status: "joining",
      players: [],
      shortId: shortId,
      // ... other game properties
    });
    return { id: gameId, shortId: shortId };
  },
});

export const joinGame = mutation({
  args: { gameId: v.id("games"), playerId: v.string(), restaurantName: v.string() },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game || game.status !== "joining") {
      throw new Error("Cannot join this game");
    }
    
    const updatedPlayers = [...game.players, { id: args.playerId, restaurantName: args.restaurantName, score: 0, isReady: false }];
    await ctx.db.patch(args.gameId, { players: updatedPlayers });
  },
});

export const setPlayerReady = mutation({
  args: { gameId: v.id("games"), playerId: v.string(), isReady: v.boolean() },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game || game.status !== "joining") {
      throw new Error("Cannot update player status");
    }
    
    const updatedPlayers = game.players.map(player => 
      player.id === args.playerId 
        ? { ...player, isReady: args.isReady }
        : player
    );
    await ctx.db.patch(args.gameId, { players: updatedPlayers });
  },
});

export const startGame = mutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const { gameId } = args;
    
    // Verify the game exists and is in 'joining' status
    const game = await ctx.db.get(gameId);
    if (!game || game.status !== 'joining') {
      throw new Error('Invalid game or game already started');
    }

    // Update the game status to 'playing'
    await ctx.db.patch(gameId, { status: 'playing' });

    return { success: true };
  },
});

export const updateScore = mutation({
  args: { gameId: v.id("games"), playerId: v.string(), scoreIncrement: v.number() },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game || game.status !== "playing") {
      throw new Error("Cannot update score for this game");
    }
    
    const updatedPlayers = game.players.map(player => 
      player.id === args.playerId 
        ? { ...player, score: player.score + args.scoreIncrement }
        : player
    );
    await ctx.db.patch(args.gameId, { players: updatedPlayers });
  },
});

export const finishGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game || game.status !== "playing") {
      throw new Error("Cannot finish this game");
    }
    
    const winner = game.players.reduce((prev, current) => (prev.score > current.score) ? prev : current);
    await ctx.db.patch(args.gameId, { status: "finished", winner: winner.restaurantName });
  },
});

export const getGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.gameId);
  },
});

export const queryGames = query({
  args: { shortId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("games")
      .filter((q) => q.eq(q.field("shortId"), args.shortId))
      .collect();
  },
});