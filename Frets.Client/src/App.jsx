import { createBrowserRouter, RouterProvider, Outlet, Navigate } from "react-router-dom";
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
import ErrorBoundary from "./components/ErrorBoundary";
import Chords from "./pages/Chords/Chords";
import ChordFamily from "./pages/ChordFamily/ChordFamily";
import Artists from "./pages/Artists/Artists";
import ArtistPage from "./pages/ArtistPage/ArtistPage";
import ProfilePage from "./pages/ProfilePage/ProfilePage";
import ProfileRedirect from "./pages/ProfileRedirect/ProfileRedirect";
import Tuner from "./pages/Tuner/Tuner";

function Layout() {
  return (
    <>
      <Navbar />
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "/confirm-email", element: <ConfirmEmail /> },
      { path: "/confirm-email-change", element: <ConfirmEmailChange /> },
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/reset-password", element: <ResetPassword /> },
      { path: "/drafts", element: <Drafts /> },
      { path: "/drafts/:artist/:title/suggestions", element: <VersionSuggestionsPage /> },
      { path: "/drafts/:artist/:title", element: <DraftPage /> },
      { path: "/artists", element: <Artists /> },
      { path: "/artists/:slug", element: <ArtistPage /> },
      {
        path: "/profile",
        element: (
          <ProtectedRoute>
            <ProfileRedirect />
          </ProtectedRoute>
        ),
      },
      { path: "/users/:slug", element: <ProfilePage /> },
      { path: "/songs/:artist/:title/suggestions", element: <VersionSuggestionsPage /> },
      { path: "/songs/:artist/:title", element: <SongPage /> },
      {
        path: "/songs/add",
        element: (
          <ProtectedRoute>
            <AddSong />
          </ProtectedRoute>
        ),
      },
      { path: "/chords", element: <Chords /> },
      { path: "/chords/:key", element: <ChordFamily /> },
      { path: "/tuner", element: <Tuner /> },
      { path: "/learn", element: <Navigate to="/chords" replace /> },
      {
        path: "/admin",
        element: (
          <ProtectedRoute adminOnly>
            <Admin />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
