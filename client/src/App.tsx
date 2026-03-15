import { BrowserRouter, Routes, Route } from 'react-router'
import { Landing } from './routes/Landing'
import { Select } from './routes/Select'
import { Import } from './routes/Import'
import { Book } from './routes/Book'
import { BookRedirect } from './routes/BookRedirect'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/select" element={<Select />} />
        <Route path="/import" element={<Import />} />
        <Route path="/:bookId" element={<BookRedirect />} />
        <Route path="/:bookId/study/:chapter" element={<Book />} />
        <Route path="/:bookId/read/:chapter" element={<Book />} />
{/* catch-all removed — /:bookId handles unknown paths */}
      </Routes>
    </BrowserRouter>
  )
}
