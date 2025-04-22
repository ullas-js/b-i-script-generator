import { BrowserRouter, Routes, Route } from "react-router-dom"
import { HomePage, RowMergePage, ReadFormula, NotBatchInstructionPage } from "./pages"

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/row-merge" element={<RowMergePage />} />
          <Route path="/read-formula" element={<ReadFormula />} />
          <Route path="/not-batch-instruction" element={<NotBatchInstructionPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}