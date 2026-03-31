```plantuml
@startuml

' Databazovy diagram podle aktualnich SQLAlchemy modelu.
' Blokace je zamerne vynechana.

entity Uzivatel {
    +id: int
    +email: string
    +heslo: string
    +email_verified: bool
    +email_verified_at: datetime
    +email_verification_token: string
    +email_verification_expires_at: datetime
    +password_reset_token: string
    +password_reset_expires_at: datetime
}

entity Profil {
    +id: int
    +uzivatel_id: int
    +jmeno: string
    +bio: text
    +fotka: string
}

entity Auto {
    +id: int
    +profil_id: int
    +znacka: string
    +model: string
    +barva: string
    +spz: string
    +primarni: bool
    +docasne: bool
    +smazane: bool
}

entity Jizda {
    +id: int
    +ridic_id: int
    +auto_id: int
    +odkud: string
    +odkud_place_id: string
    +odkud_address: string
    +kam: string
    +kam_place_id: string
    +kam_address: string
    +cas_odjezdu: datetime
    +cas_prijezdu: datetime
    +cena: float
    +pocet_mist: int
    +status: string
}

entity Mezistanice {
    +id: int
    +jizda_id: int
    +misto: string
    +misto_place_id: string
    +misto_address: string
    +poradi: int
}

entity Pasazeri {
    +jizda_id: int
    +pasazer_id: int
}

entity Rezervace {
    +id: int
    +uzivatel_id: int
    +jizda_id: int
    +pocet_mist: int
    +dalsi_pasazeri: text
    +poznamka: text
    +vytvoreno: datetime
    +status: string
}

entity Chat {
    +id: int
    +jizda_id: int
}

entity UcastniciChatu {
    +chat_id: int
    +uzivatel_id: int
}

entity Zprava {
    +id: int
    +chat_id: int
    +odesilatel_id: int
    +text: text
    +cas: datetime
}

entity Hodnoceni {
    +id: int
    +jizda_id: int
    +autor_id: int
    +cilovy_uzivatel_id: int
    +role: string
    +znamka: int
    +komentar: text
    +datum: datetime
}

entity Oznameni {
    +id: int
    +prijemce_id: int
    +odesilatel_id: int
    +cilovy_uzivatel_id: int
    +jizda_id: int
    +rezervace_id: int
    +zprava: string
    +typ: string
    +kategorie: string
    +target_path: string
    +unikatni_klic: string
    +datum: datetime
    +precteno: bool
}

Uzivatel ||--|| Profil
Profil ||--o{ Auto

Uzivatel ||--o{ Jizda : ridic_id
Auto o|--o{ Jizda : auto_id
Jizda ||--o{ Mezistanice

Uzivatel ||--o{ Rezervace : uzivatel_id
Jizda ||--o{ Rezervace : jizda_id

Uzivatel ||--o{ Pasazeri : pasazer_id
Jizda ||--o{ Pasazeri : jizda_id

Jizda ||--o| Chat : jizda_id
Chat ||--o{ Zprava
Uzivatel ||--o{ Zprava : odesilatel_id

Chat ||--o{ UcastniciChatu
Uzivatel ||--o{ UcastniciChatu

Uzivatel ||--o{ Hodnoceni : autor_id
Uzivatel ||--o{ Hodnoceni : cilovy_uzivatel_id
Jizda ||--o{ Hodnoceni : jizda_id

Uzivatel ||--o{ Oznameni : prijemce_id
Uzivatel |o--o{ Oznameni : odesilatel_id
Uzivatel |o--o{ Oznameni : cilovy_uzivatel_id
Jizda |o--o{ Oznameni : jizda_id
Rezervace |o--o{ Oznameni : rezervace_id

@enduml
```
