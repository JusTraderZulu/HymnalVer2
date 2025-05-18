import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="space-y-6 max-w-md">
        <h1 className="text-4xl font-bold tracking-tighter">404 - Page Not Found</h1>
        <p className="text-muted-foreground">
          The hymn or page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/" passHref>
          <Button className="gap-2">
            <Home className="h-4 w-4" />
            <span>Back to Hymnal</span>
          </Button>
        </Link>
      </div>
    </div>
  )
} 