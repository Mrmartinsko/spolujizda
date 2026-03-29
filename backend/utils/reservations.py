from models.rezervace import Rezervace


def annotate_waiting_queue_positions(rezervace_list):
    if not rezervace_list:
        return {}

    ride_ids = sorted({rezervace.jizda_id for rezervace in rezervace_list if rezervace.jizda_id})
    if not ride_ids:
        return {}

    cekajici_rezervace = (
        Rezervace.query.filter(
            Rezervace.jizda_id.in_(ride_ids),
            Rezervace.status == "cekajici",
        )
        .order_by(Rezervace.jizda_id.asc(), Rezervace.vytvoreno.asc(), Rezervace.id.asc())
        .all()
    )

    positions = {}
    counters = {}

    for rezervace in cekajici_rezervace:
        counters[rezervace.jizda_id] = counters.get(rezervace.jizda_id, 0) + 1
        positions[rezervace.id] = counters[rezervace.jizda_id]

    for rezervace in rezervace_list:
        rezervace.poradi_cekajici = (
            positions.get(rezervace.id) if rezervace.status == "cekajici" else None
        )

    return positions
