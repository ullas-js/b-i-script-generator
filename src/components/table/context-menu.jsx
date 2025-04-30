import React from 'react';
import './index.css';

// SVG icons for menu actions
const icons = {
    rowAbove: (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="3" y="9" width="14" height="2" rx="1" fill="#7b7b9d"/><rect x="3" y="5" width="14" height="2" rx="1" fill="#7b7b9d"/><rect x="3" y="13" width="14" height="2" rx="1" fill="#e7eaf3"/></svg>
    ),
    rowBelow: (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="3" y="13" width="14" height="2" rx="1" fill="#7b7b9d"/><rect x="3" y="9" width="14" height="2" rx="1" fill="#7b7b9d"/><rect x="3" y="5" width="14" height="2" rx="1" fill="#e7eaf3"/></svg>
    ),
    colLeft: (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="5" y="3" width="2" height="14" rx="1" fill="#7b7b9d"/><rect x="9" y="3" width="2" height="14" rx="1" fill="#7b7b9d"/><rect x="13" y="3" width="2" height="14" rx="1" fill="#e7eaf3"/></svg>
    ),
    colRight: (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="13" y="3" width="2" height="14" rx="1" fill="#7b7b9d"/><rect x="9" y="3" width="2" height="14" rx="1" fill="#7b7b9d"/><rect x="5" y="3" width="2" height="14" rx="1" fill="#e7eaf3"/></svg>
    ),
    delete: (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="5" y="9" width="10" height="2" rx="1" fill="#e14c4c"/></svg>
    )
};

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
                        {icons.rowAbove}
                        Insert Row Above
                    </div>
                    <div className="context-menu-item" onClick={() => onInsertRow('below')}>
                        {icons.rowBelow}
                        Insert Row Below
                    </div>
                    <div className="context-menu-item context-menu-delete" onClick={() => onDeleteRow()}>
                        {icons.delete}
                        Delete Row
                    </div>
                </div>
            )}
            {!isHeaderRow && <div className="context-menu-divider" />}
            <div className="context-menu-group">
                <div className="context-menu-item" onClick={() => onInsertColumn('left')}>
                    {icons.colLeft}
                    Insert Column Left
                </div>
                <div className="context-menu-item" onClick={() => onInsertColumn('right')}>
                    {icons.colRight}
                    Insert Column Right
                </div>
                <div className="context-menu-item context-menu-delete" onClick={() => onDeleteColumn()}>
                    {icons.delete}
                    Delete Column
                </div>
            </div>
        </div>
    );
};

export default ContextMenu;