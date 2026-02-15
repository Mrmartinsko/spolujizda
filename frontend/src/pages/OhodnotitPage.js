import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
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

  // načti detail jízdy (kvůli hezkému zobrazení)
  useEffect(() => {
    const fetchRide = async () => {
      if (!token) return;
      setLoading(true);
      setError("");

      try {
        // pokud nemáš endpoint /api/jizdy/<id>, tak mi napiš a upravíme to
        const res = await axios.get(`http://localhost:5000/api/jizdy/${jizdaId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRide(res.data.jizda || res.data); // podle toho, co vracíš
      } catch (e) {
        // není kritické – stránka funguje i bez detailu
        console.error("Nepodařilo se načíst jízdu:", e);
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
      setError("Vyber prosím známku 1–5.");
      return;
    }
    if (!token) {
      setError("Nejsi přihlášený.");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        "http://localhost:5000/api/hodnoceni/",
        {
          jizda_id: Number(jizdaId),
          cilovy_uzivatel_id: Number(cilovyId),
          role: "ridic",
          znamka: Number(znamka),
          komentar: komentar || "",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // po úspěchu zkontroluj pending; když už nic není, vrať se domů
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
      const msg = e.response?.data?.error || "Chyba při odesílání hodnocení";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const RideInfo = () => {
    if (loading) return <p className="rate-muted">Načítám jízdu…</p>;
    if (!ride) return null;

    const odkud = ride.odkud || ride.jizda?.odkud;
    const kam = ride.kam || ride.jizda?.kam;
    const odjezd = ride.cas_odjezdu || ride.jizda?.cas_odjezdu;
    const prijezd = ride.cas_prijezdu || ride.jizda?.cas_prijezdu;

    return (
      <div className="rate-ride">
        <div className="rate-ride-title">
          {odkud} → {kam}
        </div>
        <div className="rate-ride-meta">
          {odjezd ? <>Odjezd: {new Date(odjezd).toLocaleString("cs-CZ")}</> : null}
          {prijezd ? <> • Příjezd: {new Date(prijezd).toLocaleString("cs-CZ")}</> : null}
        </div>
      </div>
    );
  };

  return (
    <div className="rate-page">
      <div className="rate-card">
        <h2>Ohodnotit řidiče</h2>
        <p className="rate-muted">
          Zabere to pár vteřin. Hodnocení pomáhá ostatním vybrat spolehlivou spolujízdu.
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
                aria-label={`${n} hvězdiček`}
              >
                ★
              </button>
            ))}
            <span className="rate-value">
              {znamka ? `${znamka}/5` : "Vyber známku"}
            </span>
          </div>

          <label className="rate-label">
            Komentář (volitelné)
            <textarea
              className="rate-textarea"
              value={komentar}
              onChange={(e) => setKomentar(e.target.value)}
              placeholder="Např. super komunikace, jel včas…"
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
              title="Když je to povinné, stejně tě to později zase vrátí 🙂"
            >
              Teď ne
            </button>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Odesílám…" : "Odeslat hodnocení"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OhodnotitPage;
