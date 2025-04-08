import { useEffect } from "react";
import { createPortal } from "react-dom";

const Modal = ({ children, isOpen, onClose }) => {
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape") onClose();
        };

        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    useEffect(() => {
        const modalRoot = document.getElementById("modal-root");
        if (isOpen) {
            modalRoot.style.zIndex = "1000";
        } else {
            modalRoot.style.zIndex = "-1";
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="modal-close" onClick={onClose}>&times;</button>
                {children}
            </div>
        </div>,
        document.getElementById("modal-root")
    );
};

export default Modal;
