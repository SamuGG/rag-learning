import { Router } from '@solidjs/router'
import { FileRoutes } from '@solidjs/start/router'
import { onMount, Suspense } from 'solid-js'
import './app.css'

export default function App() {
  // Lets end-to-end tests wait until the page is interactive.
  onMount(() => {
    document.body.dataset.hydrated = 'true'
  })
  return (
    <Router root={props => <Suspense>{props.children}</Suspense>}>
      <FileRoutes />
    </Router>
  )
}
