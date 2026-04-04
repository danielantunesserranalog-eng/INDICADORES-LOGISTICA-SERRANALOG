// ==========================================
// js/common.js - FUNÇÕES GLOBAIS
// ==========================================

function parsePtBrNumber(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let str = String(val).trim();
    if (str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(str) || 0;
}

function formatarHorasMinutos(horasDecimais) {
    if (horasDecimais === null || horasDecimais === undefined || isNaN(horasDecimais) || horasDecimais <= 0) return '-';
    const horas = Math.floor(horasDecimais);
    const minutos = Math.round((horasDecimais - horas) * 60);
    if (horas === 0 && minutos === 0) return '0m';
    if (horas === 0) return `${minutos}m`;
    if (minutos === 0) return `${horas}h`;
    return `${horas}h ${minutos.toString().padStart(2, '0')}m`;
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

function calcHoursDiff(dtStart, hrStart, dtEnd, hrEnd, isCiclo = false) {
    let start = parseDateTime(dtStart, hrStart);
    let end = parseDateTime(dtEnd || dtStart, hrEnd); 
    
    if (start && end && !isNaN(start) && !isNaN(end)) {
        if (end < start) end.setDate(end.getDate() + 1);
        let diffHours = (end - start) / (1000 * 3600);
        
        if (isCiclo && diffHours > 0 && diffHours < 2 && (!dtEnd || dtEnd === dtStart)) {
            end.setDate(end.getDate() + 1);
            diffHours = (end - start) / (1000 * 3600);
        }
        if (diffHours >= 0 && diffHours <= 240) return diffHours;
    }
    return null;
}

function normalizeStr(str) {
    if (!str) return "";
    return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function parseTimeToHours(timeStr) {
    if(!timeStr || timeStr === '-' || String(timeStr).trim() === '') return 0;
    const parts = String(timeStr).split(':');
    if(parts.length >= 2) return parseInt(parts[0], 10) + (parseInt(parts[1], 10) / 60);
    return parseFloat(timeStr) || 0;
}

function calcularDiferencaHorasJornada(inicioStr, fimStr) {
    if (!inicioStr || !fimStr || inicioStr === '-' || fimStr === '-') return 0;
    try {
        const parseData = (str) => {
            const partes = str.split('-');
            if (partes.length !== 2) return null;
            const dataPartes = partes[0].trim().split('/');
            const horaPartes = partes[1].trim().split(':');
            if (dataPartes.length !== 2 || horaPartes.length !== 2) return null;
            const dia = parseInt(dataPartes[0], 10);
            const mes = parseInt(dataPartes[1], 10) - 1; 
            const hora = parseInt(horaPartes[0], 10);
            const minuto = parseInt(horaPartes[1], 10);
            const anoAtual = new Date().getFullYear();
            return new Date(anoAtual, mes, dia, hora, minuto);
        };
        const dtInicio = parseData(inicioStr);
        const dtFim = parseData(fimStr);
        if (!dtInicio || !dtFim) return 0;
        let diffHoras = (dtFim - dtInicio) / (1000 * 60 * 60);
        if (diffHoras < 0) {
            dtFim.setFullYear(dtFim.getFullYear() + 1);
            diffHoras = (dtFim - dtInicio) / (1000 * 60 * 60);
        }
        return diffHoras > 0 ? diffHoras : 0;
    } catch (e) {
        return 0;
    }
}