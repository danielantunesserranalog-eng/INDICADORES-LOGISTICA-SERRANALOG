// ==========================================
// js/configuracoes/utils.js - FUNÇÕES GERAIS
// ==========================================

const MOTORISTAS_EXCLUIDOS = [
    "KEVEN MELGACO DE JESUS", "GIVANILDO DA CONCEIÇÃO URSULINO", "DANILO TEIXEIRA SILVA",
    "LEANDRO LAFAIETE ALMEIDA", "LUIS CARLOS MENDES MUNIZ", "VALDIR ALVES",
    "JOSEMILDO SOARES DE SOUZA", "JULIO CESAR ALMEIDA NUNES", "DEYVISON DOS SANTOS CRUZ",
    "KLEITON MELGAÇO DA SILVA"
];

function decimalParaTime(decimal) {
    if (!decimal || isNaN(decimal)) return '';
    const horas = Math.floor(decimal);
    const minutos = Math.round((decimal - horas) * 60);
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
}

function timeParaDecimal(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h + (m / 60);
}

function parseDateTime(dateVal, timeVal) {
    if (!dateVal) return null;
    let baseDate = null;
    if (typeof dateVal === 'number') {
        const dateInfo = XLSX.SSF.parse_date_code(dateVal);
        if (dateInfo) baseDate = new Date(dateInfo.y, dateInfo.m - 1, dateInfo.d);
    } else if (typeof dateVal === 'string') {
        const str = dateVal.trim();
        if (str.includes('/')) {
            const parts = str.split(' ')[0].split('/');
            if (parts.length >= 3) {
                let year = parseInt(parts[2], 10);
                if (year < 100) year += 2000;
                baseDate = new Date(year, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            }
        } else if (str.includes('-')) {
            const parts = str.split(' ')[0].split('-');
            if (parts.length >= 3) {
                let year = parseInt(parts[0], 10) > 1000 ? parseInt(parts[0], 10) : parseInt(parts[2], 10);
                let month = parseInt(parts[1], 10) - 1;
                let day = parseInt(parts[0], 10) > 1000 ? parseInt(parts[2], 10) : parseInt(parts[0], 10);
                if (year < 100) year += 2000;
                baseDate = new Date(year, month, day);
            }
        } else { baseDate = new Date(str); }
    }
    if (!baseDate || isNaN(baseDate.getTime())) return null;

    let hours = 0, minutes = 0, seconds = 0;
    if (typeof timeVal === 'number') {
        let fraction = timeVal % 1; 
        if (fraction < 0) fraction += 1;
        let totalSeconds = Math.round(fraction * 24 * 3600);
        hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        minutes = Math.floor(totalSeconds / 60);
    } else if (typeof timeVal === 'string' && timeVal.trim() !== "") {
        const tParts = timeVal.trim().split(':');
        hours = parseInt(tParts[0], 10) || 0;
        minutes = parseInt(tParts[1], 10) || 0;
    }
    baseDate.setHours(hours, minutes, seconds, 0);
    return baseDate;
}

function normalizeStr(str) { 
    if (!str) return ''; 
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); 
}

function parsePtBrNumber(val) { 
    if (val === null || val === undefined || val === '') return 0; 
    if (typeof val === 'number') return val; 
    let str = String(val).replace(/\./g, '').replace(',', '.'); 
    return parseFloat(str) || 0; 
}

function calcHoursDiff(dtStart, hrStart, dtEnd, hrEnd, isCiclo) {
    const s = parseDateTime(dtStart, hrStart); 
    const e = parseDateTime(dtEnd, hrEnd);
    if (!s || !e) return null;
    let diffH = (e - s) / (1000 * 3600);
    if (isCiclo) { 
        if (diffH > 120) return null; 
        if (diffH < 0) return null; 
    } else { 
        if (diffH < 0 || diffH > 48) return 0; 
    }
    return diffH;
}