import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { token } = useAuth();
    const [oznameni, setOznameni] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchOznameni = async () => {
        if (!token) return;
        try {
            setLoading(true);
            // jen endpoint, api automaticky použije baseURL
            const res = await api.get("/oznameni/", {
                headers: { Authorization: `Bearer ${token}` }
                
            });
            setOznameni(res.data);
        } catch (e) {
            console.error("Chyba při načítání oznámení", e);
        } finally {
            setLoading(false);
        }
    };

    const oznacitPrectene = async (id) => {
        try {
            await api.post(`/oznameni/${id}/precist`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOznameni(prev =>
                prev.map(o =>
                    o.id === id ? { ...o, precteno: true } : o
                )
            );
        } catch (e) {
            console.error("Chyba při označení oznámení", e);
        }
    };

    // automatické načtení + refresh každých 15 s
    useEffect(() => {
        fetchOznameni();
        const interval = setInterval(fetchOznameni, 15000);
        return () => clearInterval(interval);
    }, [token]);

    return (
        <NotificationContext.Provider value={{
            oznameni,
            loading,
            fetchOznameni,
            oznacitPrectene
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);
