import { GameProvider } from '@/contexts/GameContext'
import RestaurantChooser from '@/components/restaurant-chooser'

export default function Home() {
  return (
    <GameProvider>
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <RestaurantChooser />
      </main>
    </GameProvider>
  )
}