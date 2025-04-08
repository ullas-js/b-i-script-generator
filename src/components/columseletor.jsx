import { useState } from "react";

const ColumnSelector = ({ onSubmit }) => {
    const [dimension, setDimension] = useState({ start: '', end: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!dimension.start || !dimension.end) {
            alert('Please enter both start and end cells.');
            return;
        }

        onSubmit(dimension);
        setDimension({ start: '', end: '' });
    };

    return (
        <div className="col-selector-wrapper">
            <h3>Column Selector</h3>
            <p>Select rectangular range of cells (e.g., A1 to C10):</p>
            <form onSubmit={handleSubmit} className="col-selector-form">
                <input
                    type="text"
                    name="start"
                    onChange={(e) => setDimension(prev => ({ ...prev, start: e.target.value.toUpperCase() }))}
                    value={dimension.start}
                    placeholder="Start (e.g., A1)"
                    className="input"
                />
                <input
                    type="text"
                    name="end"
                    onChange={(e) => setDimension(prev => ({ ...prev, end: e.target.value.toUpperCase() }))}
                    value={dimension.end}
                    placeholder="End (e.g., C10)"
                    className="input"
                />
                <button className="btn">Add Selection</button>
            </form>
        </div>
    );
};

export default ColumnSelector;
