import { useMemo, useState } from 'react';
import './index.css';

const Select = ({ value, setValue, options, multiple }) => {
    const [isOpen, setIsOpen] = useState(false);

    const selected = useMemo(() => {
        return multiple
            ? options?.filter((option) => value.includes(option.value))
            : options?.find((option) => option.value === value);
    }, [value, options, multiple]);

    const handleSelect = (val) => {
        if (multiple) {
            if (value.includes(val)) {
                setValue(value.filter((item) => item !== val));
            } else {
                setValue([...value, val]);
            }
        } else {
            setValue(val);
            setIsOpen(false); // close after single select
        }
    };

    const renderLabel = () => {
        if (multiple) {
            return selected.map((s) => s.label).join(', ') || 'Select...';
        } else {
            return selected?.label || 'Select...';
        }
    };

    return (
        <div className="o-select-wrapper">
            <div onClick={() => setIsOpen(!isOpen)} className="o-select">
                {renderLabel()}
            </div>
            {isOpen && (
                <div className="o-select-options">
                    {options?.map((option, index) => {
                        const isSelected = multiple
                            ? value.includes(option.value)
                            : value === option.value;

                        return (
                            <div
                                className="o-select-option"
                                key={index}
                                onClick={() => handleSelect(option.value)}
                            >
                                {multiple && (
                                    <span className="o-select-tick">
                                        {isSelected && '✓'}
                                    </span>
                                )}
                                {option.label}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Select;
