import './About.css';
export default function About() {

  return (

    <div className="about-container">

  <p className="about-subtitle">
    ◇ SYSTEM DOCUMENTATION
  </p>

  <h1 className="about-title">
    About Detectoo
  </h1>

  <div className="about-card">

    <h2>Algorithms Used</h2>

    <ul>

      <li>Error Level Analysis (ELA)</li>

      <li>Edge Detection</li>

      <li>Noise Analysis</li>

      <li>Heatmap Generation</li>

      <li>Overlay Visualization</li>

    </ul>

    <h2>Technologies Used</h2>

    <ul>

      <li>React.js</li>

      <li>FastAPI</li>

      <li>OpenCV</li>

      <li>Python</li>

      <li>Railway</li>

      <li>Netlify</li>

    </ul>

    <h2>Project Team</h2>

    <div className="team-list">

      <div className="team-member"> 
        <div className="avatar">SP</div> 
        <div> <h4>Sneha Pawar</h4> 
          <p>Lead Developer & Architecture</p> 
          <span>snehagpawar03@gmail.com</span> 
        </div> 
      </div> 

      <div className="team-member"> 
        <div className="avatar">AS</div> 
          <div> <h4>Anisha Sathe</h4> 
          <p>Algorithm Development & Testing</p> 
          <span>anisha.sathe14@gmail.com</span> 
        </div> 
     </div>
      
      <div className="team-member"> 
        <div className="avatar">SS</div> 
        <div> <h4>Shravani Sonawane</h4> 
           <p>UI/UX Design & Documentation</p> 
           <span>shravanis493@gmail.com</span> 
        </div> 
      </div> 
      
      <div className="college-line"> COLLEGE OF ENGINEERING, PUNE — EDUCATIONAL & RESEARCH PROJECT 
        </div> 
      </div> 
      
  {/* DISCLAIMER */} 
      <div className="disclaimer-box"> ⚠ DISCLAIMER: No automated detection system is 100% accurate. Results are one factor among several for image authentication. This tool is for educational and research purposes. </div> 
      <div className="about-footer"> DETECTOO • COLLEGE OF ENGINEERING PUNE </div>
  </div>

</div>
  );
}