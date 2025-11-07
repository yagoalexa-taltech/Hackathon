/* THEME */
const savedTheme = localStorage.getItem("confio-theme");
if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);
const themeToggle = document.getElementById("themeToggle");
themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("confio-theme", next);
});

/* MOBILE NAV */
const burger = document.getElementById("burger");
const navMain = document.getElementById("navMain");
burger.addEventListener("click", () => navMain.classList.toggle("open"));

/* UTIL */
const fmtCOP = new Intl.NumberFormat("es-CO", {style:"currency", currency:"COP", maximumFractionDigits:0});
const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
const onlyDigits = s => (s||"").replace(/[^\d]/g,"");
const parseMoney = s => parseInt(onlyDigits(s||""),10)||0;

/* ---------- HERO PANEL INTERACTIVO ---------- */
(function heroPanel(){
  const hpCupo = document.getElementById("hpCupo");
  const hpScore = document.getElementById("hpScore");
  const hpBar = document.getElementById("hpBar");
  const canvas = document.getElementById("hpSparky");
  if(!hpCupo || !hpScore || !hpBar || !canvas) return;

  // Valores demo animados
  let cupo = 600000, score = 62;
  const targetScore = 74;        // simular mejora
  const targetCupo = 800000;

  // Animación barra + números
  const steps = 40;
  let t = 0;
  const anim = setInterval(()=>{
    t++;
    const p = t/steps;
    const s = Math.round(score + (targetScore-score)*p);
    const c = Math.round(cupo + (targetCupo-cupo)*p);
    hpScore.textContent = `${s}/100`;
    hpCupo.textContent = fmtCOP.format(c);
    hpBar.style.width = `${s}%`;
    if(t>=steps) clearInterval(anim);
  }, 28);

  // Mini sparkline simple
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const points = [38,42,41,45,49,55,58,61,64,70]; // tendencia positiva
  const max = Math.max(...points), min = Math.min(...points);
  const pad = 8;
  ctx.lineWidth = 2;
  ctx.strokeStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--primary').trim() || '#7C3AED';
  ctx.beginPath();
  points.forEach((v,i)=>{
    const x = pad + (i*(W-2*pad))/(points.length-1);
    const y = H - pad - ((v-min)/(max-min))*(H-2*pad);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();
})();

/* ---------- SIMULADOR (Colombia) ---------- */
// Elementos
const montoInput = document.getElementById("montoInput");
const montoRange = document.getElementById("montoRange");
const plazoRange = document.getElementById("plazoRange");
const tasaSelect = document.getElementById("tasaSelect");
const modalidadSelect = document.getElementById("modalidadSelect");
const seguroInput = document.getElementById("seguroInput");
const extraInput = document.getElementById("extraInput");

const cuotaTxt = document.getElementById("cuotaTxt");
const interesesTxt = document.getElementById("interesesTxt");
const totalTxt = document.getElementById("totalTxt");
const plazoReducidoTxt = document.getElementById("plazoReducidoTxt");
const legalAlert = document.getElementById("legalAlert");

const ctaWhatsapp = document.getElementById("ctaWhatsapp");
const ctaContinuar = document.getElementById("ctaContinuar");

// Límites (actualiza mensualmente según SFC)
const LIMITES = {
  consumo: { ibcEA: 0.1666, usuraEA: 0.1666*1.5 },
  bajo_monto: { ibcEA: 0.6435, usuraEA: 0.6435 }
};
const EAtoTEM = ea => Math.pow(1+ea,1/12)-1;

function cuotaFrances(monto, tem, meses, seguro){
  if (meses <= 0) return 0;
  if (tem <= 0) return (monto/meses) + (seguro||0);
  const f = Math.pow(1+tem, meses);
  const base = (monto * tem * f) / (f - 1);
  return base + (seguro||0);
}
function totales(monto, meses, cuota, seguro){
  const total = Math.round(cuota) * meses;
  const totalSeguro = Math.round(seguro||0) * meses;
  const intereses = total - monto - totalSeguro;
  return { total, intereses };
}
function mesesConAporte(monto, tem, cuotaTotalSinSeguro){
  const inside = 1 - (tem * monto) / Math.max(0.01, cuotaTotalSinSeguro);
  if (inside <= 0 || tem <= 0) return null;
  const n = -Math.log(inside) / Math.log(1 + tem);
  return Math.max(1, Math.round(n));
}

/* STATE */
const state = Object.assign({
  monto: 300000,
  plazo: 12,
  tem: 0.0145,        // 1.45% mensual por defecto
  modalidad: "bajo_monto",
  seguro: 0,
  extra: 0
}, JSON.parse(localStorage.getItem("confio-sim") || "null") || {});

function setUI(){
  if(!montoInput) return;
  montoInput.value = fmtCOP.format(state.monto);
  montoRange.value = state.monto;
  plazoRange.value = state.plazo;
  tasaSelect.value = String(state.tem);
  modalidadSelect.value = state.modalidad;
  seguroInput.value = state.seguro ? fmtCOP.format(state.seguro) : "";
  extraInput.value = state.extra ? fmtCOP.format(state.extra) : "";
  render();
}

function legalCheck(modalidad){
  const caps = LIMITES[modalidad];
  return { capTEM: EAtoTEM(caps.usuraEA), ibcTEM: EAtoTEM(caps.ibcEA) };
}

function render(){
  const { capTEM, ibcTEM } = legalCheck(state.modalidad);
  const cuota = cuotaFrances(state.monto, state.tem, state.plazo, state.seguro);
  const { total, intereses } = totales(state.monto, state.plazo, cuota, state.seguro);

  cuotaTxt.textContent = fmtCOP.format(Math.round(cuota));
  interesesTxt.textContent = fmtCOP.format(Math.max(0, Math.round(intereses)));
  totalTxt.textContent = fmtCOP.format(Math.round(total));

  const cuotaSinSeguro = cuota - (state.seguro||0) + (state.extra||0);
  const mReducidos = mesesConAporte(state.monto, state.tem, cuotaSinSeguro);
  if (mReducidos && mReducidos < state.plazo){
    const ahorro = state.plazo - mReducidos;
    plazoReducidoTxt.textContent = `${mReducidos} meses (ahorras ~${ahorro})`;
  } else if (state.extra > 0){
    plazoReducidoTxt.textContent = "Aporte insuficiente para reducir plazo";
  } else {
    plazoReducidoTxt.textContent = "—";
  }

  // Alertas legales
  legalAlert.classList.add("hide");
  if (state.tem > capTEM){
    legalAlert.innerHTML = `⚠️ La tasa mensual supera el tope de <strong>usura</strong> para esta modalidad. Reduce la tasa.`;
    legalAlert.className = "alert";
  } else if (state.tem > ibcTEM){
    legalAlert.innerHTML = `ℹ️ La tasa mensual está por encima del <strong>IBC</strong> de referencia pero por debajo de la usura.`;
    legalAlert.className = "alert ok";
  }

  // WhatsApp
  const msg = encodeURIComponent(
    `Hola ConFio 👋\n\nQuiero aplicar a mi primer microcrédito.\n\nSimulación:\n- Monto: ${fmtCOP.format(state.monto)}\n- Plazo: ${state.plazo} meses\n- Modalidad: ${state.modalidad}\n- Tasa mensual: ${(state.tem*100).toFixed(2)}%\n- Seguro: ${fmtCOP.format(state.seguro)}\n- Extra: ${fmtCOP.format(state.extra)}\n- Cuota aprox.: ${fmtCOP.format(Math.round(cuota))}\n- Total aprox.: ${fmtCOP.format(Math.round(total))}\n\n¿Me ayudan con el proceso?`
  );
  ctaWhatsapp.href = `https://wa.me/573000000000?text=${msg}`;

  localStorage.setItem("confio-sim", JSON.stringify(state));
}

/* Listeners */
[montoRange, plazoRange, tasaSelect, modalidadSelect].forEach(el=>{
  el.addEventListener("input", ()=>{
    if(el===montoRange) state.monto = clamp(Number(el.value), 20000, 2000000);
    if(el===plazoRange) state.plazo = Number(el.value);
    if(el===tasaSelect) state.tem = Number(el.value);
    if(el===modalidadSelect) state.modalidad = el.value;
    montoInput.value = fmtCOP.format(state.monto);
    render();
  });
});
montoInput.addEventListener("input", e=>{
  state.monto = clamp(parseMoney(e.target.value), 20000, 2000000);
  e.target.value = fmtCOP.format(state.monto);
  montoRange.value = state.monto;
  render();
});
seguroInput.addEventListener("input", e=>{
  state.seguro = clamp(parseMoney(e.target.value), 0, 200000);
  e.target.value = state.seguro ? fmtCOP.format(state.seguro) : "";
  render();
});
extraInput.addEventListener("input", e=>{
  state.extra = clamp(parseMoney(e.target.value), 0, 1000000);
  e.target.value = state.extra ? fmtCOP.format(state.extra) : "";
  render();
});
ctaContinuar.addEventListener("click", ()=>{
  alert("¡Listo! Guardamos tu simulación. En el siguiente paso te pediremos tus datos y consentimiento para evaluar tu solicitud.");
});

setUI();
