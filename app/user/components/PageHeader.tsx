export function PageHeader({
  title,
  description,
  actions,
  widthClassName = 'max-w-7xl',
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  widthClassName?: string
}) {
  return (
    <div className="border-b border-neutral-200 bg-white">
      <div
        className={`mx-auto flex ${widthClassName} flex-col gap-4 px-4 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-6`}
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
