export default function RateLimited() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Too Many Requests</h1>
      <p className="text-zinc-400 mb-8 text-center">
        Please wait a moment before trying again.
        <br />
        The page will refresh automatically in 60 seconds.
      </p>
      <meta httpEquiv="refresh" content="60;url=/auth/signin" />
    </div>
  );
}
