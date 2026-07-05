import Link from "next/link"
import { ChevronRight } from "lucide-react"

export interface Kruimel {
  label: string
  href?: string
}

export function Breadcrumb({ items }: { items: Kruimel[] }) {
  return (
    <nav aria-label="Kruimelpad" className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {items.map((item, i) => {
        const laatste = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1.5">
            {item.href && !laatste ? (
              <Link href={item.href} className="underline-offset-2 hover:text-foreground hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className={laatste ? "font-medium text-foreground" : undefined} aria-current={laatste ? "page" : undefined}>
                {item.label}
              </span>
            )}
            {!laatste && <ChevronRight className="size-3.5 shrink-0 text-faint" aria-hidden="true" />}
          </span>
        )
      })}
    </nav>
  )
}
