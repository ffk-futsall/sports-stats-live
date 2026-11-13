import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initCloudSync } from './lib/cloudSync'

// Pret deri në 4 sekonda që të dhënat nga cloud të vendosen para se të hapet aplikacioni.
const timeout = new Promise<void>((resolve) => setTimeout(resolve, 4000));
Promise.race([initCloudSync().catch(() => {}), timeout]).finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
