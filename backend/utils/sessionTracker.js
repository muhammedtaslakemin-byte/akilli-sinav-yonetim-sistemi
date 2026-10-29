/**
 * Gözetim Oturumu Canlılık ve Telemetri Takipçisi (Session Tracker)
 * 
 * - Multi-process ve cluster ortamlarında bellek sızıntısını önlemek için TTL tabanlı temizleme yapar.
 * - İşlemci belleğinde ping bulunamadığında (farklı cluster worker'ı veya sunucu yeniden başlatması),
 *   öğrencinin en son veritabanı biyometrik hareketini (Face/Voice/Log) ikincil kaynak olarak değerlendirir.
 */

const PING_ONLINE_THRESHOLD_MS = 15 * 1000; // 15 saniye içinde ping varsa CANLI kabul edilir
const PING_EXPIRE_MS = 5 * 60 * 1000;       // 5 dakikadan eski pingler bellekten temizlenir

// Oturum ID -> Son Ping Zaman Damgası (ms)
const sessionPings = new Map();

/**
 * Oturum için yeni bir ping zamanı kaydeder
 * @param {number|string} sessionId 
 * @param {number} [timestamp]
 */
function recordPing(sessionId, timestamp = Date.now()) {
    const sId = parseInt(sessionId);
    if (!isNaN(sId)) {
        sessionPings.set(sId, timestamp);
    }
}

/**
 * Oturumun şu anda aktif / canlı olup olmadığını denetler
 * @param {number|string} sessionId 
 * @param {Date|string|number} [fallbackDbTimestamp] - Veritabanındaki en son log/biyometri zamanı
 * @returns {boolean}
 */
function isSessionActive(sessionId, fallbackDbTimestamp = null) {
    const sId = parseInt(sessionId);
    if (isNaN(sId)) return false;

    const now = Date.now();

    // 1. Birincil Kontrol: İşlem belleğindeki en son ping
    const memPing = sessionPings.get(sId);
    if (memPing && (now - memPing < PING_ONLINE_THRESHOLD_MS)) {
        return true;
    }

    // 2. İkincil Kontrol (Cluster/Multi-worker Fallback):
    // Eğer istek farklı bir worker'a gitmişse, veritabanına yazılan en son hareket kontrol edilir.
    if (fallbackDbTimestamp) {
        const dbTime = new Date(fallbackDbTimestamp).getTime();
        if (!isNaN(dbTime) && (now - dbTime < PING_ONLINE_THRESHOLD_MS)) {
            // Belleği de eşitle
            sessionPings.set(sId, dbTime);
            return true;
        }
    }

    return false;
}

/**
 * Bellek sızıntısını önlemek için eski oturum kayıtlarını temizler
 */
function cleanupExpiredPings() {
    const now = Date.now();
    for (const [sId, time] of sessionPings.entries()) {
        if (now - time > PING_EXPIRE_MS) {
            sessionPings.delete(sId);
        }
    }
}

// Otomatik periyodik temizlik (Her 60 saniyede bir)
const cleanupTimer = setInterval(cleanupExpiredPings, 60 * 1000);
if (cleanupTimer.unref) {
    cleanupTimer.unref(); // Node process'in kapanmasını engellemez
}

function getLastPing(sessionId) {
    const sId = parseInt(sessionId);
    return isNaN(sId) ? null : (sessionPings.get(sId) || null);
}

module.exports = {
    recordPing,
    isSessionActive,
    getLastPing,
    cleanupExpiredPings
};
