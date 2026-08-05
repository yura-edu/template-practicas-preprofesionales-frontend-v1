export function Placeholder({ name }: { name: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <p className="font-display text-20 text-inkSoft">{name}</p>
    </div>
  )
}
