package dev.lagnarok.tracebeam.core

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

class HapticsManager(context: Context) {
    private val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
        manager?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }

    fun flagRaised() {
        vibrate(longArrayOf(0, 250))
    }

    fun matchFound() {
        // Distinctive tactical pattern: 3 quick pulses followed by sustained confirm
        vibrate(longArrayOf(0, 60, 80, 60, 80, 60, 120, 260))
    }

    fun accepted() {
        vibrate(longArrayOf(0, 120, 60, 120))
    }

    fun solved() {
        vibrate(longArrayOf(0, 40, 40, 40, 40, 200))
    }

    private fun vibrate(timings: LongArray) {
        if (vibrator == null || !vibrator.hasVibrator()) return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val effect = VibrationEffect.createWaveform(timings, -1)
            vibrator.vibrate(effect)
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(timings, -1)
        }
    }
}
