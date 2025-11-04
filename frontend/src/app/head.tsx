export default function Head() {
  // Preconnect to backend and object storage to speed up first requests
  // Domains are based on default docker-compose settings
  return (
    <>
      <link rel="preconnect" href="http://localhost:8000" crossOrigin="anonymous" />
      <link rel="preconnect" href="http://localhost:9000" crossOrigin="anonymous" />
    </>
  )
}
