import RestaurantChooser from '../components/restaurant-chooser'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <RestaurantChooser />
    </main>
  )
}