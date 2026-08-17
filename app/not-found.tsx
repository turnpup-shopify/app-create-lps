import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-[720px] px-6 pt-10 pb-24">
      <span className="label">Landing page outline</span>
      <h1 className="masthead mt-2">Nothing lives at that address</h1>
      <p className="mt-4 max-w-[44ch] text-muted">
        The outline may have been deleted. Open the list and pick another one, or start a new outline.
      </p>
      <p className="mt-5">
        <Link className="button no-underline" href="/">
          Open the list
        </Link>
      </p>
    </main>
  )
}
