import type { Metadata } from 'next'
import { HomeContent } from './home-content'

export const metadata: Metadata = {
  title: 'Overview — Current',
  description: 'AGV / Warehouse Automation Planning — Throughput Verification & Capacity Analysis',
}

export default function HomePage() {
  return <HomeContent />
}
