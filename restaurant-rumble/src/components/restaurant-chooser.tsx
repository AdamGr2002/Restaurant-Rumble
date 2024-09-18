'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Utensils, Trophy, Loader2, Smartphone, RotateCw, Zap, Target } from 'lucide-react'
import { useGameContext } from '@/contexts/GameContext'
import { Id } from "../../convex/_generated/dataModel"

export default function RestaurantChooser() {
  const { user } = useUser()
  const { gameId, setGameId, restaurantName, setRestaurantName } = useGameContext()
  const [currentGame, setCurrentGame] = useState<string | null>(null)
  const [gameScore, setGameScore] = useState<number>(0)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isReady, setIsReady] = useState<boolean>(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const game = useQuery(api.games.getGame, gameId ? { gameId } : "skip")
  const createGame = useMutation(api.games.createGame)
  const joinGame = useMutation(api.games.joinGame)
  const startGame = useMutation(api.games.startGame)
  const updateScore = useMutation(api.games.updateScore)
  const finishGame = useMutation(api.games.finishGame)
  const setPlayerReady = useMutation(api.games.setPlayerReady)

  useEffect(() => {
    if (game?.status === 'playing') {
      window.addEventListener('deviceorientation', handleOrientation)
      window.addEventListener('devicemotion', handleMotion)
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
      window.removeEventListener('devicemotion', handleMotion)
    }
  }, [game?.status])

  useEffect(() => {
    if (currentGame && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && currentGame) {
      endCurrentGame()
    }
  }, [currentGame, timeLeft])

  useEffect(() => {
    setIsReady(restaurantName.length > 0)
  }, [restaurantName])

  const handleOrientation = (event: DeviceOrientationEvent) => {
    if (currentGame === 'tilt' && event.beta && event.beta > 60) {
      setGameScore(prevScore => prevScore + 1)
    }
  }

  const handleMotion = (event: DeviceMotionEvent) => {
    if (currentGame === 'shake') {
      const shakeThreshold = 15
      const { x, y, z } = event.accelerationIncludingGravity || {}
      if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number') {
        const movement = Math.abs(x + y + z)
        if (movement > shakeThreshold) {
          setGameScore(prevScore => prevScore + 1)
        }
      }
    }
  }

  const handleCreateGame = async () => {
    if (user && restaurantName) {
      const newGameId = await createGame({ creatorId: user.id })
      setGameId(newGameId)
      await joinGame({ gameId: newGameId, playerId: user.id, restaurantName })
      await setPlayerReady({ gameId: newGameId, playerId: user.id, isReady: true })
    }
  }

  const handleJoinGame = async () => {
    if (user && gameId && restaurantName) {
      await joinGame({ gameId, playerId: user.id, restaurantName })
      await setPlayerReady({ gameId, playerId: user.id, isReady: true })
    }
  }

  const handleStartGame = async () => {
    if (gameId) {
      await startGame({ gameId })
    }
  }

  const handleFinishGame = async () => {
    if (gameId) {
      await finishGame({ gameId })
    }
  }

  const startMiniGame = (gameName: string) => {
    setCurrentGame(gameName)
    setGameScore(0)
    setTimeLeft(10) // 10 seconds for each game
    if (gameName === 'tap') {
      initTapGame()
    } else if (gameName === 'draw') {
      initDrawGame()
    }
  }

  const endCurrentGame = async () => {
    if (gameId && user) {
      await updateScore({ gameId, playerId: user.id, scoreIncrement: gameScore })
      setCurrentGame(null)
    }
  }

  const initTapGame = () => {
    // Initialize tap game
  }

  const initDrawGame = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = 'black'
        ctx.font = '20px Arial'
        ctx.fillText('Draw here!', 10, 30)
      }
    }
  }

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentGame === 'draw') {
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = 'blue'
          ctx.beginPath()
          ctx.arc(event.nativeEvent.offsetX, event.nativeEvent.offsetY, 2, 0, Math.PI * 2)
          ctx.fill()
          setGameScore(prevScore => prevScore + 1)
        }
      }
    }
  }

  if (!user) {
    return <div>Please sign in to play.</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-sm shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Restaurant Rumble
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!gameId && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="restaurantName" className="text-lg font-semibold">Your Restaurant Name</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="restaurantName"
                    type="text"
                    placeholder="Enter your restaurant name"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="text-lg flex-grow"
                  />
                  <span className="text-2xl" aria-label={isReady ? "Ready" : "Not Ready"}>
                    {isReady ? "✅" : "❌"}
                  </span>
                </div>
              </div>
              <Button onClick={handleCreateGame} className="w-full text-lg h-12 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600" disabled={!isReady}>
                <Utensils className="mr-2 h-5 w-5" />
                Create New Game
              </Button>
              <div className="space-y-2">
                <Label htmlFor="gameId" className="text-lg font-semibold">Game ID</Label>
                <Input
                  id="gameId"
                  type="text"
                  placeholder="Enter game ID to join"
                  onChange={(e) => setGameId(e.target.value as Id<"games">)}
                  className="text-lg"
                />
              </div>
              <Button onClick={handleJoinGame} className="w-full text-lg h-12 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600" disabled={!gameId || !isReady}>
                Join Existing Game
              </Button>
            </div>
          )}
          {game?.status === 'joining' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-xl font-bold mb-2">Waiting for restaurants to join</p>
                <p className="text-lg">Game ID: <span className="font-mono bg-gray-200 px-2 py-1 rounded">{gameId}</span></p>
              </div>
              <Button onClick={handleStartGame} className="w-full text-lg h-12 bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600" disabled={game.players.length < 2 || !game.players.every(player => player.isReady)}>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Start the Rumble!
              </Button>
              <div className="mt-4">
                <h3 className="text-xl font-bold mb-2">Restaurants in the game:</h3>
                <ul className="space-y-2">
                  {game.players.map(player => (
                    <li key={player.id} className="bg-gray-100 rounded-lg p-2 text-lg font-semibold flex justify-between items-center">
                      <span>{player.restaurantName}</span>
                      <span>{player.isReady ? "✅" : "❌"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {game?.status === 'playing' && !currentGame && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-center">Choose a Mini-Game!</h3>
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={() => startMiniGame('shake')} className="h-24 text-lg font-bold bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600">
                  <Smartphone className="mr-2 h-6 w-6" />
                  Shake It!
                </Button>
                <Button onClick={() => startMiniGame('tilt')} className="h-24 text-lg font-bold bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600">
                  <RotateCw className="mr-2 h-6 w-6" />
                  Tilt It!
                </Button>
                <Button onClick={() => startMiniGame('tap')} className="h-24 text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600">
                  <Zap className="mr-2 h-6 w-6" />
                  Tap It!
                </Button>
                <Button onClick={() => startMiniGame('draw')} className="h-24 text-lg font-bold bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600">
                  <Target className="mr-2 h-6 w-6" />
                  Draw It!
                </Button>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold mb-4 text-center">Leaderboard</h3>
                <ul className="space-y-3">
                  {game.players.sort((a, b) => b.score - a.score).map((player, index) => (
                    <li key={player.id} className={`flex justify-between items-center p-3 rounded-lg ${index === 0 ? 'bg-yellow-200' : 'bg-gray-100'}`}>
                      <span className="text-lg font-semibold">{player.restaurantName}</span>
                      <span className="text-2xl font-bold">{player.score} pts</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button onClick={handleFinishGame} className="w-full text-lg h-12 bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600">
                End the Rumble
              </Button>
            </div>
          )}
          {currentGame && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-center">{currentGame.charAt(0).toUpperCase() + currentGame.slice(1)} Game</h3>
              <div className="text-center">
                <p className="text-4xl font-bold">{gameScore}</p>
                <p className="text-xl">points</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{timeLeft}</p>
                <p className="text-xl">seconds left</p>
              </div>
              {currentGame === 'tap' && (
                <Button onClick={() => setGameScore(prevScore => prevScore + 1)} className="w-full h-32 text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600">
                  TAP ME!
                </Button>
              )}
              {currentGame === 'draw' && (
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={300}
                  onMouseMove={handleCanvasMouseMove}
                  className="border-2 border-gray-300 rounded-lg mx-auto"
                />
              )}
              {(currentGame === 'shake' || currentGame === 'tilt') && (
                <p className="text-xl text-center font-bold">
                  {currentGame === 'shake' ? 'Shake your phone!' : 'Tilt your phone forward!'}
                </p>
              )}
            </div>
          )}
          {game?.status === 'finished' && (
            <div className="text-center space-y-6">
              <h3 className="text-3xl font-extrabol
d mb-4">Game Over!</h3>
              <div className="bg-yellow-200 p-6 rounded-lg shadow-inner">
                <Trophy className="mx-auto h-16 w-16 text-yellow-600 mb-4" />
                <p className="text-2xl font-bold">The winning restaurant is:</p>
                <p className="text-3xl font-extrabold text-purple-600 mt-2">{game.winner}</p>
              </div>
              <Button onClick={() => window.location.reload()} className="w-full text-lg h-12 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600">
                Play Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}