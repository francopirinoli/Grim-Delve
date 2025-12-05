/**
 * dice.js
 * Utility for parsing dice notation and generating random results.
 * Core logic for the Dark Pulp system.
 */

export const Dice = {

    /**
     * Parses a standard dice string (e.g., "1d20", "2d6+4", "d12-1") and rolls it.
     * @param {string} notation - The dice string to parse.
     * @returns {object} Result object { total, rolls: [], modifier, notation, isCrit, isWhiff }
     */
    roll: (notation) => {
        if (!notation) return null;

        // Normalize string: remove spaces, convert to lowercase
        const cleanStr = notation.toLowerCase().replace(/\s/g, '');

        // Regex to parse: (Optional Count)d(Sides)(Optional Modifier)
        // Group 1: Count, Group 2: Sides, Group 3: +/- Mod
        const regex = /^(\d*)d(\d+)(?:([+-]\d+))?$/;
        const match = cleanStr.match(regex);

        if (!match) {
            console.error(`Invalid dice notation: ${notation}`);
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

        const total = sum + modifier;

        // Check for Criticals (Natural 20) or Whiffs (Natural 1) on d20s
        const isCrit = (sides === 20 && rolls.includes(20));
        const isWhiff = (sides === 20 && rolls.includes(1));

        return {
            total: total,
            rolls: rolls,
            modifier: modifier,
            notation: notation,
            isCrit: isCrit,
            isWhiff: isWhiff
        };
    },

    /**
     * Performs a Core System Check (d20 + Mod + Proficiency Die).
     * Handles Advantage and Disadvantage logic.
     * @param {number} modifier - The Attribute modifier (e.g., +3).
     * @param {number} profDie - The size of the proficiency die (0, 4, or 6).
     * @param {string} state - "normal", "advantage", or "disadvantage".
     * @returns {object} Complex result object.
     */
    rollCheck: (modifier = 0, profDie = 0, state = "normal") => {
        
        // 1. Roll the d20(s) based on state
        let d20Rolls = [];
        let d20Result = 0;
        let dropped = null;

        if (state === "advantage") {
            const r1 = Math.floor(Math.random() * 20) + 1;
            const r2 = Math.floor(Math.random() * 20) + 1;
            d20Rolls = [r1, r2];
            d20Result = Math.max(r1, r2);
            dropped = Math.min(r1, r2);
        } else if (state === "disadvantage") {
            const r1 = Math.floor(Math.random() * 20) + 1;
            const r2 = Math.floor(Math.random() * 20) + 1;
            d20Rolls = [r1, r2];
            d20Result = Math.min(r1, r2);
            dropped = Math.max(r1, r2);
        } else {
            d20Result = Math.floor(Math.random() * 20) + 1;
            d20Rolls = [d20Result];
        }

        // 2. Roll Proficiency Die (if exists)
        let profResult = 0;
        if (profDie > 0) {
            profResult = Math.floor(Math.random() * profDie) + 1;
        }

        // 3. Calculate Total
        const total = d20Result + modifier + profResult;

        // 4. Determine Crits/Whiffs based on the KEPT d20
        const isCrit = (d20Result === 20);
        const isWhiff = (d20Result === 1);

        return {
            total: total,
            d20_result: d20Result,
            d20_rolls: d20Rolls,
            dropped_roll: dropped,
            modifier: modifier,
            prof_die: profDie,
            prof_result: profResult,
            isCrit: isCrit,
            isWhiff: isWhiff,
            state: state
        };
    },

    /**
     * Generates a simple random integer between min and max (inclusive).
     * Used for Loot Tables and random array selection.
     */
    randomInt: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
};