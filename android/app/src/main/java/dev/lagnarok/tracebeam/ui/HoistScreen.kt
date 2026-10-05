package dev.lagnarok.tracebeam.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.lagnarok.tracebeam.core.Signature
import dev.lagnarok.tracebeam.core.SignatureEngine
import dev.lagnarok.tracebeam.ui.components.BrutalButton
import dev.lagnarok.tracebeam.ui.components.FlagView
import dev.lagnarok.tracebeam.ui.theme.*

@Composable
fun HoistScreen(
    onHoistConfirmed: (Signature) -> Unit,
    onCancel: () -> Unit
) {
    var rawText by remember { mutableStateOf("") }
    val signature = remember(rawText) {
        if (rawText.isNotBlank()) SignatureEngine.buildSignature(rawText) else null
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBase)
            .padding(20.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column {
            Text(
                text = "Hoist Flag",
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
                fontSize = 20.sp,
                color = FlagWhite
            )
            Text(
                text = "Paste error traceback. Redaction runs strictly on-device.",
                fontSize = 12.sp,
                color = TextMuted
            )

            Spacer(modifier = Modifier.height(16.dp))

            // ── Trace Input Box ────────────────────────────────────────────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(DarkSurface)
                    .border(2.dp, DarkBorder, RoundedCornerShape(8.dp))
                    .padding(12.dp)
            ) {
                if (rawText.isEmpty()) {
                    Text(
                        text = "Paste stack trace here (e.g. Traceback..., NullPointerException...)",
                        fontSize = 12.sp,
                        color = TextMuted,
                        fontFamily = FontFamily.Monospace
                    )
                }
                BasicTextField(
                    value = rawText,
                    onValueChange = { rawText = it },
                    modifier = Modifier.fillMaxSize(),
                    textStyle = TextStyle(
                        fontFamily = FontFamily.Monospace,
                        fontSize = 12.sp,
                        color = FlagWhite
                    ),
                    cursorBrush = SolidColor(SignalEmerald)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ── Live Flag Preview ──────────────────────────────────────────────
            if (signature != null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(DarkElevated)
                        .border(1.dp, DarkBorder, RoundedCornerShape(8.dp))
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        FlagView(fp = signature.fp, size = 96.dp)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Family: ${signature.fam.uppercase()} · ${signature.cls}",
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = SignalEmerald
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Broadcast beacon: ${signature.fp.take(8)}… (zero secrets)",
                            fontSize = 11.sp,
                            color = TextMuted
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // ── Action Buttons ─────────────────────────────────────────────────────
        Column {
            BrutalButton(
                text = "Hoist Flag to Mesh",
                onClick = {
                    signature?.let { onHoistConfirmed(it) }
                },
                backgroundColor = if (signature != null) SignalCobalt else DarkBorder,
                contentColor = FlagWhite
            )
            Spacer(modifier = Modifier.height(10.dp))
            BrutalButton(
                text = "Cancel",
                onClick = onCancel,
                backgroundColor = DarkSurface,
                contentColor = TextMuted
            )
        }
    }
}
