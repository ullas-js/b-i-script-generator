import { BrowserRouter, Routes, Route } from "react-router-dom"
import { HomePage, RowMergePage } from "./pages"

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/row-merge" element={<RowMergePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}