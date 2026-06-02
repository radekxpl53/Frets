import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ConfirmEmail from "./pages/ConfirmEmail";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import SongPage from "./pages/SongPage";
import AddSong from "./pages/AddSong";
import Drafts from "./pages/Drafts";
import DraftPage from "./pages/DraftPage";
import Admin from "./pages/Admin";
import ProtectedRoute from "./components/ProtectedRoute";
import Chords from "./pages/Chords";
import ChordFamily from "./pages/ChordFamily";
import Artists from "./pages/Artists";
import ArtistPage from "./pages/ArtistPage";

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
          <Route path="/drafts" element={<Drafts />} />
          <Route path="/drafts/:artist/:title" element={<DraftPage />} />
          <Route path="/artists" element={<Artists />} />
          <Route path="/artists/:slug" element={<ArtistPage />} />
          <Route path="/songs/:artist/:title" element={<SongPage />} />
          <Route path="/songs/add" element={
            <ProtectedRoute>
              <AddSong />
            </ProtectedRoute>
          } />
          <Route path="/chords" element={<Chords />} />
          <Route path="/chords/:key" element={<ChordFamily />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <Admin />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      
    </AuthProvider>
  );
}

export default App;