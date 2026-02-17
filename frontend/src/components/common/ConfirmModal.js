import React from 'react';
import './ConfirmModal.css';

const ConfirmModal = ({
    isOpen,
    title = 'Potvrzení',
    message = '',
    confirmText = 'Potvrdit',
    cancelText = 'Zrušit',
    danger = false,
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    return (
        <div className="app-modal-overlay" onClick={onCancel}>
            <div className="app-modal-card" onClick={(e) => e.stopPropagation()}>
                <h3 className="app-modal-title">{title}</h3>
                {message && <p className="app-modal-message">{message}</p>}
                <div className="app-modal-actions">
                    <button type="button" className="app-btn app-btn-secondary" onClick={onCancel}>
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className={`app-btn ${danger ? 'app-btn-danger' : 'app-btn-primary'}`}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
