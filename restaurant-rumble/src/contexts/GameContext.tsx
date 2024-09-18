'use client'
import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Id } from "../../convex/_generated/dataModel"

interface GameContextType {
  gameId: Id<"games"> | null
  setGameId: React.Dispatch<React.SetStateAction<Id<"games"> | null>>
  restaurantName: string
  setRestaurantName: React.Dispatch<React.SetStateAction<string>>
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameId, setGameId] = useState<Id<"games"> | null>(null)
  const [restaurantName, setRestaurantName] = useState<string>('')

  return (
    <GameContext.Provider value={{ gameId, setGameId, restaurantName, setRestaurantName }}>
      {children}
    </GameContext.Provider>
  )
}

export const useGameContext = () => {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameProvider')
  }
  return context
}