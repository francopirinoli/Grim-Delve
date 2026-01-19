/**
 * dice.js
 * Utility for parsing dice notation and generating random results.
 * Fixed: Handles negative modifiers (e.g. "1d6+-1") and detailed reporting.
 */

export const Dice = {

    /**
     * Parses a standard dice string.
     */
    roll: (notation) => {
        if (!notation) return { total: 0, rolls: [], modifier: 0, notation: "0" };

        // 1. Sanitize: "1d6+-1" -> "1d6-1", "1d6+ -1" -> "1d6-1"
        let cleanStr = notation.toLowerCase().replace(/\s/g, '');
        cleanStr = cleanStr.replace(/\+-/g, '-').replace(/-\+/g, '-');

        // Regex: (Count)d(Sides)(Modifier)
        const regex = /^(\d*)d(\d+)([-+]\d+)?$/;
        const match = cleanStr.match(regex);

        if (!match) {
            console.warn(`Dice: Invalid notation '${notation}'. Returning 0.`);
            return { total: 0, rolls: [], modifier: 0, notation: notation, error: true };
        }

        const count = match[1] ? parseInt(match[1], 10) : 1;
        const sides = parseInt(match[2], 10);
        const modifier = match[3] ? parseInt(match[3], 10) : 0;

        const rolls = [];
        let sum = 0;

        for (let i = 0; i < count; i++) {
            const val = Math.floor(Math.random() * sides) + 1;
            rolls.push(val);
            sum += val;
        }

        const total = Math.max(0, sum + modifier); // Damage usually shouldn't drop below 0

        // Check for Crit/Whiff on d20s specifically
        const isCrit = (sides === 20 && rolls.includes(20));
        const isWhiff = (sides === 20 && rolls.includes(1));

        return {
            total: total,
            rolls: rolls,
            modifier: modifier,
            notation: cleanStr,
            isCrit: isCrit,
            isWhiff: isWhiff
        };
    },

    /**
     * Performs a Core System Check.
     * Returns broken down values for UI display.
     */
    rollCheck: (statMod = 0, profDie = 0, state = "normal") => {
        
        // 1. Roll the d20(s)
        let d20Rolls = [];
        let d20Result = 0;
        let dropped = null;

        const r1 = Math.floor(Math.random() * 20) + 1;
        
        if (state === "advantage") {
            const r2 = Math.floor(Math.random() * 20) + 1;
            d20Rolls = [r1, r2];
            d20Result = Math.max(r1, r2);
            dropped = Math.min(r1, r2);
        } else if (state === "disadvantage") {
            const r2 = Math.floor(Math.random() * 20) + 1;
            d20Rolls = [r1, r2];
            d20Result = Math.min(r1, r2);
            dropped = Math.max(r1, r2);
        } else {
            d20Result = r1;
            d20Rolls = [r1];
        }

        // 2. Roll Proficiency Die
        let profResult = 0;
        if (profDie > 0) {
            profResult = Math.floor(Math.random() * profDie) + 1;
        }

        // 3. Calculate Total
        const total = d20Result + statMod + profResult;

        return {
            total: total,
            d20_result: d20Result,
            d20_rolls: d20Rolls,
            dropped_roll: dropped,
            stat_mod: statMod,     // Explicitly return stat mod
            prof_die_val: profDie, // Size of die (e.g. 4, 6)
            prof_result: profResult, // Result of die
            isCrit: (d20Result === 20),
            isWhiff: (d20Result === 1),
            state: state
        };
    },

    randomInt: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
};