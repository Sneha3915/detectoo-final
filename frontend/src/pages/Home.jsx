import { useNavigate } from "react-router-dom";

export default function Home() {

  const navigate = useNavigate();

  return (

    <div className="home-page">

      <div className="hero">

        <p className="scan-subtitle">
          ◆ FORENSIC IMAGE ANALYSIS SYSTEM
        </p>

        <h1>
          DETECTOO
        </h1>

        <p className="hero-desc">
          Pixel-level image forgery detection
          using forensic analysis algorithms
          and tampering visualization.
        </p>

        <button
          className="hero-btn"
          onClick={() => navigate("/detector")}
        >
          ▶ INITIATE SCAN
        </button>

      </div>

      <div className="feature-grid">

        <div className="feature-card">

          <h3>PIXEL ANALYSIS</h3>

          <p>
            Detects suspicious manipulation
            regions inside images using
            forensic algorithms.
          </p>

        </div>

        <div className="feature-card">

          <h3>HEATMAP VISUALIZATION</h3>

          <p>
            Generates visual tampering
            heatmaps for easy comparison.
          </p>

        </div>

        <div className="feature-card">

          <h3>FORENSIC REPORT</h3>

          <p>
            Generates downloadable PDF
            forensic analysis reports.
          </p>

        </div>

      </div>

    </div>
  );
}