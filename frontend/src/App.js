import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import HomePage from './pages/HomePage';
import CreateRidePage from './pages/CreateRidePage';
import MyRidesPage from './pages/MyRidesPage';
import CarManager from './components/cars/CarManager';
import ReservationManager from './components/reservations/ReservationManager';
import PrivateRoute from './components/Auth/PrivateRoute';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/" element={<Layout />}>
                        <Route index element={<HomePage />} />
                        <Route path="nabidnout-jizdu" element={
                            <PrivateRoute>
                                <CreateRidePage />
                            </PrivateRoute>
                        } />
                        <Route path="moje-jizdy" element={
                            <PrivateRoute>
                                <MyRidesPage />
                            </PrivateRoute>
                        } />
                        <Route path="auta" element={
                            <PrivateRoute>
                                <CarManager />
                            </PrivateRoute>
                        } />
                        <Route path="rezervace" element={
                            <PrivateRoute>
                                <ReservationManager />
                            </PrivateRoute>
                        } />
                    </Route>
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
