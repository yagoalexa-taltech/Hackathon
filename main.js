/* THEME */
const root = document.documentElement;
const storedTheme = localStorage.getItem("yc-theme");
if (storedTheme) document.documentElement.setAttribute("data-theme", storedTheme);

const themeToggle = document.getElementById("themeToggle");
themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("yc-theme", next);
});

/* MOBILE NAV */
const burger = document.getElementById("burger");
const navMain = document.getElementById("navMain");
burger.addEventListener("click", () => navMain.classList.toggle("open"));

/* SIMULADOR */
const fmtCOP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const onlyDigits = (str) => (str || "").replace(/[^\d]/g, "");
const parseMoney = (s) => parseInt(onlyDigits(s || ""), 10) || 0;

// TEA -> TEM
const teaToTem = (tea) => Math.pow(1 + tea, 1/12) - 1;

// Cuota método francés
function cuotaMensual(monto, tem, meses, seguroMensual){
  if (meses <= 0) return 0;
  if (tem <= 0){
    return (monto / meses) + (seguroMensual || 0);
  }
  const factor = Math.pow(1 + tem, meses);
  const base = (monto * tem * factor) / (factor - 1);
  return base + (seguroMensual || 0);
}

// Totales
function calcTotales(monto, meses, cuota, seguroMensual){
  const total = Math.round(cuota) * meses;
  const totalSeguro = Math.round(seguroMensual || 0) * meses;
  const intereses = total - monto - totalSeguro;
  return { total, intereses };
}

// Estimar meses con pago extra (cuota + extra)
function mesesConAporte(monto, tem, cuotaTotal){
  // Fórmula inversa del método francés:
  // n = - ln(1 - tem * P / cuota) / ln(1 + tem)
  const cuotaSinCeros = Math.max(0.01, cuotaTotal); // evitar división por cero
  const inside = 1 - (tem * monto) / cuotaSinCeros;
  if (inside <= 0 || tem <= 0) return null; // aporte insuficiente para cubrir interés o tasa cero
  const n = -Math.log(inside) / Math.log(1 + tem);
  return Math.max(1, Math.round(n));
}

/* STATE */
const state = {
  monto: 1200000,
  plazo: 12,
  tea: 0.28,
  seguro: 0,
  extra: 0
};
Object.assign(state, JSON.parse(localStorage.getItem("yc-sim") || "null") || {});

/* ELEMENTS */
const montoInput = document.getElementById("montoInput");
const montoRange = document.getElementById("montoRange");
const plazoRange = document.getElementById("plazoRange");
const teaSelect = document.getElementById("teaSelect");
const seguroInput = document.getElementById("seguroInput");
const extraInput = document.getElementById("extraInput");

const cuotaTxt = document.getElementById("cuotaTxt");
const interesesTxt = document.getElementById("interesesTxt");
const totalTxt = document.getElementById("totalTxt");
const plazoReducidoTxt = document.getElementById("plazoReducidoTxt");

const ctaWhatsapp = document.getElementById("ctaWhatsapp");
const ctaContinuar = document.getElementById("ctaContinuar");

/* LIMITES */
const MIN = Number(montoRange.min);
const MAX = Number(montoRange.max);

/* INIT */
function initUI(){
  montoInput.value = fmtCOP.format(state.monto);
  montoRange.value = clamp(state.monto, MIN, MAX);
  plazoRange.value = state.plazo;
  teaSelect.value = String(state.tea);
  seguroInput.value = state.seguro ? fmtCOP.format(state.seguro) : "";
  extraInput.value = state.extra ? fmtCOP.format(state.extra) : "";
  render();
}

function render(){
  const tem = teaToTem(state.tea);
  const cuota = cuotaMensual(state.monto, tem, state.plazo, state.seguro);
  const { total, intereses } = calcTotales(state.monto, state.plazo, cuota, state.seguro);

  cuotaTxt.textContent = fmtCOP.format(Math.round(cuota));
  interesesTxt.textContent = fmtCOP.format(Math.max(0, Math.round(intereses)));
  totalTxt.textContent = fmtCOP.format(Math.round(total));

  // Aporte extra: estimar plazo reducido
  const cuotaTotal = cuota + (state.extra || 0);
  const mesesReducidos = mesesConAporte(state.monto, tem, cuotaTotal - (state.seguro || 0)); // cuota sin seguro para cálculo
  if (mesesReducidos && mesesReducidos < state.plazo){
    const ahorroMeses = state.plazo - mesesReducidos;
    plazoReducidoTxt.textContent = `${mesesReducidos} meses (ahorras ~${ahorroMeses})`;
  } else if (state.extra > 0) {
    plazoReducidoTxt.textContent = "Aporte insuficiente para reducir plazo";
  } else {
    plazoReducidoTxt.textContent = "—";
  }

  // WhatsApp CTA
  const msg = encodeURIComponent(
    `Hola YCredit 👋\n\nQuiero aplicar a mi primer microcrédito.\n\nSimulación:\n- Monto: ${fmtCOP.format(state.monto)}\n- Plazo: ${state.plazo} meses\n- TEA: ${(state.tea*100).toFixed(2)}%\n- Seguro mensual: ${fmtCOP.format(state.seguro)}\n- Aporte extra: ${fmtCOP.format(state.extra)}\n- Cuota estimada: ${fmtCOP.format(Math.round(cuota))}\n- Total a pagar (estimado): ${fmtCOP.format(Math.round(total))}\n\n¿Me ayudan con el proceso?`
  );
  ctaWhatsapp.href = `https://wa.me/573000000000?text=${msg}`;

  localStorage.setItem("yc-sim", JSON.stringify(state));
}

montoRange.addEventListener("input", e=>{
  state.monto = clamp(Number(e.target.value), MIN, MAX);
  montoInput.value = fmtCOP.format(state.monto);
  render();
});
montoInput.addEventListener("input", e=>{
  state.monto = clamp(parseMoney(e.target.value), MIN, MAX);
  e.target.value = fmtCOP.format(state.monto);
  montoRange.value = state.monto;
  render();
});
plazoRange.addEventListener("input", e=>{
  state.plazo = Number(e.target.value);
  render();
});
teaSelect.addEventListener("change", e=>{
  state.tea = Number(e.target.value);
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
  alert("¡Genial! Guardamos tu simulación. En el siguiente paso te pediremos tus datos básicos para evaluación (consentimiento y verificación).");
});

initUI();
