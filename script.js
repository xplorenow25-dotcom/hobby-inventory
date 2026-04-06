// ========================================
// DIRTMATH PRO - CORE LOGIC ENGINE
// ========================================

// --- STATE & USAGE ENGINE ---
let isProUser = localStorage.getItem('dm_is_pro') === 'true';
const FREE_LIMIT = 5;
let currentUnit = 'imperial'; 
let activeCalcId = '';
let activeCalcName = '';
let pendingAction = ''; 

// DOM Elements
const viewHome = document.getElementById('view-home');
const viewCalc = document.getElementById('view-calc');
const viewSettings = document.getElementById('view-settings');
const btnBack = document.getElementById('btn-back');
const btnSettings = document.getElementById('btn-settings');
const unitToggleBox = document.getElementById('unit-toggle-box');
const primaryResult = document.getElementById('primary-result');
const secondaryResult = document.getElementById('secondary-result');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    checkMonthlyUsage();
    updateUIForPro();
    renderHistory();
    updateLabels();

    // Load Settings
    document.getElementById('set-company').value = localStorage.getItem('dm_company') || '';
    document.getElementById('set-phone').value = localStorage.getItem('dm_phone') || '';
    document.getElementById('set-email').value = localStorage.getItem('dm_email') || '';

    // Event Listeners for inputs (Auto-Calculate)
    document.querySelectorAll('input, select').forEach(el => { el.addEventListener('input', calculate); });

    // Event Listeners for UI buttons
    document.getElementById('btn-back').addEventListener('click', goHome);
    document.getElementById('btn-settings').addEventListener('click', openSettings);
    document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
    document.getElementById('btn-reset-app').addEventListener('click', resetApp);
    
    document.getElementById('btn-metric').addEventListener('click', () => switchUnit('metric'));
    document.getElementById('btn-imperial').addEventListener('click', () => switchUnit('imperial'));

    // Paywall & Modals
    document.getElementById('btn-test-unlock').addEventListener('click', testUnlockPro);
    document.getElementById('btn-close-paywall').addEventListener('click', closePaywall);
    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    document.getElementById('btn-confirm-modal').addEventListener('click', confirmModal);

    // Setup Calculator Menu Buttons
    document.querySelectorAll('.btn-menu').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const calcId = e.currentTarget.getAttribute('data-calc');
            const calcName = e.currentTarget.getAttribute('data-name');
            openCalc(calcId, calcName);
        });
    });

    // Setup Bottom Nav Actions
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.currentTarget.getAttribute('data-action');
            if(action === 'export') exportBackup();
            else handleNavAction(action);
        });
    });
});

// --- PAYWALL LOGIC ---
function checkMonthlyUsage() {
    const currentMonth = new Date().toISOString().slice(0, 7); 
    if (localStorage.getItem('dm_usage_month') !== currentMonth) {
        localStorage.setItem('dm_usage_month', currentMonth);
        localStorage.setItem('dm_pdf_count', '0');
        localStorage.setItem('dm_log_count', '0');
    }
}

function getUsage(action) { return parseInt(localStorage.getItem(`dm_${action}_count`) || '0'); }
function incrementUsage(action) { localStorage.setItem(`dm_${action}_count`, getUsage(action) + 1); updateUsageDisplay(); }

function updateUIForPro() {
    const proCalcs = ['prod', 'fuel', 'curb', 'swell'];
    proCalcs.forEach(id => {
        const btn = document.querySelector(`.btn-menu[data-calc="${id}"]`);
        if(btn) {
            if (isProUser) { btn.classList.remove('locked'); btn.innerHTML = btn.innerHTML.replace('🔒', '&#8250;'); } 
            else { btn.classList.add('locked'); btn.innerHTML = btn.innerHTML.replace('›', '🔒').replace('&#8250;', '🔒'); }
        }
    });

    // Toggle the PRO badge safely using a class
    const badge = document.getElementById('pro-badge');
    if (isProUser) {
        badge.classList.add('show');
    } else {
        badge.classList.remove('show');
    }
    
    updateUsageDisplay();
}

function updateUsageDisplay() {
    const display = document.getElementById('usage-display');
    if(!display) return;
    if(isProUser) { display.innerText = "PRO ACCOUNT: Unlimited Usage"; return; }
    display.innerText = `Free Uses This Month - PDFs: ${getUsage('pdf')}/5 | Logs: ${getUsage('log')}/5`;
}

function showPaywall(message) { document.getElementById('paywall-msg').innerText = message; document.getElementById('paywall-modal').style.display = 'flex'; }
function closePaywall() { document.getElementById('paywall-modal').style.display = 'none'; }
function testUnlockPro() { localStorage.setItem('dm_is_pro', 'true'); isProUser = true; closePaywall(); updateUIForPro(); alert("App Unlocked!"); }
function resetApp() { localStorage.setItem('dm_is_pro', 'false'); isProUser=false; updateUIForPro(); goHome(); alert("App reset to Free mode."); }

// --- NAVIGATION ---
function hideAllViews() { viewHome.classList.remove('active'); viewCalc.classList.remove('active'); viewSettings.classList.remove('active'); }

function openSettings() {
    hideAllViews(); activeCalcId = ''; viewSettings.classList.add('active'); 
    btnBack.style.display = 'flex'; btnSettings.style.display = 'none'; unitToggleBox.style.display = 'none';
}

function openCalc(calcId, calcName) {
    const proCalcs = ['prod', 'fuel', 'curb', 'swell'];
    if (!isProUser && proCalcs.includes(calcId)) { showPaywall("This is a Pro Tool."); return; }

    activeCalcId = calcId; activeCalcName = calcName;
    document.querySelectorAll('input[type="number"]').forEach(input => input.value = '');
    primaryResult.innerHTML = "0.00"; secondaryResult.innerText = "--";

    hideAllViews(); viewCalc.classList.add('active');
    btnBack.style.display = 'flex'; btnSettings.style.display = 'flex'; unitToggleBox.style.display = 'flex';
    
    document.querySelectorAll('.calc-form').forEach(f => f.classList.remove('active'));
    document.getElementById(`form-${calcId}`).classList.add('active');
    updateLabels();
}

function goHome() {
    hideAllViews(); activeCalcId = ''; viewHome.classList.add('active');
    btnBack.style.display = 'none'; btnSettings.style.display = 'flex'; unitToggleBox.style.display = 'flex';
}

function saveSettings() {
    localStorage.setItem('dm_company', document.getElementById('set-company').value); 
    localStorage.setItem('dm_phone', document.getElementById('set-phone').value); 
    localStorage.setItem('dm_email', document.getElementById('set-email').value);
    alert("Profile Saved!"); goHome();
}

function switchUnit(unit) {
    currentUnit = unit; 
    document.getElementById('btn-metric').classList.toggle('active', unit === 'metric'); 
    document.getElementById('btn-imperial').classList.toggle('active', unit === 'imperial');
    updateLabels(); if(activeCalcId) calculate();
}

function updateLabels() {
    const isM = currentUnit === 'metric';
    document.querySelectorAll('.lbl-vol').forEach(el => el.innerText = isM ? '(m³)' : '(yd³)'); 
    document.querySelectorAll('.lbl-len').forEach(el => el.innerText = isM ? '(m)' : '(ft)');
    document.querySelectorAll('.lbl-small').forEach(el => el.innerText = isM ? '(cm)' : '(in)'); 
    document.querySelectorAll('.lbl-liq').forEach(el => el.innerText = isM ? '(Liters)' : '(Gal)');
    document.querySelectorAll('.lbl-liq-hr').forEach(el => el.innerText = isM ? '(L/hr)' : '(Gal/hr)');
}

// --- MATH ENGINE ---
function calculate() {
    primaryResult.classList.remove('animating'); void primaryResult.offsetWidth; primaryResult.classList.add('animating');
    const isM = currentUnit === 'metric'; let res1 = "0.00", res2 = "--"; const val = (id) => parseFloat(document.getElementById(id).value) || 0;

    if (activeCalcId === 'prod') { if(val('prod-cycle') > 0) { const p = (val('prod-cap') / val('prod-cycle')) * 3600 * val('prod-eff'); res1 = `${p.toFixed(1)} ${isM ? 'm³' : 'yd³'}/hr`; res2 = "Based on inputs"; } }
    else if (activeCalcId === 'bucket') { let vol = isM ? (val('buc-w')/100)*(val('buc-l')/100)*(val('buc-d')/100) : ((val('buc-w')/12)*(val('buc-l')/12)*(val('buc-d')/12))/27; res1 = `${vol.toFixed(3)} ${isM ? 'm³' : 'yd³'}`; res2 = `Heaped (x1.25): ${(vol*1.25).toFixed(3)}`; }
    else if (activeCalcId === 'fuel') { res1 = `$${(val('fuel-rate') * val('fuel-price') * val('fuel-hrs')).toFixed(2)}`; res2 = `Used: ${(val('fuel-rate')*val('fuel-hrs')).toFixed(1)} ${isM ? 'L' : 'Gal'}`; }
    else if (activeCalcId === 'trench') { let vol = val('tr-len') * ((val('tr-tw') + val('tr-bw'))/2) * val('tr-dep'); if(!isM) vol /= 27; res1 = `${vol.toFixed(2)} ${isM ? 'm³' : 'yd³'}`; res2 = "Solid bank volume"; }
    else if (activeCalcId === 'slab') { let vol = isM ? val('sl-l') * val('sl-w') * (val('sl-d')/100) : (val('sl-l') * val('sl-w') * (val('sl-d')/12))/27; vol *= (1 + val('sl-buf')/100); res1 = `${vol.toFixed(2)} ${isM ? 'm³' : 'yd³'}`; res2 = `${Math.ceil(vol * (isM?60:45))} Standard Bags`; }
    else if (activeCalcId === 'curb') { const div = isM ? 100 : 12; let vol = (((val('cu-cw')/div) * (val('cu-ch')/div)) + ((val('cu-gw')/div) * (val('cu-ft')/div))) * val('cu-l'); if(!isM) vol /= 27; res1 = `${vol.toFixed(2)} ${isM ? 'm³' : 'yd³'}`; res2 = "Includes curb + gutter tray"; }
    else if (activeCalcId === 'post') { const w = val('po-w') / (isM ? 100 : 12); let sv = document.getElementById('po-type').value === 'round' ? (Math.PI * Math.pow(w/2, 2) * val('po-d')) : (w * w * val('po-d')); let total = sv * val('po-qty'); if(!isM) total /= 27; res1 = `${total.toFixed(2)} ${isM ? 'm³' : 'yd³'}`; res2 = `For ${val('po-qty') || 0} holes`; }
    else if (activeCalcId === 'block') { const wa = val('bl-l') * val('bl-h'); let ba = document.getElementById('bl-type').value === 'cmu' ? (isM ? 0.08 : 0.888) : (isM ? 0.014 : 0.15); res1 = `${Math.ceil(wa / ba)}`; res2 = `Wall Area: ${wa.toFixed(1)} ${isM ? 'm²' : 'ft²'}`; }
    else if (activeCalcId === 'unit') { const t = document.getElementById('un-type').value, v = val('un-val'); if(t==='len') res1 = `${isM ? (v*3.28084).toFixed(2)+' ft' : (v/3.28084).toFixed(2)+' m'}`; if(t==='vol') res1 = `${isM ? (v*1.30795).toFixed(2)+' yd³' : (v/1.30795).toFixed(2)+' m³'}`; if(t==='wt') res1 = `${isM ? (v*2.20462).toFixed(2)+' lbs' : (v/2.20462).toFixed(2)+' kg'}`; res2 = "Converted"; }
    else if (activeCalcId === 'weight') { let kg = isM ? val('wt-v') * val('wt-mat') : (val('wt-v')*0.7645) * val('wt-mat'); res1 = `${(isM ? kg/1000 : kg*0.00110231).toFixed(2)} ${isM ? 'Metric Tons' : 'Short Tons'}`; res2 = `${isM ? kg.toFixed(0)+' kg' : (kg*2.204).toFixed(0)+' lbs'}`; }
    else if (activeCalcId === 'swell') { const loose = val('sw-v') * (1 + parseFloat(document.getElementById('sw-pct').value)); res1 = `${loose.toFixed(2)} ${isM ? 'm³' : 'yd³'}`; res2 = `${(loose - val('sw-v')).toFixed(2)} extra expansion`; }

    document.getElementById('result-title').innerText = activeCalcName;
    primaryResult.innerHTML = res1; secondaryResult.innerText = res2;
}

// --- ACTIONS & MODALS ---
function handleNavAction(action) {
    if (!activeCalcId) { alert("Please open a calculator first."); return; }
    if(primaryResult.innerText === "0.00" || primaryResult.innerText.includes("NaN")) { alert("Please enter values first."); return; }
    
    if (!isProUser && getUsage(action) >= FREE_LIMIT) {
        showPaywall(`You reached your limit of 5 free ${action === 'pdf' ? 'PDFs' : 'Logs'} for this month.`); return;
    }

    pendingAction = action;
    document.getElementById('project-modal').style.display = 'flex';
    document.getElementById('modal-proj-name').focus();
}

function closeModal() { document.getElementById('project-modal').style.display = 'none'; document.getElementById('modal-proj-name').value = ''; }

function confirmModal() {
    const projName = document.getElementById('modal-proj-name').value || 'General Estimate';
    closeModal();
    if (!isProUser) incrementUsage(pendingAction);
    if(pendingAction === 'log') saveToHistory(projName);
    if(pendingAction === 'pdf') generatePDF(projName);
}

// --- LOG HISTORY & EXPORT ---
function saveToHistory(projName) {
    const date = new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    let history = JSON.parse(localStorage.getItem('tc_history')) || [];
    history.unshift({ proj: projName, title: activeCalcName, res: primaryResult.innerText, sub: secondaryResult.innerText, time: date });
    if(history.length > 20) history.pop(); localStorage.setItem('tc_history', JSON.stringify(history)); renderHistory();
}

function renderHistory() {
    const container = document.getElementById('history-list'); const history = JSON.parse(localStorage.getItem('tc_history')) || [];
    if(history.length === 0) { container.innerHTML = "<div style='color:#6B7280;'>No history yet.</div>"; return; }
    container.innerHTML = history.map(item => `<div class="history-item"><div class="history-title">${item.proj} <span style="float:right; color:#6B7280; font-size:0.85rem; font-weight:normal;">${item.time}</span></div><div class="history-subtitle">${item.title}</div><div class="history-res">${item.res}</div><div style="color:#A1A1AA; font-size:0.9rem;">${item.sub}</div></div>`).join('');
}

// --- EXPORT LOGS TO EXCEL (.CSV) ---
function exportBackup() {
    const historyStr = localStorage.getItem('tc_history'); 
    if(!historyStr) { alert("No history to export."); return; }
    
    const history = JSON.parse(historyStr);
    if(history.length === 0) { alert("No history to export."); return; }

    // 1. Create Spreadsheet Headers
    let csvContent = "Project Name,Calculator,Result,Details,Date & Time\n";

    // 2. Loop through history and format for Excel
    history.forEach(item => {
        // We wrap each item in quotes so commas in the text don't break the spreadsheet columns
        const proj = `"${item.proj.replace(/"/g, '""')}"`;
        const title = `"${item.title.replace(/"/g, '""')}"`;
        const res = `"${item.res.replace(/"/g, '""')}"`;
        const sub = `"${item.sub.replace(/"/g, '""')}"`;
        const time = `"${item.time.replace(/"/g, '""')}"`;
        
        csvContent += `${proj},${title},${res},${sub},${time}\n`;
    });

    // 3. Create the file and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); 
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    
    // Name the file as a .csv so it opens in Excel/Google Sheets
    a.download = "DirtMath_Logs.csv"; 
    a.click();
}

// --- PDF GENERATOR ---
function generatePDF(projName) {
    if (!window.jspdf) { alert("PDF Library loading..."); return; }
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    const compName = localStorage.getItem('dm_company') || 'DIRTMATH PRO'; const compPhone = localStorage.getItem('dm_phone') || ''; const compEmail = localStorage.getItem('dm_email') || ''; const dateStr = new Date().toLocaleDateString();

    doc.setTextColor(30, 33, 38); doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.text(compName.toUpperCase(), 15, 25);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
    if(compPhone) doc.text(`Phone: ${compPhone}`, 15, 32); if(compEmail) doc.text(`Email: ${compEmail}`, 15, 37);
    doc.setFontSize(26); doc.setFont("helvetica", "bold"); doc.setTextColor(245, 166, 35); doc.text("ESTIMATE", 195, 25, { align: "right" });
    doc.setFontSize(10); doc.setTextColor(100, 100, 100); doc.text(`Date: ${dateStr}`, 195, 32, { align: "right" });
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.5); doc.line(15, 45, 195, 45);

    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 33, 38); doc.text(`Project: ${projName}`, 15, 55);
    doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.text(`Calculation: ${activeCalcName} (${currentUnit.toUpperCase()})`, 15, 62);

    doc.setFillColor(245, 245, 245); doc.rect(15, 70, 180, 10, 'F');
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(80, 80, 80); doc.text("PARAMETERS", 20, 77); doc.text("VALUE", 185, 77, { align: "right" });

    doc.setFont("helvetica", "normal"); doc.setTextColor(30, 33, 38); let y = 88;
    const inputs = document.getElementById(`form-${activeCalcId}`).querySelectorAll('input, select');
    inputs.forEach(input => {
        let label = input.previousElementSibling.innerText; let val = input.tagName === 'SELECT' ? input.options[input.selectedIndex].text : (input.value || "0");
        doc.text(label, 20, y); doc.text(val.toString(), 185, y, { align: "right" }); doc.setDrawColor(240, 240, 240); doc.line(15, y+3, 195, y+3); y += 10;
    });

    y += 10; doc.setFillColor(245, 166, 35); doc.rect(15, y, 180, 32, 'F'); doc.setTextColor(255, 255, 255);
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("FINAL RESULT", 25, y + 12);
    doc.setFontSize(24); doc.text(primaryResult.innerText, 25, y + 24);
    doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text(secondaryResult.innerText, 185, y + 20, { align: "right" });
    doc.setTextColor(150, 150, 150); doc.setFontSize(9); doc.text("Generated by DirtMath Pro - The Blue Collar Toolkit", 105, 285, { align: "center" });

    doc.save(`${projName.replace(/\s+/g, '_')}_Estimate.pdf`);
}
