import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { getApiErrorMessage } from "../../utils/apiError";
import "../cars/ReplaceCar.css";

const SelectCarModal = ({ currentAutoId, onClose, onSelect }) => {
  const { token } = useAuth();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCars = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get("http://localhost:5000/api/auta/moje", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCars(res.data || []);
      } catch (e) {
        setError(getApiErrorMessage(e, "Chyba pri nacitani aut."));
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchCars();
  }, [token]);

  return (
    <div className="replace-car-modal">
      <div className="modal-content">
        <h2>Vyber auto pro jízdu</h2>

        {loading ? (
          <p>Nacitani aut...</p>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : (
          <div className="available-cars available-cars--scroll">
            {cars.length === 0 && <p>Nemas zadne auto.</p>}

            {cars.map((auto) => (
              <div key={auto.id} className="available-car">
                <span>
                  {auto.znacka} {auto.model} {auto.spz ? `(${auto.spz})` : ""}
                  {auto.id === currentAutoId ? " - aktuální" : ""}
                </span>

                <button
                  disabled={auto.id === currentAutoId}
                  onClick={() => onSelect(auto)}
                >
                  Vybrat
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="close-btn" onClick={onClose}>
          Zavřít
        </button>
      </div>
    </div>
  );
};

export default SelectCarModal;
