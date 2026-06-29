import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from "jspdf-autotable";
import './Detector.css';

export default function Detector() {
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("side");

  //const API_URL = "https://detectoo.onrender.com";
  const API_URL = "http://localhost:8000";
const handleFile = async (e) => {

  const file = e.target.files[0];

  if (!file) return;

  // Allow only supported image types
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    alert("Please upload a JPG, PNG or WEBP image.");
    return;
  }

  // Read image as Base64
  const reader = new FileReader();

  reader.onload = async () => {

    setPreview(reader.result);

    setLoading(true);

    try {

      const formData = new FormData();

      formData.append("file", file);

      const res = await fetch(
        `${API_URL}/v1/analyze`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      setResult(data);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  };

  reader.readAsDataURL(file);

};
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.crossOrigin = "Anonymous";

    img.onload = () => resolve(img);

    img.onerror = reject;

    img.src = src;
  });
};

const downloadPDF = async () => {

  const pdf = new jsPDF("p", "mm", "a4");

  let currentY = 0;

  // =====================================================
  // HEADER
  // =====================================================

  pdf.setFillColor(5,7,20);
  pdf.rect(0,0,210,28,"F");

  pdf.setTextColor(255,60,60);
  pdf.setFontSize(24);
  pdf.setFont("helvetica","bold");
  pdf.text("DETECTOO",15,16);

  pdf.setTextColor(255,255,255);
  pdf.setFontSize(11);

  pdf.text(
      " AI IMAGE FORENSIC REPORT",
      70,
      12
  );

  pdf.text(
      new Date().toLocaleString(),
      70,
      18
  );

  currentY = 35;

  // =====================================================
  // VERDICT CARD
  // =====================================================

  pdf.setFillColor(25,5,5);
  pdf.setDrawColor(220,40,40);

  pdf.roundedRect(
      15,
      currentY,
      180,
      28,
      4,
      4,
      "FD"
  );

  pdf.setTextColor(255,255,255);

  pdf.setFontSize(20);

  pdf.text(
      result.verdict.toUpperCase(),
      22,
      currentY+15
  );

  pdf.setFontSize(10);

  pdf.text(
      `AI CONFIDENCE : ${result.ai_confidence}%`,
      22,
      currentY+23
  );

  pdf.text(
      `TAMPER COVERAGE : ${result.tamper_percentage}%`,
      90,
      currentY+23
  );

  currentY += 43;

  // =====================================================
  // METRICS TITLE
  // =====================================================

  pdf.setTextColor(255,60,60);

  pdf.setFontSize(12);

  pdf.text(
      "SCAN METRICS",
      15,
      currentY
  );

  pdf.line(
      45,
      currentY,
      190,
      currentY
  );

  currentY += 5;

  // =====================================================
  // METRICS
  // =====================================================

  const metrics = [

      ["FILE","Uploaded Image"],

      ["PROCESS TIME",`${result.processing_time}s`],

      ["REGIONS",String(result.region_count)],

      ["MODEL","EfficientNet-B0"],

      ["AI PREDICTION",
      result.ai_prediction ?? "N/A"]  ,

      ["AI CONFIDENCE",
      `${result.ai_confidence ?? 0}%`],

      ["ELA SCORE",String(result.metrics.ela_score)],

      ["EDGE SCORE",String(result.metrics.edge_score)],

      ["NOISE SCORE",String(result.metrics.noise_score)],

      ["RECOMMENDATION",

      result.verdict==="Suspicious"

      ? "Manual Review"

      : "Verified"]

  ];

  metrics.forEach((m,index)=>{

      const column = index % 2;

      const row = Math.floor(index/2);

      const x = column===0 ? 15 : 105;

      const y = currentY + row*14;

      pdf.setFillColor(10,10,25);

      pdf.rect(
          x,
          y,
          85,
          12,
          "F"
      );

      pdf.setTextColor(255,255,255);

      pdf.setFontSize(8);

      pdf.text(
          m[0],
          x+3,
          y+4
      );

      pdf.setFontSize(9);

      pdf.text(
          String(m[1]),
          x+3,
          y+9
      );

  });

  currentY += Math.ceil(metrics.length/2)*14 + 10;

  // =====================================================
  // IMAGE COMPARISON
  // =====================================================

  pdf.setTextColor(255,60,60);

  pdf.setFontSize(12);

  pdf.text(
      "IMAGE COMPARISON",
      15,
      currentY
  );

  pdf.line(
      60,
      currentY,
      190,
      currentY
  );

  currentY += 5;

  try {

    // Original Image
    if (preview) {

        const originalFormat = preview.includes("image/jpeg")
            ? "JPEG"
            : "PNG";

        pdf.addImage(
            preview,
            originalFormat,
            15,
            currentY,
            80,
            60
        );
    }

    // Overlay Image
    if (result.overlay_image) {

        pdf.addImage(
            `data:image/png;base64,${result.overlay_image}`,
            "PNG",
            110,
            currentY,
            80,
            60
        );
    }

    pdf.setFontSize(9);

    pdf.setTextColor(0,180,120);
    pdf.text("ORIGINAL IMAGE",15,currentY+65);

    pdf.setTextColor(255,60,60);
    pdf.text("DETECTED REGIONS",110,currentY+65);

}
catch(err){

    console.error("PDF Image Error:",err);

}

  currentY += 80;

    // =====================================================
  // DETECTED REGIONS TABLE
  // =====================================================

  pdf.setTextColor(255,60,60);
  pdf.setFontSize(12);

  pdf.text(
      "DETECTED REGIONS",
      15,
      currentY
  );

  pdf.line(
      60,
      currentY,
      190,
      currentY
  );

  currentY += 5;

  pdf.setFillColor(10,10,25);

  pdf.rect(
      15,
      currentY,
      175,
      10,
      "F"
  );

  pdf.setTextColor(255,255,255);

  pdf.setFontSize(9);

  pdf.text("ID",18,currentY+7);
  pdf.text("AREA(px)",45,currentY+7);
  pdf.text("CONF",90,currentY+7);
  pdf.text("STATUS",135,currentY+7);

  currentY += 15;

  const regions = result.regions || [];

  if(regions.length===0){

      pdf.setTextColor(120,120,120);

      pdf.text(
          "No suspicious regions detected.",
          18,
          currentY
      );

      currentY += 10;

  }else{

      regions.forEach(region=>{

          pdf.setTextColor(0,0,0);

          pdf.text(
              `#${region.id}`,
              18,
              currentY
          );

          pdf.text(
              String(region.area_px),
              45,
              currentY
          );

          pdf.text(
              `${region.confidence}%`,
              90,
              currentY
          );

          // Set color based on region status

          if(region.status === "High Risk"){

              pdf.setTextColor(255,0,0);      // Red

          }
          else if(region.status === "Medium Risk"){

              pdf.setTextColor(255,165,0);    // Orange

          }
          else{

              pdf.setTextColor(0,180,0);      // Green

          }

          // Print the status

          pdf.text(
              region.status,
              135,
              currentY
          );

          currentY += 8;

      });

  }

  currentY += 8;

  
  // =====================================================
  // RECOMMENDATION
  // =====================================================

  pdf.setTextColor(255,60,60);

  pdf.setFontSize(12);

  pdf.text(
      "FINAL RECOMMENDATION",
      15,
      currentY
  );

  pdf.line(
      70,
      currentY,
      190,
      currentY
  );

  currentY += 8;

  pdf.setFillColor(245,245,245);

  pdf.roundedRect(
      15,
      currentY,
      175,
      18,
      2,
      2,
      "F"
  );

  pdf.setTextColor(40,40,40);

  pdf.setFontSize(10);

  pdf.text(
      result.recommendation,
      18,
      currentY+10
  );

  currentY += 28;

  // =====================================================
  // SUMMARY
  // =====================================================

  pdf.setTextColor(255,60,60);

  pdf.setFontSize(12);

  pdf.text(
      "ANALYSIS SUMMARY",
      15,
      currentY
  );

  pdf.line(
      55,
      currentY,
      190,
      currentY
  );

  currentY += 8;

  pdf.setTextColor(0,0,0);

  pdf.setFontSize(10);

  pdf.text(
      `Final Verdict : ${result.verdict}`,
      18,
      currentY
  );

  currentY += 6;

  pdf.text(
      `AI Prediction : ${result.ai_prediction}`,
      18,
      currentY
  );

  currentY += 6;

  pdf.text(
      `AI Confidence : ${result.ai_confidence}%`,
      18,
      currentY
  );

  currentY += 6;

  pdf.text(
      `Tamper Coverage : ${result.tamper_percentage}%`,
      18,
      currentY
  );

  currentY += 12;

  // =====================================================
  // FOOTER
  // =====================================================

  pdf.setFillColor(5,7,20);

  pdf.rect(
      0,
      285,
      210,
      12,
      "F"
  );

  pdf.setTextColor(180,180,180);

  pdf.setFontSize(8);

  pdf.text(
      "DETECTOO  •  AI Image Forgery Detection System • Final Year Project",
      15,
      292
  );

  pdf.save("Detectoo_Report.pdf");

};

console.log("Preview =", preview);

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
        accept='.jpg, .jpeg, .png, .webp'
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
                alt="Original"
                onLoad={() => console.log("Image Loaded")}
                onError={(e) => {
                  console.log("Image Error");
                  console.log(preview);
                }}
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
              : result.verdict === "Authentic"
              ? "IMAGE AUTHENTIC"
              : "SUSPICIOUS IMAGE"}
          </h1>

          <p className="verdict-sub">

            AI CONFIDENCE {result.ai_confidence}%

          </p>

          <div className="coverage">

            <div className="coverage-top">

              <span>
                TAMPER COVERAGE
              </span>

              <span>
                {result.ai_confidence}%
              </span>

            </div>

            <div className="progress-bar">

              <div
                className="progress-fill"
                style={{
                  width: `${result.ai_confidence}%`
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
              <p>AI CONFIDENCE</p>
              <h2>{result.ai_confidence}%</h2>
            </div>

            <div className="metric-card">
              <p>AI PREDICTION</p>
              <h2>{result.ai_prediction}</h2>
            </div>

            <div className="metric-card">
              <p>REGIONS</p>
              <h2>{result.region_count}</h2>
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

            <p>&gt; FINAL VERDICT: {result.verdict}</p>

            <p>&gt; AI PREDICTION: {result.ai_prediction}</p>

            <p>&gt; AI CONFIDENCE: {result.ai_confidence}%</p>

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

  <div className="regions-grid">
  {result.regions.map((region, index) => (
    <div
    key={region.id}
    className={`region-card ${region.status.replace(/\s+/g,"-").toLowerCase()}`}>
      <h4>REGION #{index + 1}</h4>
      <p>AREA: {region.area_px} px</p>
      <p>CONF: {region.confidence}%</p>
      <p>STATUS: {region.status}</p>
    </div>
  ))}
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