import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import ConfirmEmail from "./pages/ConfirmEmail/ConfirmEmail";
import ConfirmEmailChange from "./pages/ConfirmEmailChange/ConfirmEmailChange";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import Navbar from "./components/Navbar";
import Home from "./pages/Home/Home";
import SongPage from "./pages/SongPage/SongPage";
import VersionSuggestionsPage from "./pages/VersionSuggestionsPage/VersionSuggestionsPage";
import AddSong from "./pages/AddSong/AddSong";
import Drafts from "./pages/Drafts/Drafts";
import DraftPage from "./pages/DraftPage/DraftPage";
import Admin from "./pages/Admin/Admin";
import ProtectedRoute from "./components/ProtectedRoute";
import Chords from "./pages/Chords/Chords";
import ChordFamily from "./pages/ChordFamily/ChordFamily";
import Artists from "./pages/Artists/Artists";
import ArtistPage from "./pages/ArtistPage/ArtistPage";
import ProfilePage from "./pages/ProfilePage/ProfilePage";
import ProfileRedirect from "./pages/ProfileRedirect/ProfileRedirect";
import Tuner from "./pages/Tuner/Tuner";
import { Navigate } from "react-router-dom";

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
          <Route path="/confirm-email-change" element={<ConfirmEmailChange />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/drafts" element={<Drafts />} />
          <Route path="/drafts/:artist/:title/suggestions" element={<VersionSuggestionsPage />} />
          <Route path="/drafts/:artist/:title" element={<DraftPage />} />
          <Route path="/artists" element={<Artists />} />
          <Route path="/artists/:slug" element={<ArtistPage />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileRedirect />
              </ProtectedRoute>
            }
          />
          <Route path="/users/:slug" element={<ProfilePage />} />
          <Route path="/songs/:artist/:title/suggestions" element={<VersionSuggestionsPage />} />
          <Route path="/songs/:artist/:title" element={<SongPage />} />
          <Route path="/songs/add" element={
            <ProtectedRoute>
              <AddSong />
            </ProtectedRoute>
          } />
          <Route path="/chords" element={<Chords />} />
          <Route path="/chords/:key" element={<ChordFamily />} />
          <Route path="/tuner" element={<Tuner />} />
          <Route path="/learn" element={<Navigate to="/chords" replace />} />
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