// Append this code to output for live reload
export function enableHMR() {
  new EventSource("http://localhost:8000/esbuild").addEventListener(
    "change",

    () => {
      location.reload()
    }
  )
}

enableHMR()
