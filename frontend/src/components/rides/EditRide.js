import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import SelectCarModal from "../cars/SelectCarModal";
import "./EditRide.css";

const API = "http://localhost:5000/api";

function splitISO(iso) {
  if (!iso) return { date: "", time: "" };
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

function toISO(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  return `${dateStr}T${timeStr}:00`;
}

export default function EditRide() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [ride, setRide] = useState(null);
  const [showSelectCar, setShowSelectCar] = useState(false);

  const [form, setForm] = useState({
    odkud: "",
    kam: "",
    datum_odjezdu: "",
    cas_odjezdu: "",
    datum_prijezdu: "",
    cas_prijezdu: "",
    cena: "",
    pocet_mist: "",
    mezistanice: [],
  });

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const fetchRide = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API}/jizdy/${id}`);
      const j = res.data?.jizda;

      setRide(j);

      const odj = splitISO(j?.cas_odjezdu);
      const prij = splitISO(j?.cas_prijezdu);

      const stops = (j?.mezistanice || [])
        .slice()
        .sort((a, b) => (a.poradi ?? 0) - (b.poradi ?? 0))
        .map((m) => m.misto);

      setForm({
        odkud: j?.odkud ?? "",
        kam: j?.kam ?? "",
        datum_odjezdu: odj.date,
        cas_odjezdu: odj.time,
        datum_prijezdu: prij.date,
        cas_prijezdu: prij.time,
        cena: j?.cena ?? "",
        pocet_mist: j?.pocet_mist ?? "",
        mezistanice: stops,
      });
    } catch (e) {
      setError(e.response?.data?.error || "Nepodařilo se načíst jízdu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addStop = () => setField("mezistanice", [...form.mezistanice, ""]);
  const removeStop = (idx) =>
    setField("mezistanice", form.mezistanice.filter((_, i) => i !== idx));
  const updateStop = (idx, value) =>
    setField(
      "mezistanice",
      form.mezistanice.map((s, i) => (i === idx ? value : s))
    );

  const changeRideCar = async (auto) => {
    setError("");
    try {
      await axios.put(`${API}/jizdy/${id}`, { auto_id: auto.id }, { headers });
      await fetchRide();
      setShowSelectCar(false);
    } catch (e) {
      setError(e.response?.data?.error || "Nepodařilo se změnit auto.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        odkud: form.odkud,
        kam: form.kam,
        cas_odjezdu: toISO(form.datum_odjezdu, form.cas_odjezdu),
        cas_prijezdu: toISO(form.datum_prijezdu, form.cas_prijezdu),
        cena: Number(form.cena),
        pocet_mist: Number(form.pocet_mist),
        mezistanice: form.mezistanice.map((s) => s.trim()).filter(Boolean),
      };

      await axios.put(`${API}/jizdy/${id}`, payload, { headers });
      navigate("/moje-jizdy");
    } catch (e) {
      setError(e.response?.data?.error || "Nepodařilo se uložit změny.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="edit-ride-loading">Načítám…</div>;

  const autoText = ride?.auto?.smazane
    ? "Smazané auto"
    : `${ride?.auto?.znacka ?? ""} ${ride?.auto?.model ?? ""}${
        ride?.auto?.spz ? ` (${ride.auto.spz})` : ""
      }`.trim();

  return (
    <div className="edit-ride-page">
      <div className="edit-ride-header">
        <h2 className="edit-ride-title">Upravit jízdu</h2>
        <button className="btn-secondary" type="button" onClick={() => navigate(-1)}>
          Zpět
        </button>
      </div>

      {error && <div className="edit-error">{error}</div>}

      <div className="edit-section">
        <h3>Auto</h3>
        <div className="edit-auto-box">
          <div className="edit-auto-text">{autoText || "—"}</div>
          <button type="button" className="btn-primary" onClick={() => setShowSelectCar(true)}>
            Změnit auto
          </button>
        </div>

        {ride?.auto?.smazane && (
          <div className="edit-warning">
            Toto auto bylo smazáno. Vyber prosím jiné auto pro tuto jízdu.
          </div>
        )}
      </div>

      {showSelectCar && (
        <SelectCarModal
          currentAutoId={ride?.auto_id ?? ride?.auto?.id ?? null}
          onClose={() => setShowSelectCar(false)}
          onSelect={changeRideCar}
        />
      )}

      <form onSubmit={handleSubmit} className="edit-form">
        <div className="edit-input">
          <label>Odkud</label>
          <input value={form.odkud} onChange={(e) => setField("odkud", e.target.value)} />
        </div>

        <div className="edit-input">
          <label>Kam</label>
          <input value={form.kam} onChange={(e) => setField("kam", e.target.value)} />
        </div>

        <div className="edit-grid">
          <div className="edit-input">
            <label>Datum odjezdu</label>
            <input
              type="date"
              value={form.datum_odjezdu}
              onChange={(e) => setField("datum_odjezdu", e.target.value)}
            />
          </div>
          <div className="edit-input">
            <label>Čas odjezdu</label>
            <input
              type="time"
              value={form.cas_odjezdu}
              onChange={(e) => setField("cas_odjezdu", e.target.value)}
            />
          </div>
        </div>

        <div className="edit-grid">
          <div className="edit-input">
            <label>Datum příjezdu</label>
            <input
              type="date"
              value={form.datum_prijezdu}
              onChange={(e) => setField("datum_prijezdu", e.target.value)}
            />
          </div>
          <div className="edit-input">
            <label>Čas příjezdu</label>
            <input
              type="time"
              value={form.cas_prijezdu}
              onChange={(e) => setField("cas_prijezdu", e.target.value)}
            />
          </div>
        </div>

        <div className="edit-grid">
          <div className="edit-input">
            <label>Cena</label>
            <input value={form.cena} onChange={(e) => setField("cena", e.target.value)} />
          </div>
          <div className="edit-input">
            <label>Počet míst</label>
            <input value={form.pocet_mist} onChange={(e) => setField("pocet_mist", e.target.value)} />
          </div>
        </div>

        <div className="edit-section">
          <div className="stops-header">
            <h3>Mezistanice</h3>
            <button type="button" className="btn-secondary" onClick={addStop}>
              + Přidat
            </button>
          </div>

          {form.mezistanice.length === 0 && <div className="stops-empty">Žádné mezistanice</div>}

          <div className="stops-list">
            {form.mezistanice.map((s, idx) => (
              <div key={idx} className="stop-row">
                <input
                  value={s}
                  onChange={(e) => updateStop(idx, e.target.value)}
                  placeholder={`Mezistanice ${idx + 1}`}
                />
                <button type="button" className="btn-danger" onClick={() => removeStop(idx)}>
                  Smazat
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="edit-actions">
          <button type="submit" className="btn-success" disabled={saving}>
            {saving ? "Ukládám…" : "Uložit"}
          </button>
        </div>
      </form>
    </div>
  );
}
