import { Link } from "react-router-dom"
import { ConvertFile } from "../components"
import './page.css'

export default function HomePage() {
    return (
        <div className="home-content">
            <h1>Home</h1>
            <div className="home-content__links">
                <Link to={'/read-formula'}>Read Formula</Link>
                <Link to={'/not-batch-instruction'}>Not Batch Instruction</Link>
            </div>
            <ConvertFile />
        </div>
    )
}