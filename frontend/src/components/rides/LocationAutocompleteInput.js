import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import './LocationAutocompleteInput.css';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 10;

const sanitizeLocationValue = (value) =>
    value
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, ' ')
        .trimStart()
        .slice(0, 50);

const normalizeSelectedCity = (value) =>
    value.replace(/^\s*M[eě]sto\s+/iu, '').trim();

const formatAddress = (address) => {
    const normalized = (address || '').replace(/\s*Czech Republic\s*$/i, '').trim();
    if (normalized.length <= 70) {
        return normalized;
    }
    return `${normalized.slice(0, 67)}...`;
};

const LocationAutocompleteInput = ({
    label,
    name,
    value,
    onChange,
    placeholder,
    required = false,
    hideLabel = false,
    wrapperClassName = '',
    onKeyDown,
}) => {
    const rootRef = useRef(null);
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (!rootRef.current?.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    useEffect(() => {
        const normalizedQuery = query.trim();

        if (normalizedQuery.length < MIN_QUERY_LENGTH) {
            setResults([]);
            setHasSearched(false);
            setIsLoading(false);
            return undefined;
        }

        const timeoutId = setTimeout(async () => {
            setIsLoading(true);

            try {
                const response = await axios.get('http://localhost:5000/api/mesta', {
                    params: { q: normalizedQuery }
                });
                const nextResults = Array.isArray(response.data) ? response.data.slice(0, MAX_RESULTS) : [];
                setResults(nextResults);
                setHasSearched(true);
                setIsOpen(true);
            } catch (error) {
                console.error('Autocomplete request failed:', error);
                setResults([]);
                setHasSearched(true);
                setIsOpen(true);
            } finally {
                setIsLoading(false);
            }
        }, DEBOUNCE_MS);

        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleInputChange = (event) => {
        const nextValue = sanitizeLocationValue(event.target.value);
        setQuery(nextValue);
        onChange(name, nextValue, null);
        setIsOpen(nextValue.trim().length >= MIN_QUERY_LENGTH);
    };

    const handleSelect = (item) => {
        const selectedValue = item?.display_name || normalizeSelectedCity(item?.name || '');
        setQuery(selectedValue);
        onChange(name, selectedValue, {
            place_id: item?.place_id || null,
            address: item?.address || '',
            name: item?.name || selectedValue,
            display_name: item?.display_name || selectedValue,
        });
        setResults([]);
        setHasSearched(false);
        setIsOpen(false);
    };

    const showEmptyState = !isLoading && hasSearched && results.length === 0 && query.trim().length >= MIN_QUERY_LENGTH;
    const showDropdown = isOpen && query.trim().length >= MIN_QUERY_LENGTH;

    return (
        <div className={`field-group autocomplete-field ${wrapperClassName}`.trim()} ref={rootRef}>
            {!hideLabel && <label className="field-label" htmlFor={name}>{label}</label>}
            <input
                id={name}
                type="text"
                className="ui-input"
                name={name}
                value={query}
                onChange={handleInputChange}
                onKeyDown={onKeyDown}
                onFocus={() => {
                    if (query.trim().length >= MIN_QUERY_LENGTH) {
                        setIsOpen(true);
                    }
                }}
                required={required}
                maxLength={50}
                autoComplete="off"
                placeholder={placeholder}
            />

            {showDropdown && (
                <div className="autocomplete-dropdown">
                    {isLoading && <div className="autocomplete-status">Načítám…</div>}

                    {!isLoading && results.map((item, index) => (
                        <button
                            key={`${item.name}-${item.address}-${index}`}
                            type="button"
                            className="autocomplete-option"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleSelect(item)}
                        >
                            <span className="autocomplete-option-name">{item.name}</span>
                            {item.address && (
                                <span className="autocomplete-option-address">
                                    {' - '}
                                    {formatAddress(item.address)}
                                </span>
                            )}
                        </button>
                    ))}

                    {showEmptyState && <div className="autocomplete-status">Žádné výsledky</div>}
                </div>
            )}
        </div>
    );
};

export default LocationAutocompleteInput;
