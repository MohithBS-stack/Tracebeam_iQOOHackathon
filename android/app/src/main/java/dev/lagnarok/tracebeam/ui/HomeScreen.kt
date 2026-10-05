package dev.lagnarok.tracebeam.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
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
import dev.lagnarok.tracebeam.ui.components.BrutalButton
import dev.lagnarok.tracebeam.ui.theme.*

@Composable
fun HomeScreen(
    peersCount: Int,
    isAdvertising: Boolean,
    onRaiseFlagClick: () -> Unit,
    onViewLedgerClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBase)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // ── Top Header ─────────────────────────────────────────────────────────
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.Start
        ) {
            Text(
                text = "Tracebeam",
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
                fontSize = 24.sp,
                color = FlagWhite
            )
            Text(
                text = "Nearby P2P Error Signal Mesh",
                fontSize = 13.sp,
                color = TextMuted
            )
        }

        // ── Tactical Radar View ────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .size(240.dp)
                .clip(CircleShape)
                .background(DarkSurface)
                .border(2.dp, DarkBorder, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            // Radar pulse ring
            Box(
                modifier = Modifier
                    .size(160.dp)
                    .clip(CircleShape)
                    .border(1.dp, SignalCobalt.copy(alpha = 0.5f), CircleShape)
            )

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .size(16.dp)
                        .clip(CircleShape)
                        .background(if (isAdvertising) SignalEmerald else SignalAmber)
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = if (peersCount > 0) "$peersCount peers nearby" else "Scanning mesh…",
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = FlagWhite
                )
                Text(
                    text = if (isAdvertising) "Broadcasting flag" else "Listening on BLE radio",
                    fontSize = 11.sp,
                    color = TextMuted
                )
            }
        }

        // ── Action Buttons ─────────────────────────────────────────────────────
        Column(modifier = Modifier.fillMaxWidth()) {
            BrutalButton(
                text = "Raise a flag",
                onClick = onRaiseFlagClick,
                backgroundColor = SignalCobalt
            )
            Spacer(modifier = Modifier.height(12.dp))
            BrutalButton(
                text = "Fix Ledger (F9)",
                onClick = onViewLedgerClick,
                backgroundColor = DarkSurface,
                contentColor = FlagWhite
            )
        }
    }
}
