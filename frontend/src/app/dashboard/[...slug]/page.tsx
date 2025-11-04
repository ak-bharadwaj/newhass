import { notFound } from 'next/navigation'

// Remove placeholder behavior; any unknown dashboard route will return a real 404.
export default function DashboardCatchAllPage() {
  notFound()
}
