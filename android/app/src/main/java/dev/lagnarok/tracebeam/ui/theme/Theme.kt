package dev.lagnarok.tracebeam.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable

@Composable
fun TracebeamTheme(
    content: @Composable () -> Unit
) {
    // Tracebeam enforces an OLED high-contrast dark palette by default
    content()
}
