import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getApiErrorMessage } from "../../utils/apiError";
import SelectCarModal from "../cars/SelectCarModal";
import LocationAutocompleteInput from "./LocationAutocompleteInput";
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

const createStop = (text = "", meta = null) => ({
  text,
  place_id: meta?.place_id || null,
  address: meta?.address || "",
});

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
    odkud_place_id: null,
    odkud_address: "",
    kam: "",
    kam_place_id: null,
    kam_address: "",
    datum_odjezdu: "",
    cas_odjezdu: "",
    datum_prijezdu: "",
    cas_prijezdu: "",
    cena: "",
    pocet_mist: "",
    mezistanice: [],
  });

  const validateLocationField = (value, fieldLabel) => {
    const normalized = (value || "").trim();
    if (!normalized) return `${fieldLabel} je povinne`;
    if (normalized.length > 100) return `${fieldLabel} muze mit maximalne 100 znaku`;
    if (/[^\p{L}\p{N}\s-]/gu.test(normalized)) {
      return `${fieldLabel} muze obsahovat jen pismena, cisla, mezery a pomlcky`;
    }
    return null;
  };

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleLocationChange = (fieldName, value, meta) => {
    setForm((prev) => ({
      ...prev,
      [fieldName]: value,
      [`${fieldName}_place_id`]: meta?.place_id || null,
      [`${fieldName}_address`]: meta?.address || "",
    }));
  };

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
        .map((m) => createStop(m.misto, { place_id: m.misto_place_id, address: m.misto_address }));

      setForm({
        odkud: j?.odkud ?? "",
        odkud_place_id: j?.odkud_place_id ?? null,
        odkud_address: j?.odkud_address ?? "",
        kam: j?.kam ?? "",
        kam_place_id: j?.kam_place_id ?? null,
        kam_address: j?.kam_address ?? "",
        datum_odjezdu: odj.date,
        cas_odjezdu: odj.time,
        datum_prijezdu: prij.date,
        cas_prijezdu: prij.time,
        cena: j?.cena ?? "",
        pocet_mist: j?.pocet_mist ?? "",
        mezistanice: stops,
      });
    } catch (e) {
      setError(getApiErrorMessage(e, "Nepodarilo se nacist jizdu."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addStop = () => setField("mezistanice", [...form.mezistanice, createStop()]);
  const removeStop = (idx) =>
    setField("mezistanice", form.mezistanice.filter((_, i) => i !== idx));
  const updateStop = (idx, value, meta) =>
    setField(
      "mezistanice",
      form.mezistanice.map((s, i) => (i === idx ? createStop(value, meta || s) : s))
    );

  const changeRideCar = async (auto) => {
    setError("");
    try {
      await axios.put(`${API}/jizdy/${id}`, { auto_id: auto.id }, { headers });
      await fetchRide();
      setShowSelectCar(false);
    } catch (e) {
      setError(getApiErrorMessage(e, "Nepodarilo se zmenit auto."));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const odkudError = validateLocationField(form.odkud, "Odkud");
    if (odkudError) {
      setError(odkudError);
      return;
    }

    const kamError = validateLocationField(form.kam, "Kam");
    if (kamError) {
      setError(kamError);
      return;
    }

    for (const stop of form.mezistanice.map((s) => s.text.trim()).filter(Boolean)) {
      const stopError = validateLocationField(stop, "Mezistanice");
      if (stopError) {
        setError(stopError);
        return;
      }
    }

    const departureIso = toISO(form.datum_odjezdu, form.cas_odjezdu);
    const arrivalIso = toISO(form.datum_prijezdu, form.cas_prijezdu);
    const departureDate = departureIso ? new Date(departureIso) : null;
    const arrivalDate = arrivalIso ? new Date(arrivalIso) : null;
    const pocetMist = Number(form.pocet_mist);

    if (!departureDate || Number.isNaN(departureDate.getTime())) {
      setError("Zadej platny datum a cas odjezdu.");
      return;
    }

    if (!arrivalDate || Number.isNaN(arrivalDate.getTime())) {
      setError("Zadej platny datum a cas prijezdu.");
      return;
    }

    if (arrivalDate <= departureDate) {
      setError("Prijezd musi byt po odjezdu.");
      return;
    }

    if (!Number.isInteger(pocetMist) || pocetMist <= 0) {
      setError("Pocet mist musi byt cele cislo vetsi nez 0.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        odkud: form.odkud.trim(),
        odkud_place_id: form.odkud_place_id,
        odkud_address: form.odkud_address,
        kam: form.kam.trim(),
        kam_place_id: form.kam_place_id,
        kam_address: form.kam_address,
        cas_odjezdu: departureIso,
        cas_prijezdu: arrivalIso,
        pocet_mist: pocetMist,
        mezistanice: form.mezistanice
          .map((s) => ({
            text: s.text.trim(),
            place_id: s.place_id,
            address: s.address,
          }))
          .filter((s) => s.text),
      };

      await axios.put(`${API}/jizdy/${id}`, payload, { headers });
      navigate("/moje-jizdy");
    } catch (e) {
      setError(getApiErrorMessage(e, "Nepodarilo se ulozit zmeny."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="edit-ride-loading">Nacitam...</div>;

  const autoText = ride?.auto?.smazane
    ? "Smazane auto"
    : `${ride?.auto?.znacka ?? ""} ${ride?.auto?.model ?? ""}${
        ride?.auto?.spz ? ` (${ride.auto.spz})` : ""
      }`.trim();

  return (
    <div className="edit-ride-page">
      <div className="edit-ride-header">
        <h2 className="edit-ride-title">Upravit jizdu</h2>
        <button className="btn-secondary" type="button" onClick={() => navigate(-1)}>
          Zpet
        </button>
      </div>

      {error && <div className="edit-error">{error}</div>}

      <div className="edit-section">
        <h3>Auto</h3>
        <div className="edit-auto-box">
          <div className="edit-auto-text">{autoText || "-"}</div>
          <button type="button" className="btn-primary" onClick={() => setShowSelectCar(true)}>
            Zmenit auto
          </button>
        </div>

        {ride?.auto?.smazane && (
          <div className="edit-warning">
            Toto auto bylo smazano. Vyber prosim jine auto pro tuto jizdu.
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
        <LocationAutocompleteInput
          label="Odkud"
          name="odkud"
          value={form.odkud}
          onChange={handleLocationChange}
          required
          placeholder="Vychozi mesto"
        />

        <LocationAutocompleteInput
          label="Kam"
          name="kam"
          value={form.kam}
          onChange={handleLocationChange}
          required
          placeholder="Cilove mesto"
        />

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
            <label>Cas odjezdu</label>
            <input
              type="time"
              value={form.cas_odjezdu}
              onChange={(e) => setField("cas_odjezdu", e.target.value)}
            />
          </div>
        </div>

        <div className="edit-grid">
          <div className="edit-input">
            <label>Datum prijezdu</label>
            <input
              type="date"
              value={form.datum_prijezdu}
              onChange={(e) => setField("datum_prijezdu", e.target.value)}
            />
          </div>
          <div className="edit-input">
            <label>Cas prijezdu</label>
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
            <input value={form.cena} disabled readOnly />
          </div>
          <div className="edit-input">
            <label>Pocet mist</label>
            <input type="number" min="1" value={form.pocet_mist} onChange={(e) => setField("pocet_mist", e.target.value)} />
          </div>
        </div>

        <div className="edit-section">
          <div className="stops-header">
            <h3>Mezistanice</h3>
            <button type="button" className="btn-secondary" onClick={addStop}>
              + Pridat
            </button>
          </div>

          {form.mezistanice.length === 0 && <div className="stops-empty">Zadne mezistanice</div>}

          <div className="stops-list">
            {form.mezistanice.map((s, idx) => (
              <div key={s.place_id || `${s.text}-${idx}`} className="stop-row">
                <LocationAutocompleteInput
                  name={`mezistanice-${idx}`}
                  value={s.text}
                  onChange={(_, value, meta) => updateStop(idx, value, meta)}
                  hideLabel
                  wrapperClassName="stop-autocomplete"
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
            {saving ? "Ukladam..." : "Ulozit"}
          </button>
        </div>
      </form>
    </div>
  );
}
