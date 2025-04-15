import React from 'react';
import './index.css';

const ContextMenu = ({ position, onClose, onInsertRow, onInsertColumn, onDeleteRow, onDeleteColumn, isHeaderRow }) => {
    if (!position) return null;

    const handleClick = (e) => {
        e.stopPropagation();
        onClose();
    };

    return (
        <div 
            className="context-menu" 
            style={{ 
                position: 'fixed',
                left: position.x,
                top: position.y,
                zIndex: 1000
            }}
            onClick={handleClick}
        >
            {!isHeaderRow && (
                <div className="context-menu-group">
                    <div className="context-menu-item" onClick={() => onInsertRow('above')}>
                        Insert Row Above
                    </div>
                    <div className="context-menu-item" onClick={() => onInsertRow('below')}>
                        Insert Row Below
                    </div>
                    <div className="context-menu-item context-menu-delete" onClick={() => onDeleteRow()}>
                        Delete Row
                    </div>
                </div>
            )}
            {!isHeaderRow && <div className="context-menu-divider" />}
            <div className="context-menu-group">
                <div className="context-menu-item" onClick={() => onInsertColumn('left')}>
                    Insert Column Left
                </div>
                <div className="context-menu-item" onClick={() => onInsertColumn('right')}>
                    Insert Column Right
                </div>
                <div className="context-menu-item context-menu-delete" onClick={() => onDeleteColumn()}>
                    Delete Column
                </div>
            </div>
        </div>
    );
};

export default ContextMenu; 