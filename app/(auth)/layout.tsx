export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Ambient horizon glow */}
      <div className="bg-horizon pointer-events-none absolute inset-0" />
      {/* Sun arc, top-right */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sun/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-sea/10 blur-3xl" />
      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  )
}
