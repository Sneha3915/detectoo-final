import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from "jspdf-autotable";
import './Detector.css';

export default function Detector() {
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("side");

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(
        'https://detectoo.onrender.com/',
        {
          method: 'POST',
          body: formData
        }
      );

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {

  const pdf = new jsPDF("p", "mm", "a4");

  // ================= HEADER =================

  pdf.setFillColor(5, 7, 20);
  pdf.rect(0, 0, 210, 28, "F");

  pdf.setTextColor(255, 60, 60);
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.text("DETECTOO", 15, 16);

  pdf.setTextColor(255,255,255);
  pdf.setFontSize(11);
  pdf.text("FORENSIC IMAGE ANALYSIS REPORT", 70, 12);
  pdf.text(
    new Date().toLocaleString(),
    70,
    18
  );

  // ================= VERDICT CARD =================

  pdf.setFillColor(25, 5, 5);
  pdf.setDrawColor(220, 40, 40);
  pdf.roundedRect(15, 35, 180, 28, 4, 4, "FD");

  pdf.setTextColor(255,255,255);
  pdf.setFontSize(20);

  pdf.text(
    result.verdict.toUpperCase(),
    22,
    50
  );

  pdf.setFontSize(10);

  pdf.text(
    `CONFIDENCE: ${result.confidence}%`,
    22,
    58
  );

  pdf.text(
    `TAMPER COVERAGE: ${result.tamper_percentage}%`,
    90,
    58
  );

  // ================= METRICS =================

  pdf.setTextColor(255,60,60);
  pdf.setFontSize(12);
  pdf.text("SCAN METRICS",15,78);

  pdf.setDrawColor(255,80,80);
  pdf.line(45,78,190,78);

  const metrics = [
  ["FILE","Uploaded Image"],
  ["PROC TIME",`${result.processing_time}s`],
  ["REGIONS","4"],
  ["MODEL","DEMO"],
  ["ELA",result.metrics.ela_score],
  ["EDGE",result.metrics.edge_score],
  ["NOISE",result.metrics.noise_score],
  ["CONF",`${result.confidence}%`]
];
  let y = 82;

  metrics.forEach((m,index)=>{

    const col = index % 2;
    const row = Math.floor(index/2);

    const x = col === 0 ? 15 : 105;
    const yy = y + row*14;

    pdf.setFillColor(10,10,25);
    pdf.rect(x,yy,85,12,"F");

    pdf.setTextColor(255,255,255);
    pdf.setFontSize(8);
    pdf.text(m[0],x+3,yy+4);

    pdf.setFontSize(9);
    pdf.text(String(m[1]),x+3,yy+9);

  });

  // ================= IMAGE SECTION =================

  pdf.setTextColor(255,60,60);
  pdf.setFontSize(12);

  pdf.text("IMAGE COMPARISON",15,140);
  pdf.line(60,140,190,140);

  try{

    pdf.addImage(
      preview,
      "JPEG",
      15,
      145,
      80,
      60
    );

    pdf.addImage(
      `data:image/png;base64,${result.overlay_image}`,
      "PNG",
      110,
      145,
      80,
      60
    );
    // Labels below images

  pdf.setFontSize(9);

  pdf.setTextColor(0,180,120);
  pdf.text(
    "ORIGINAL IMAGE",
    15,
    210
  );

  pdf.setTextColor(255,60,60);
  pdf.text(
    "TAMPERED REGIONS",
    110,
    210
  );

  }catch(err){
    console.log(err);
  }

  // ================= REGION TABLE =================

  pdf.setTextColor(255,60,60);
  pdf.text("TAMPERED REGIONS",15,220);

  pdf.line(65,220,190,220);

  pdf.setFillColor(10,10,25);
  pdf.rect(15,225,175,10,"F");

  pdf.setTextColor(255,255,255);

  pdf.text("ID",18,232);
  pdf.text("AREA",50,232);
  pdf.text("CONF",95,232);
  pdf.text("STATUS",140,232);

  const regions = [
    ["#01","4945","36%","TAMPERED"],
    ["#02","3918","61%","TAMPERED"],
    ["#03","1754","51%","TAMPERED"],
    ["#04","339","65%","TAMPERED"]
  ];

  let rowY = 242;

  regions.forEach(r=>{

    pdf.setTextColor(0,0,0);

    pdf.text(r[0],18,rowY);
    pdf.text(r[1],50,rowY);
    pdf.text(r[2],95,rowY);

    pdf.setTextColor(255,0,0);
    pdf.text(r[3],140,rowY);

    rowY += 8;

  });

  // ================= FOOTER =================

  pdf.setFillColor(5,7,20);
  pdf.rect(0,285,210,12,"F");

  pdf.setTextColor(180,180,180);

  pdf.setFontSize(8);

  pdf.text(
    "DETECTOO  • College of Engineering Pune",
    15,
    292
  );

  pdf.save("detectoo-report.pdf");
};

  return (
<div className="detector-page">

  <div className="detector-header">
    <p>◈ FORENSIC ANALYSIS MODULE</p>
    <h1>IMAGE SCANNER</h1>
  </div>

  {!preview && (
    <label className="upload-box">
      <input
        type="file"
        hidden
        onChange={handleFile}
      />

      <div className="upload-content">
        <div className="upload-icon">⬡</div>

        <h3>[ LOAD EVIDENCE FILE ]</h3>

        <p>
          JPEG · PNG · WEBP
        </p>
      </div>
    </label>
  )}

  {loading && (
    <div className="loading-box">
      SCANNING IMAGE...
    </div>
  )}

  {preview && result && (
    <>

      <section className="comparison-section">

        <div className="section-title">
          IMAGE COMPARISON
        </div>

        <div className="comparison-tabs">

          <button
            className={
              viewMode==="side"
              ? "active-tab"
              : ""
            }
            onClick={() =>
              setViewMode("side")
            }
          >
            SIDE BY SIDE
          </button>

          <button
            className={
              viewMode==="heatmap"
              ? "active-tab"
              : ""
            }
            onClick={() =>
              setViewMode("heatmap")
            }
          >
            HEATMAP OVERLAY
          </button>

        </div>

        {viewMode==="side" && (

          <div className="comparison-grid">

            <div className="image-card green">

              <span>
                BEFORE — ORIGINAL
              </span>

              <img
                src={preview}
                alt=""
              />

            </div>

            <div className="image-card red">

              <span>
                AFTER — TAMPERED
              </span>

              <img
                src={`data:image/png;base64,${result.overlay_image}`}
                alt=""
              />

            </div>

          </div>
          
        )}
      <div className="comparison-footer">

        <div>
          <p>AUTHENTIC REGION</p>
          <span>UNMODIFIED EVIDENCE</span>
         </div>

        <div>
          <p>TAMPERED REGION</p>
          <span>FORGERY ISOLATION</span>
        </div>

      </div>

        {viewMode==="heatmap" && (

          <div className="heatmap-wrapper">

            <div className="image-card red">

              <span>
                HEATMAP VIEW
              </span>

              <img
                src={`data:image/png;base64,${result.heatmap_image}`}
                alt=""
              />

            </div>

          </div>

        )}

        {viewMode==="drag" && (

         <div className="compare-wrapper">

            <ReactCompareImage
              leftImage={preview}
              rightImage={`data:image/png;base64,${result.overlay_image}`}
                style={{
                width: "100%",
                height: "500px",
                objectFit: "cover"
              }}
            />

          </div>

        )}

      </section>

      <section className="results-grid">

        <div className="verdict-panel">

          <div className="warning-icon">
            ⚠
          </div>

          <h1>
            {result.verdict === "Tampered"
              ? "EVIDENCE TAMPERED"
              : "IMAGE AUTHENTIC"}
          </h1>

          <p className="verdict-sub">

            CONFIDENCE
            {' '}
            {result.confidence}%

          </p>

          <div className="coverage">

            <div className="coverage-top">

              <span>
                TAMPER COVERAGE
              </span>

              <span>
                {result.confidence}%
              </span>

            </div>

            <div className="progress-bar">

              <div
                className="progress-fill"
                style={{
                  width:
                  `${result.confidence}%`
                }}
              />

            </div>

          </div>

        </div>

        <div className="metrics-panel">

          <div className="metrics-grid">

            <div className="metric-card">
              <p>TAMPER %</p>
              <h2>
                {result.tamper_percentage}%
              </h2>
            </div>

            <div className="metric-card">
              <p>CONFIDENCE</p>
              <h2>
                {result.confidence}%
              </h2>
            </div>

            <div className="metric-card">
              <p>REGIONS</p>
              <h2>4</h2>
            </div>

            <div className="metric-card">
              <p>ELA</p>
              <h2>
                {result.metrics.ela_score}
              </h2>
            </div>

            <div className="metric-card">
              <p>EDGE</p>
              <h2>
                {result.metrics.edge_score}
              </h2>
            </div>

            <div className="metric-card">
              <p>NOISE</p>
              <h2>
                {result.metrics.noise_score}
              </h2>
            </div>

          </div>
          <div className="system-log">

          <h3>SYSTEM LOG</h3>

          <div className="log-box">

            <p>&gt; VERDICT: {result.verdict}</p>

            <p>&gt; CONFIDENCE: {result.confidence}%</p>

            <p>&gt; TAMPER COVERAGE: {result.tamper_percentage}%</p>

            <p>&gt; ELA SCORE: {result.metrics.ela_score}</p>

            <p>&gt; EDGE SCORE: {result.metrics.edge_score}</p>

            <p>&gt; NOISE SCORE: {result.metrics.noise_score}</p>

            <p>&gt; PROCESSING TIME: {result.processing_time}s</p>

           </div>

      </div>

    </div>
        
      </section>
      <div className="regions-section">

  <h3>TAMPERED REGIONS (4)</h3>

  <div className="regions-grid">

    <div className="region-card">
      <h4>REGION #01</h4>
      <p>AREA: 4945 px</p>
      <p>CONF: 36%</p>
    </div>

    <div className="region-card">
      <h4>REGION #02</h4>
      <p>AREA: 3918 px</p>
      <p>CONF: 61%</p>
    </div>

    <div className="region-card">
      <h4>REGION #03</h4>
      <p>AREA: 1754 px</p>
      <p>CONF: 51%</p>
    </div>

    <div className="region-card">
      <h4>REGION #04</h4>
      <p>AREA: 339 px</p>
      <p>CONF: 65%</p>
    </div>

  </div>

</div>

      <div className="action-buttons">

        <button
          className="download-btn"
          onClick={downloadPDF}
        >
          DOWNLOAD PDF REPORT
        </button>

        <button
          className="newscan-btn"
          onClick={() => {
            setPreview(null);
            setResult(null);
          }}
        >
          NEW SCAN
        </button>

      </div>

    </>
  )}

</div>
)}