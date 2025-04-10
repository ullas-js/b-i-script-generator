import { Link } from "react-router-dom"
import { ConvertFile } from "../components"

export default function HomePage() {
    return (
        <div>
            <h1>Home</h1>
            <Link to={'/read-formula'}>Read Formula</Link>
            <ConvertFile />
        </div>
    )
}