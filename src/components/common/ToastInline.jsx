'use client'
export default function ToastInline({ toast }) {
    if (!toast) return null;
    const kind =
        toast.type === 'success' ? 'alert-success' :
            toast.type === 'error'   ? 'alert-error'   :
                'alert-info';

    return (
        <div className="toast">
            <div className={`alert ${kind}`}>
                <span>{toast.msg}</span>
            </div>
        </div>
    );
}
