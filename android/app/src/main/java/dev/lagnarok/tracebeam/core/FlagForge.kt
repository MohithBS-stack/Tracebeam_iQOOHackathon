package dev.lagnarok.tracebeam.core

import androidx.compose.ui.graphics.Color

data class FlagModel(
    val fp: String,
    val code: String,
    val patternIndex: Int,
    val primaryColor: Color,
    val secondaryColor: Color,
    val accentColor: Color
)

object FlagForge {
    // ── Heraldic Neo-Brutal Palette from DESIGN.md ─────────────────────────────
    val SIGNAL_RED     = Color(0xFFFF2A2A)
    val SIGNAL_AMBER   = Color(0xFFFFB800)
    val SIGNAL_EMERALD = Color(0xFF00D06C)
    val SIGNAL_COBALT  = Color(0xFF1B3FD8)
    val SIGNAL_VIOLET  = Color(0xFF7B2FFE)
    val DARK_BASE      = Color(0xFF0D0F14)
    val FLAG_WHITE     = Color(0xFFF5F6FA)

    private val SATURATED_SIGNALS = listOf(
        SIGNAL_RED,
        SIGNAL_AMBER,
        SIGNAL_EMERALD,
        SIGNAL_COBALT,
        SIGNAL_VIOLET
    )

    // Code alphabet without ambiguous chars 0, O, 1, I
    private const val CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

    fun forge(fp: String): FlagModel {
        val safeFp = fp.padEnd(16, '0')
        val b0 = safeFp.substring(0, 2).toIntOrNull(16) ?: 0
        val b1 = safeFp.substring(2, 4).toIntOrNull(16) ?: 0
        val b2 = safeFp.substring(4, 6).toIntOrNull(16) ?: 0
        val b3 = safeFp.substring(6, 8).toIntOrNull(16) ?: 0

        // 3-character phonetic code
        val c0 = CODE_ALPHABET[b0 % CODE_ALPHABET.length]
        val c1 = CODE_ALPHABET[b1 % CODE_ALPHABET.length]
        val c2 = CODE_ALPHABET[b2 % CODE_ALPHABET.length]
        val code = "$c0$c1$c2"

        val pattern = b0 % 8

        // Rule-enforced color pairing (Light paired with Dark/Saturated)
        val primary = SATURATED_SIGNALS[b1 % SATURATED_SIGNALS.size]
        val secondary = if ((b2 % 2) == 0) DARK_BASE else FLAG_WHITE
        val accent = if (secondary == DARK_BASE) FLAG_WHITE else DARK_BASE

        return FlagModel(
            fp = fp,
            code = code,
            patternIndex = pattern,
            primaryColor = primary,
            secondaryColor = secondary,
            accentColor = accent
        )
    }
}
