import React from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';

import Layout from './components/Layout/Layout';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import HomePage from './pages/HomePage';
import CreateRidePage from './pages/CreateRidePage';
import MyRidesPage from './pages/MyRidesPage';
import MyReservationsPage from './pages/MyReservationsPage';
import CarManager from './components/cars/CarManager';
import ReservationManager from './components/reservations/ReservationManager';
import PrivateRoute from './components/auth/PrivateRoute';
import MujProfil from './pages/MujProfil';
import Nastaveni from './pages/Nastaveni';
import Chat from './pages/Chat';
import VyhledatJizdu from './pages/VyhledatJizdu';
import ProfilUzivatele from './pages/ProfilUzivatele';
import './styles/theme.css';
import MojeOsobniChaty from './pages/MojeOsobniChaty';
import PersonalChat from './components/chat/PersonalChat';
import EditRide from './components/rides/EditRide';
import OhodnotitPage from './pages/OhodnotitPage';


// Wrapper pro PersonalChat, aby dostal id druhého uživatele z URL
const PersonalChatWrapper = () => {
  const { id } = useParams();
  return <PersonalChat otherUserId={id} />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

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

                {/*  EDITACE JÍZDY */}
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
                  path="chat"
                  element={
                    <PrivateRoute>
                      <Chat />
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
                      <PersonalChatWrapper />
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
