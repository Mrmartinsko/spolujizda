import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ForgotPassword from './components/auth/ForgotPassword';
import Login from './components/auth/Login';
import PrivateRoute from './components/auth/PrivateRoute';
import Register from './components/auth/Register';
import ResetPassword from './components/auth/ResetPassword';
import VerifyEmail from './components/auth/VerifyEmail';
import VerifyEmailToken from './components/auth/VerifyEmailToken';
import CarManager from './components/cars/CarManager';
import Layout from './components/Layout/Layout';
import ReservationManager from './components/reservations/ReservationManager';
import EditRide from './components/rides/EditRide';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import './styles/theme.css';
import CreateRidePage from './pages/CreateRidePage';
import HomePage from './pages/HomePage';
import MojeOsobniChaty from './pages/MojeOsobniChaty';
import MujProfil from './pages/MujProfil';
import MyReservationsPage from './pages/MyReservationsPage';
import MyRidesPage from './pages/MyRidesPage';
import Nastaveni from './pages/Nastaveni';
import OhodnotitPage from './pages/OhodnotitPage';
import ProfilUzivatele from './pages/ProfilUzivatele';
import VyhledatJizdu from './pages/VyhledatJizdu';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/verify-email/:token" element={<VerifyEmailToken />} />
              <Route path="/verify-email" element={<VerifyEmail />} />

              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />

                <Route
                  path="nabidnout-jizdu"
                  element={
                    <PrivateRoute>
                      <CreateRidePage />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="moje-jizdy"
                  element={
                    <PrivateRoute>
                      <MyRidesPage />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="moje-rezervace"
                  element={
                    <PrivateRoute>
                      <MyReservationsPage />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="auta"
                  element={
                    <PrivateRoute>
                      <CarManager />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="rezervace"
                  element={
                    <PrivateRoute>
                      <ReservationManager />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="jizdy/:id/upravit"
                  element={
                    <PrivateRoute>
                      <EditRide />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="profil"
                  element={
                    <PrivateRoute>
                      <MujProfil />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="profil/:id"
                  element={
                    <PrivateRoute>
                      <ProfilUzivatele />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="ohodnotit/:jizdaId/:cilovyId"
                  element={
                    <PrivateRoute>
                      <OhodnotitPage />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="nastaveni"
                  element={
                    <PrivateRoute>
                      <Nastaveni />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="vyhledat-jizdu"
                  element={
                    <PrivateRoute>
                      <VyhledatJizdu />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="moje-chaty"
                  element={
                    <PrivateRoute>
                      <MojeOsobniChaty />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="chat/:id"
                  element={
                    <PrivateRoute>
                      <MojeOsobniChaty />
                    </PrivateRoute>
                  }
                />
              </Route>
            </Routes>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
