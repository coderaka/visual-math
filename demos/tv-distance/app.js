// ============================================================
// TV Distance Visualization — app.js
// Core logic: Gaussian density, D3 rendering, TV computation
// ============================================================

(function () {
  'use strict';

  // --- Configuration ---
  const CONFIG = {
    xMin: -8,
    xMax: 8,
    nPoints: 500,       // sampling resolution for curves
    nIntegral: 2000,    // integration resolution for TV distance
    transition: 180,    // ms for smooth transitions
  };

  // --- Presets ---
  const PRESETS = {
    identical:  { muP: 0,   sigmaP: 1,   muQ: 0,   sigmaQ: 1   },
    slight:    { muP: 0,   sigmaP: 1,   muQ: 0.5, sigmaQ: 1   },
    moderate:  { muP: -1,  sigmaP: 1,   muQ: 1.5, sigmaQ: 1.2 },
    disjoint:  { muP: -3,  sigmaP: 0.6, muQ: 3,   sigmaQ: 0.6 },
  };

  // --- Math utilities ---
  function gaussianPDF(x, mu, sigma) {
    const z = (x - mu) / sigma;
    return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
  }

  function computeTVDistance(muP, sigmaP, muQ, sigmaQ) {
    const dx = (CONFIG.xMax - CONFIG.xMin) / CONFIG.nIntegral;
    let integral = 0;
    for (let i = 0; i <= CONFIG.nIntegral; i++) {
      const x = CONFIG.xMin + i * dx;
      const diff = Math.abs(gaussianPDF(x, muP, sigmaP) - gaussianPDF(x, muQ, sigmaQ));
      // Trapezoidal rule
      if (i === 0 || i === CONFIG.nIntegral) {
        integral += diff * 0.5;
      } else {
        integral += diff;
      }
    }
    return (integral * dx) / 2; // TV = (1/2) ∫|p-q|
  }

  function generateCurveData(mu, sigma) {
    const data = [];
    const dx = (CONFIG.xMax - CONFIG.xMin) / CONFIG.nPoints;
    for (let i = 0; i <= CONFIG.nPoints; i++) {
      const x = CONFIG.xMin + i * dx;
      data.push({ x, y: gaussianPDF(x, mu, sigma) });
    }
    return data;
  }

  function generateShadedRegions(muP, sigmaP, muQ, sigmaQ) {
    const dx = (CONFIG.xMax - CONFIG.xMin) / CONFIG.nPoints;
    const regionPgtQ = [];
    const regionQgtP = [];

    for (let i = 0; i <= CONFIG.nPoints; i++) {
      const x = CONFIG.xMin + i * dx;
      const pVal = gaussianPDF(x, muP, sigmaP);
      const qVal = gaussianPDF(x, muQ, sigmaQ);

      if (pVal >= qVal) {
        regionPgtQ.push({ x, yTop: pVal, yBot: qVal });
        regionQgtP.push({ x, yTop: qVal, yBot: qVal }); // zero-height
      } else {
        regionQgtP.push({ x, yTop: qVal, yBot: pVal });
        regionPgtQ.push({ x, yTop: pVal, yBot: pVal }); // zero-height
      }
    }
    return { regionPgtQ, regionQgtP };
  }

  // --- DOM refs ---
  const sliderMuP = document.getElementById('mu-p');
  const sliderSigmaP = document.getElementById('sigma-p');
  const sliderMuQ = document.getElementById('mu-q');
  const sliderSigmaQ = document.getElementById('sigma-q');
  const valMuP = document.getElementById('mu-p-val');
  const valSigmaP = document.getElementById('sigma-p-val');
  const valMuQ = document.getElementById('mu-q-val');
  const valSigmaQ = document.getElementById('sigma-q-val');
  const tvValueEl = document.getElementById('tv-value');

  // --- D3 Setup ---
  const chartDiv = document.getElementById('chart');
  const margin = { top: 20, right: 30, bottom: 40, left: 45 };

  let width, height;
  let svg, g, xScale, yScale, xAxis, yAxis;
  let lineGen, areaGen;
  let pathP, pathQ, areaPgtQ, areaQgtP;

  function initChart() {
    const rect = chartDiv.getBoundingClientRect();
    width = rect.width - margin.left - margin.right;
    height = rect.height - margin.top - margin.bottom;

    svg = d3.select('#chart')
      .append('svg')
      .attr('width', rect.width)
      .attr('height', rect.height);

    // SVG glow filter
    const defs = svg.append('defs');

    // Glow for P curve
    const glowP = defs.append('filter').attr('id', 'glow-p');
    glowP.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    glowP.append('feFlood').attr('flood-color', '#06d6a0').attr('flood-opacity', '0.5');
    glowP.append('feComposite').attr('in2', 'blur').attr('operator', 'in');
    const mergeP = glowP.append('feMerge');
    mergeP.append('feMergeNode');
    mergeP.append('feMergeNode').attr('in', 'SourceGraphic');

    // Glow for Q curve
    const glowQ = defs.append('filter').attr('id', 'glow-q');
    glowQ.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    glowQ.append('feFlood').attr('flood-color', '#e879f9').attr('flood-opacity', '0.5');
    glowQ.append('feComposite').attr('in2', 'blur').attr('operator', 'in');
    const mergeQ = glowQ.append('feMerge');
    mergeQ.append('feMergeNode');
    mergeQ.append('feMergeNode').attr('in', 'SourceGraphic');

    g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    xScale = d3.scaleLinear().domain([CONFIG.xMin, CONFIG.xMax]).range([0, width]);
    yScale = d3.scaleLinear().domain([0, 1]).range([height, 0]);

    // Axes
    xAxis = g.append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0,${height})`);

    yAxis = g.append('g')
      .attr('class', 'axis y-axis');

    // Line generator
    lineGen = d3.line()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .curve(d3.curveBasis);

    // Area generator for shaded regions
    areaGen = d3.area()
      .x(d => xScale(d.x))
      .y0(d => yScale(d.yBot))
      .y1(d => yScale(d.yTop))
      .curve(d3.curveBasis);

    // Shaded areas (behind curves)
    areaPgtQ = g.append('path').attr('class', 'area-p-gt-q');
    areaQgtP = g.append('path').attr('class', 'area-q-gt-p');

    // Curves (on top)
    pathP = g.append('path').attr('class', 'curve-p').attr('filter', 'url(#glow-p)');
    pathQ = g.append('path').attr('class', 'curve-q').attr('filter', 'url(#glow-q)');
  }

  function updateChart(animate) {
    const muP = +sliderMuP.value;
    const sigmaP = +sliderSigmaP.value;
    const muQ = +sliderMuQ.value;
    const sigmaQ = +sliderSigmaQ.value;

    // Update display values
    valMuP.textContent = muP.toFixed(2);
    valSigmaP.textContent = sigmaP.toFixed(2);
    valMuQ.textContent = muQ.toFixed(2);
    valSigmaQ.textContent = sigmaQ.toFixed(2);

    // Generate data
    const dataP = generateCurveData(muP, sigmaP);
    const dataQ = generateCurveData(muQ, sigmaQ);
    const { regionPgtQ, regionQgtP } = generateShadedRegions(muP, sigmaP, muQ, sigmaQ);

    // Compute y-axis domain
    const yMax = Math.max(
      d3.max(dataP, d => d.y),
      d3.max(dataQ, d => d.y)
    ) * 1.1;

    yScale.domain([0, yMax]);

    // Update axes
    const t = animate
      ? d3.transition().duration(CONFIG.transition).ease(d3.easeCubicOut)
      : d3.transition().duration(0);

    xAxis.transition(t).call(
      d3.axisBottom(xScale).ticks(10).tickSize(-height).tickFormat(d3.format('.0f'))
    );
    yAxis.transition(t).call(
      d3.axisLeft(yScale).ticks(5).tickSize(-width).tickFormat(d3.format('.2f'))
    );

    // Make grid lines subtle
    g.selectAll('.tick line').attr('stroke', '#2a3555').attr('opacity', 0.3);
    g.selectAll('.domain').attr('stroke', '#2a3555');

    // Update curves
    if (animate) {
      pathP.transition(t).attr('d', lineGen(dataP));
      pathQ.transition(t).attr('d', lineGen(dataQ));
      areaPgtQ.transition(t).attr('d', areaGen(regionPgtQ));
      areaQgtP.transition(t).attr('d', areaGen(regionQgtP));
    } else {
      pathP.attr('d', lineGen(dataP));
      pathQ.attr('d', lineGen(dataQ));
      areaPgtQ.attr('d', areaGen(regionPgtQ));
      areaQgtP.attr('d', areaGen(regionQgtP));
    }

    // Compute and display TV distance
    const tv = computeTVDistance(muP, sigmaP, muQ, sigmaQ);
    tvValueEl.textContent = tv.toFixed(3);
  }

  // --- Event listeners ---
  function onSliderInput() { updateChart(false); }

  sliderMuP.addEventListener('input', onSliderInput);
  sliderSigmaP.addEventListener('input', onSliderInput);
  sliderMuQ.addEventListener('input', onSliderInput);
  sliderSigmaQ.addEventListener('input', onSliderInput);

  // Presets
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = PRESETS[btn.dataset.preset];
      if (!preset) return;
      sliderMuP.value = preset.muP;
      sliderSigmaP.value = preset.sigmaP;
      sliderMuQ.value = preset.muQ;
      sliderSigmaQ.value = preset.sigmaQ;
      updateChart(true);
    });
  });

  // Resize handler
  function onResize() {
    d3.select('#chart svg').remove();
    initChart();
    updateChart(false);
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 200);
  });

  // --- MathJax rendering ---
  function renderFormulas() {
    // Main formula in explanation
    const formulaEl = document.getElementById('main-formula');
    if (formulaEl) {
      formulaEl.innerHTML = '$$d_{\\mathrm{TV}}(P, Q) = \\frac{1}{2} \\int_{-\\infty}^{\\infty} |p(x) - q(x)| \\, dx$$';
    }

    // Formula in readout
    const tvFormulaEl = document.getElementById('tv-formula');
    if (tvFormulaEl) {
      tvFormulaEl.innerHTML = '$\\frac{1}{2}\\int|p-q|\\,dx$';
    }

    // Typeset when MathJax is ready
    if (window.MathJax && window.MathJax.typesetPromise) {
      MathJax.typesetPromise().catch(err => console.warn('MathJax typeset error:', err));
    }
  }

  // --- Init ---
  function init() {
    initChart();
    updateChart(false);
    // Wait for MathJax to load
    if (window.MathJax && window.MathJax.typesetPromise) {
      renderFormulas();
    } else {
      // MathJax loads async, poll
      const poll = setInterval(() => {
        if (window.MathJax && window.MathJax.typesetPromise) {
          clearInterval(poll);
          renderFormulas();
        }
      }, 200);
    }
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
