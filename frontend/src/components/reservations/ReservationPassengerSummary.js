import React, { useState } from 'react';
import './ReservationPassengerSummary.css';
import {
  getAdditionalPassengerBadge,
  getAdditionalPassengerCount,
  getAdditionalPassengerNames,
} from '../../utils/reservationPassengers';

const ReservationPassengerSummary = ({
  reservation,
  primaryPassengerName,
  primaryPassengerId,
  onOpenProfile,
  profileTitle = 'Otevřít profil pasažéra',
  detailsLabel = 'Spolucestující:',
}) => {
  const [expanded, setExpanded] = useState(false);
  const extraPassengerCount = getAdditionalPassengerCount(reservation);
  const extraPassengerBadge = getAdditionalPassengerBadge(reservation);
  const extraPassengerNames = getAdditionalPassengerNames(reservation);
  const canExpand = extraPassengerCount > 0 && extraPassengerNames.length > 0;

  return (
    <div className="reservation-passenger-summary">
      <div className="reservation-passenger-row">
        {primaryPassengerId ? (
          <button
            type="button"
            className="reservation-profile-link"
            onClick={onOpenProfile}
            title={profileTitle}
          >
            {primaryPassengerName}
          </button>
        ) : (
          <span className="reservation-primary-passenger">{primaryPassengerName}</span>
        )}

        {extraPassengerCount > 0 && <span className="reservation-extra-count">{extraPassengerBadge}</span>}

        {canExpand && (
          <button
            type="button"
            className={`reservation-passenger-toggle ${expanded ? 'open' : ''}`}
            onClick={() => setExpanded((prev) => !prev)}
            title={expanded ? 'Skrýt spolucestující' : 'Zobrazit spolucestující'}
          >
            {expanded ? 'Skrýt' : 'Zobrazit'}
          </button>
        )}
      </div>

      {canExpand && expanded && (
        <div className="reservation-companions">
          <span className="reservation-companions-label">{detailsLabel}</span>{' '}
          <span className="reservation-companions-text">{extraPassengerNames.join(', ')}</span>
        </div>
      )}
    </div>
  );
};

export default ReservationPassengerSummary;
