package dev.lagnarok.tracebeam.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
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
import dev.lagnarok.tracebeam.data.FixEntity
import dev.lagnarok.tracebeam.ui.components.BrutalButton
import dev.lagnarok.tracebeam.ui.components.FlagView
import dev.lagnarok.tracebeam.ui.theme.*
import java.util.UUID

@Composable
fun SolveCardScreen(
    signature: Signature,
    onSaveFix: (FixEntity) -> Unit,
    onDone: () -> Unit
) {
    var summaryText by remember { mutableStateOf("") }
    var voiceNoteText by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBase)
            .padding(24.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column {
            Text(
                text = "Mark as Solved",
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
                fontSize = 20.sp,
                color = FlagWhite
            )
            Text(
                text = "Record how you fixed it to help teammates nearby next time.",
                fontSize = 12.sp,
                color = TextMuted
            )

            Spacer(modifier = Modifier.height(20.dp))

            Row(verticalAlignment = Alignment.CenterVertizontally) {
                FlagView(fp = signature.fp, size = 64.dp)
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text(
                        text = signature.cls,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = FlagWhite
                    )
                    Text(
                        text = "Family: ${signature.fam.uppercase()}",
                        fontSize = 12.sp,
                        color = SignalEmerald
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // ── Fix Summary Input ──────────────────────────────────────────────
            Text(
                text = "Fix Summary (1–2 sentences):",
                fontFamily = FontFamily.Monospace,
                fontSize = 11.sp,
                color = TextMuted
            )
            Spacer(modifier = Modifier.height(6.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(90.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(DarkSurface)
                    .border(2.dp, DarkBorder, RoundedCornerShape(8.dp))
                    .padding(12.dp)
            ) {
                if (summaryText.isEmpty()) {
                    Text(
                        text = "e.g. Set ndkVersion '26.1.10909125' in app/build.gradle and resync",
                        fontSize = 12.sp,
                        color = TextMuted
                    )
                }
                BasicTextField(
                    value = summaryText,
                    onValueChange = { summaryText = it },
                    modifier = Modifier.fillMaxSize(),
                    textStyle = TextStyle(fontSize = 13.sp, color = FlagWhite),
                    cursorBrush = SolidColor(SignalEmerald)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ── Voice Note Transcript ──────────────────────────────────────────
            Text(
                text = "Voice Note:",
                fontFamily = FontFamily.Monospace,
                fontSize = 11.sp,
                color = TextMuted
            )
            Spacer(modifier = Modifier.height(6.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(60.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(DarkSurface)
                    .border(1.dp, DarkBorder, RoundedCornerShape(8.dp))
                    .padding(12.dp)
            ) {
                if (voiceNoteText.isEmpty()) {
                    Text(
                        text = "Optional spoken notes or keywords",
                        fontSize = 12.sp,
                        color = TextMuted
                    )
                }
                BasicTextField(
                    value = voiceNoteText,
                    onValueChange = { voiceNoteText = it },
                    modifier = Modifier.fillMaxSize(),
                    textStyle = TextStyle(fontSize = 12.sp, color = FlagWhite),
                    cursorBrush = SolidColor(SignalEmerald)
                )
            }
        }

        // ── Action Buttons ─────────────────────────────────────────────────────
        Column(modifier = Modifier.fillMaxWidth()) {
            BrutalButton(
                text = "Save to Fix Ledger",
                onClick = {
                    val entity = FixEntity(
                        id = UUID.randomUUID().toString(),
                        fp = signature.fp,
                        fam = signature.fam,
                        cls = signature.cls,
                        keywords = signature.kw.joinToString(","),
                        mh = signature.mh,
                        summary = summaryText.ifBlank { "Resolved by developer." },
                        voiceNoteText = voiceNoteText,
                        solvedAt = System.currentTimeMillis() / 1000L
                    )
                    onSaveFix(entity)
                    onDone()
                },
                backgroundColor = SignalEmerald,
                contentColor = DarkBase
            )
            Spacer(modifier = Modifier.height(10.dp))
            BrutalButton(
                text = "Discard",
                onClick = onDone,
                backgroundColor = DarkSurface,
                contentColor = TextMuted
            )
        }
    }
}
