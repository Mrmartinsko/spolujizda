import React, { useEffect, useState } from 'react';
import './ConfirmModal.css';

const PromptModal = ({
    isOpen,
    title = 'Zadat hodnotu',
    message = '',
    label = 'Poznámka',
    placeholder = '',
    confirmText = 'Uložit',
    cancelText = 'Zrušit',
    initialValue = '',
    onConfirm,
    onCancel
}) => {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue || '');
        }
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    return (
        <div className="app-modal-overlay" onClick={onCancel}>
            <div className="app-modal-card" onClick={(e) => e.stopPropagation()}>
                <h3 className="app-modal-title">{title}</h3>
                {message && <p className="app-modal-message">{message}</p>}
                <label className="app-modal-label">{label}</label>
                <textarea
                    className="app-modal-textarea"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={placeholder}
                    rows={3}
                />
                <div className="app-modal-actions">
                    <button type="button" className="app-btn app-btn-secondary" onClick={onCancel}>
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className="app-btn app-btn-primary"
                        onClick={() => onConfirm(value)}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PromptModal;
