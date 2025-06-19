import React from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import ImageAnnotationTool from "./pages/Annot/ImageAnnotationTool";






function App() {
  
  return (
    <>
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/image" replace />}  />
        <Route path="/image" element={<ImageAnnotationTool/>} />
      </Routes>
    </Router>
     
    </>
  )
}

export default App
