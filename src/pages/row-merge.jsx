import './page.css'


export default function RowMergePage() {
    return (
        <div className="row-merge-page">
            <h1>Row Merge</h1>
            <div>
                <h2>Instructions</h2>
                <p>1. Select a column to merge with and at least one column to aggregate.</p>
                <p>2. Click "Merge Rows" to generate SQL.</p>
            </div>
        </div>
    )
}