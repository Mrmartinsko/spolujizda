import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../utils/apiError";
import "./OhodnotitPage.css";

const OhodnotitPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { jizdaId, cilovyId } = useParams();

  const [loading, setLoading] = useState(true);
  const [ride, setRide] = useState(null);
  const [znamka, setZnamka] = useState(0);
  const [hover, setHover] = useState(0);
  const [komentar, setKomentar] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRide = async () => {
      if (!token) return;
      setLoading(true);
      setError("");

      try {
        const res = await axios.get(`http://localhost:5000/api/jizdy/${jizdaId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRide(res.data.jizda || res.data);
      } catch {
        setRide(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRide();
  }, [token, jizdaId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!znamka || znamka < 1 || znamka > 5) {
      setError("Vyber prosim znamku 1-5.");
      return;
    }

    if (!token) {
      setError("Nejsi prihlaseny.");
      return;
    }

    const trimmedKomentar = (komentar || "").trim();

    setSubmitting(true);
    try {
      await axios.post(
        "http://localhost:5000/api/hodnoceni/",
        {
          jizda_id: Number(jizdaId),
          cilovy_uzivatel_id: Number(cilovyId),
          role: "ridic",
          znamka: Number(znamka),
          komentar: trimmedKomentar,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      try {
        const pendingRes = await axios.get(
          "http://localhost:5000/api/hodnoceni/pending",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const pending = pendingRes.data.pending || [];
        if (pending.length > 0) {
          const p = pending[0];
          navigate(`/ohodnotit/${p.jizda_id}/${p.cilovy_uzivatel_id}`, { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      } catch {
        navigate("/", { replace: true });
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "Chyba pri odesilani hodnoceni."));
    } finally {
      setSubmitting(false);
    }
  };

  const RideInfo = () => {
    if (loading) return <p className="rate-muted">Nacitam jizdu...</p>;
    if (!ride) return null;

    const odkud = ride.odkud || ride.jizda?.odkud;
    const kam = ride.kam || ride.jizda?.kam;
    const odjezd = ride.cas_odjezdu || ride.jizda?.cas_odjezdu;
    const prijezd = ride.cas_prijezdu || ride.jizda?.cas_prijezdu;

    return (
      <div className="rate-ride">
        <div className="rate-ride-title">
          {odkud} -&gt; {kam}
        </div>
        <div className="rate-ride-meta">
          {odjezd ? <>Odjezd: {new Date(odjezd).toLocaleString("cs-CZ")}</> : null}
          {prijezd ? <> | Prijezd: {new Date(prijezd).toLocaleString("cs-CZ")}</> : null}
        </div>
      </div>
    );
  };

  return (
    <div className="rate-page">
      <div className="rate-card">
        <h2>Ohodnotit ridice</h2>
        <p className="rate-muted">
          Zabere to par vterin. Hodnoceni pomaha ostatnim vybrat spolehlivou spolujizdu.
        </p>

        <RideInfo />

        <form onSubmit={handleSubmit} className="rate-form">
          <div className="rate-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                className={`star ${((hover || znamka) >= n) ? "on" : ""}`}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setZnamka(n)}
                aria-label={`${n} hvezdicek`}
              >
                *
              </button>
            ))}
            <span className="rate-value">
              {znamka ? `${znamka}/5` : "Vyber znamku"}
            </span>
          </div>

          <label className="rate-label">
            Komentar (volitelne)
            <textarea
              className="rate-textarea"
              value={komentar}
              onChange={(e) => setKomentar(e.target.value)}
              placeholder="Napriklad super komunikace, jel vcas..."
              rows={4}
              maxLength={500}
            />
          </label>

          {error && <div className="rate-error">{error}</div>}

          <div className="rate-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/", { replace: true })}
              disabled={submitting}
            >
              Ted ne
            </button>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Odesilam..." : "Odeslat hodnoceni"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OhodnotitPage;
