package dev.lagnarok.tracebeam.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.lagnarok.tracebeam.core.PeerMatchEvent
import dev.lagnarok.tracebeam.ui.components.BrutalButton
import dev.lagnarok.tracebeam.ui.components.FlagView
import dev.lagnarok.tracebeam.ui.theme.*

@Composable
fun MatchAlertScreen(
    event: PeerMatchEvent,
    onAccept: () -> Unit,
    onDismiss: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBase)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(4.dp))
                    .background(SignalEmerald.copy(alpha = 0.15f))
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Text(
                    text = "MATCH ALERT FOUND NEARBY",
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                    color = SignalEmerald,
                    letterSpacing = 1.sp
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // ── Flag Display ───────────────────────────────────────────────────
            FlagView(fp = event.beacon.fp, size = 120.dp)

            Spacer(modifier = Modifier.height(20.dp))

            // ── Match Details Card ─────────────────────────────────────────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(DarkSurface)
                    .border(2.dp, DarkBorder, RoundedCornerShape(8.dp))
                    .padding(16.dp)
            ) {
                Column {
                    Text(
                        text = "Why this matched:",
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp,
                        color = TextMuted
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = event.match.why,
                        fontSize = 13.sp,
                        color = FlagWhite
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "Your previous fix note:",
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp,
                        color = TextMuted
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = event.match.entry.summary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = SignalAmber
                    )
                }
            }
        }

        // ── Action Buttons ─────────────────────────────────────────────────────
        Column(modifier = Modifier.fillMaxWidth()) {
            BrutalButton(
                text = "Accept & Share Fix Card",
                onClick = onAccept,
                backgroundColor = SignalEmerald,
                contentColor = DarkBase
            )
            Spacer(modifier = Modifier.height(10.dp))
            BrutalButton(
                text = "Dismiss",
                onClick = onDismiss,
                backgroundColor = DarkSurface,
                contentColor = TextMuted
            )
        }
    }
}
