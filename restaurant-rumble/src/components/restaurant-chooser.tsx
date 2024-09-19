'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useUser, SignInButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Utensils, Trophy, Loader2, Smartphone, RotateCw, Zap, Target } from 'lucide-react'
import { useGameContext } from '@/contexts/GameContext'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"


export default function RestaurantChooser() {
  const { user } = useUser()
  const { gameId, setGameId, restaurantName, setRestaurantName } = useGameContext()
  const [shortGameId, setShortGameId] = useState<string | null>(null)
  const [currentGame, setCurrentGame] = useState<string | null>(null)
  const [gameScore, setGameScore] = useState<number>(0)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isReady, setIsReady] = useState<boolean>(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tapButtons, setTapButtons] = useState<boolean[]>([]);
  const [tappedCount, setTappedCount] = useState(0);
  const [tapGameStarted, setTapGameStarted] = useState(false);

  const game = useQuery(api.games.getGame, gameId ? { gameId } : "skip")
  const createGame = useMutation(api.games.createGame)
  const joinGame = useMutation(api.games.joinGame)
  const startGame = useMutation(api.games.startGame)
  const updateScore = useMutation(api.games.updateScore)
  const finishGame = useMutation(api.games.finishGame)
  const setPlayerReady = useMutation(api.games.setPlayerReady)
  const queryGames = useQuery(api.games.queryGames, shortGameId ? { shortId: shortGameId } : "skip")
  useEffect(() => {
    let orientationHandler: ((event: DeviceOrientationEvent) => void) | null = null;
    let motionHandler: ((event: DeviceMotionEvent) => void) | null = null;

    if (game?.status === 'playing' && currentGame) {
      if (currentGame === 'tilt') {
        orientationHandler = handleOrientation;
        window.addEventListener('deviceorientation', orientationHandler);
      } else if (currentGame === 'shake') {
        motionHandler = handleMotion;
        window.addEventListener('devicemotion', motionHandler);
      }
    }

    return () => {
      if (orientationHandler) {
        window.removeEventListener('deviceorientation', orientationHandler);
      }
      if (motionHandler) {
        window.removeEventListener('devicemotion', motionHandler);
      }
    };
  }, [game?.status, currentGame]);

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
    if (currentGame === 'tilt' && event.beta !== null) {
      const tiltThreshold = 20;
      if (Math.abs(event.beta) > tiltThreshold) {
        setGameScore(prevScore => prevScore + 1);
      }
    }
  }

  const handleMotion = (event: DeviceMotionEvent) => {
    if (currentGame === 'shake') {
      const shakeThreshold = 15;
      const { x, y, z } = event.accelerationIncludingGravity ?? {};
      const acceleration = Math.sqrt((x ?? 0) ** 2 + (y ?? 0) ** 2 + (z ?? 0) ** 2);
      if (acceleration > shakeThreshold) {
        setGameScore(prevScore => prevScore + 1);
      }
    }
  }

  const handleCreateGame = async () => {
    if (user && restaurantName) {
      const { id: newGameId, shortId } = await createGame({ creatorId: user.id })
      setGameId(newGameId)
      setShortGameId(shortId)
      await joinGame({ gameId: newGameId, playerId: user.id, restaurantName })
      await setPlayerReady({ gameId: newGameId, playerId: user.id, isReady: true })
    }
  }

  const handleJoinGame = async () => {
    if (user && shortGameId && restaurantName) {
      try {
        const games = await queryGames
        if (games && games.length > 0) {
          const gameId = games[0]._id
          await joinGame({ gameId, playerId: user.id, restaurantName })
          await setPlayerReady({ gameId, playerId: user.id, isReady: true })
          setGameId(gameId)
        } else {
          console.error("No game found with the provided ID")
          // You might want to show an error message to the user here
        }
      } catch (error) {
        console.error("Error joining game:", error)
        // You might want to show an error message to the user here
      }
    } else {
      console.error("Missing required information to join game")
      // You might want to show an error message to the user here
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
    setTimeLeft(30) // 30 seconds for each game
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
    const buttonCount = 16; // 4x4 grid
    setTapButtons(Array(buttonCount).fill(false));
    setTappedCount(0);
    setTapGameStarted(false);
    setTimeout(() => setTapGameStarted(true), 1000); // 1 second delay before start
  };

  const handleTapButton = (index: number) => {
    if (!tapGameStarted) return;
    
    setTapButtons(prev => {
      const newButtons = [...prev];
      newButtons[index] = true;
      return newButtons;
    });
    
    setTappedCount(prev => prev + 1);
    setGameScore(prev => prev + 1);
    
    if (tappedCount + 1 === tapButtons.length) {
      endCurrentGame();
    }
  };

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
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-600 to-blue-500">
        <Card className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-sm shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              Restaurant Rumble
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-center mb-6">Please sign in to play the game.</p>
            <SignInButton mode="modal">
              <Button className="w-full text-lg h-12 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600">
                Sign In
              </Button>
            </SignInButton>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto bg-black/80 backdrop-blur-sm shadow-xl border-4 border-yellow-400">
        <CardHeader className="text-center relative">
          {user && (
            <div className="absolute top-2 right-2">
              <Avatar>
                <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
                <AvatarFallback>{user.fullName?.[0] || "U"}</AvatarFallback>
              </Avatar>
            </div>
          )}
          <CardTitle className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-600 pb-2">
            Restaurant Rumble
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!gameId && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="restaurantName" className="text-lg font-semibold text-yellow-400">Your Restaurant Name</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="restaurantName"
                    type="text"
                    placeholder="Enter your restaurant name"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="text-lg flex-grow bg-gray-800 text-white border-yellow-400"
                  />
                  <span className="text-2xl" aria-label={isReady ? "Ready" : "Not Ready"}>
                    {isReady ? "🍽️" : "❌"}
                  </span>
                </div>
              </div>
              <Button onClick={handleCreateGame} className="w-full text-lg h-12 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold" disabled={!isReady}>
                <Utensils className="mr-2 h-5 w-5" />
                Create New Game
              </Button>
              <div className="space-y-2">
                <Label htmlFor="shortGameId" className="text-lg font-semibold text-yellow-400">Game ID</Label>
                <Input
                  id="shortGameId"
                  type="text"
                  placeholder="Enter game ID to join"
                  onChange={(e) => setShortGameId(e.target.value)}
                  className="text-lg bg-gray-800 text-white border-yellow-400"
                />
              </div>
              <Button onClick={handleJoinGame} className="w-full text-lg h-12 bg-gradient-to-r from-yellow-500 to-red-600 hover:from-yellow-600 hover:to-red-700 text-white font-bold" disabled={!shortGameId || !restaurantName}>
                Join Existing Game
              </Button>
            </div>
          )}
          {game?.status === 'joining' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-xl font-bold mb-2">Waiting for restaurants to join</p>
                {shortGameId && (
                  <div className="bg-yellow-400 text-black p-4 rounded-lg mb-4">
                    <p className="text-lg font-bold">Game ID:</p>
                    <p className="text-3xl font-mono tracking-wider">{shortGameId}</p>
                    <Button
                      onClick={() => navigator.clipboard.writeText(shortGameId)}
                      className="mt-2 bg-black text-yellow-400 hover:bg-gray-800"
                    >
                      Copy ID
                    </Button>
                  </div>
                )}
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
                <h3 className="text-xl font-bold mb-4 text-center">Leaderboard</h3>
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
                <div className="space-y-4">
                  {!tapGameStarted && <p className="text-2xl font-bold text-center">Get ready...</p>}
                  <div className="grid grid-cols-4 gap-2">
                    {tapButtons.map((tapped, index) => (
                      <Button
                        key={index}
                        onClick={() => handleTapButton(index)}
                        disabled={tapped}
                        className={`w-full h-16 ${
                          tapped 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600'
                        }`}
                      >
                        {tapped ? '✓' : ''}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xl text-center">
                    Tapped: {tappedCount} / {tapButtons.length}
                  </p>
                </div>
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
              <h3 className="text-3xl font-extrabold mb-4">Game Over!</h3>
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
