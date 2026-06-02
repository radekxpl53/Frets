import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ConfirmEmail from "./pages/ConfirmEmail";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import SongPage from "./pages/SongPage";
import AddSong from "./pages/AddSong";
import ProtectedRoute from "./components/ProtectedRoute";
import Chords from "./pages/Chords";
import ChordFamily from "./pages/ChordFamily";

function Placeholder({ name }) {
  return <div className="container mt-4"><h2>{name}</h2></div>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/confirm-email" element={<ConfirmEmail />} />
          <Route path="/songs/:artist/:title" element={<SongPage />} />
          <Route path="/songs/add" element={
            <ProtectedRoute>
              <AddSong />
            </ProtectedRoute>
          } />
          <Route path="/chords" element={<Chords />} />
          <Route path="/chords/:key" element={<ChordFamily />} />
        </Routes>
      </BrowserRouter>
      
    </AuthProvider>
  );
}

export default App;