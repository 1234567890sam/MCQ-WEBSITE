/**
 * Seeded shuffle using a string seed for deterministic randomization.
 */
const seededShuffle = (arr, seed) => {
    const array = [...arr];
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    for (let i = array.length - 1; i > 0; i--) {
        s = (s * 1664525 + 1013904223) >>> 0;
        const j = s % (i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

module.exports = { seededShuffle };
